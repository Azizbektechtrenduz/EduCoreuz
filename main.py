from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy import create_engine, Column, Integer, String, Boolean, ForeignKey, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from pydantic import BaseModel
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import List
import os
from fastapi_socketio import SocketManager
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()
sio = SocketManager(app=app)

DATABASE_URL = os.getenv("postgresql://user:password@host:5432/dbname", "sqlite:///./educore.db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

SECRET_KEY = os.getenv("admin_ploi8", "secret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Models
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String)  # 'student', 'teacher', 'admin'
    is_premium = Column(Boolean, default=False)
    courses = relationship("Course", back_populates="teacher")
    enrollments = relationship("Enrollment", back_populates="student")

class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(String)
    teacher_id = Column(Integer, ForeignKey("users.id"))
    is_premium = Column(Boolean, default=False)
    price = Column(Float, default=0.0)
    teacher = relationship("User", back_populates="courses")
    enrollments = relationship("Enrollment", back_populates="course")

class Enrollment(Base):
    __tablename__ = "enrollments"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"))
    course_id = Column(Integer, ForeignKey("courses.id"))
    progress = Column(Integer, default=0)  # 0-100%
    grade = Column(Float, default=0.0)
    student = relationship("User", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")

class Achievement(Base):
    __tablename__ = "achievements"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    description = Column(String)

class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    course_id = Column(Integer, ForeignKey("courses.id"))
    amount = Column(Float)
    status = Column(String)  # 'pending', 'completed'

Base.metadata.create_all(bind=engine)

# Pydantic Models
class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: str

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_premium: bool

class Token(BaseModel):
    access_token: str
    token_type: str

class CourseCreate(BaseModel):
    title: str
    description: str
    is_premium: bool
    price: float

class CourseOut(BaseModel):
    id: int
    title: str
    description: str
    is_premium: bool
    price: float

# Helpers
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

# Endpoints
@app.post("/users/", response_model=UserOut)
def create_user(user: UserCreate, db = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = get_password_hash(user.password)
    new_user = User(username=user.username, email=user.email, hashed_password=hashed_password, role=user.role)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/token", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# Course endpoints
@app.post("/courses/", response_model=CourseOut)
def create_course(course: CourseCreate, current_user = Depends(get_current_user), db = Depends(get_db)):
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Not authorized")
    new_course = Course(**course.dict(), teacher_id=current_user.id)
    db.add(new_course)
    db.commit()
    db.refresh(new_course)
    return new_course

@app.get("/courses/", response_model=List[CourseOut])
def get_courses(db = Depends(get_db)):
    return db.query(Course).all()

# Enrollment
@app.post("/enroll/{course_id}")
def enroll_course(course_id: int, current_user = Depends(get_current_user), db = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(404, "Course not found")
    if course.is_premium and not current_user.is_premium:
        raise HTTPException(402, "Payment required")  # Frontendda bu errorni tutib, telegram message chiqaradi
    enrollment = Enrollment(student_id=current_user.id, course_id=course_id)
    db.add(enrollment)
    db.commit()
    return {"message": "Enrolled successfully"}

# Admin endpoints
@app.get("/admin/stats")
def get_stats(current_user = Depends(get_current_user), db = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(403, "Not authorized")
    users_count = db.query(User).count()
    courses_count = db.query(Course).count()
    premiums = db.query(User).filter(User.is_premium == True).count()
    return {"users": users_count, "courses": courses_count, "premiums": premiums}

@app.post("/admin/gift_premium/{user_id}")
def gift_premium(user_id: int, current_user = Depends(get_current_user), db = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(403, "Not authorized")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    user.is_premium = True
    db.commit()
    return {"message": "Premium gifted"}

@app.put("/courses/{course_id}/make_premium")
def make_course_premium(course_id: int, price: float, current_user = Depends(get_current_user), db = Depends(get_db)):
    if current_user.role not in ["teacher", "admin"]:
        raise HTTPException(403, "Not authorized")
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(404, "Course not found")
    course.is_premium = True
    course.price = price
    db.commit()
    return {"message": "Course made premium"}

# Chat (Socket.io)
@sio.on('connect')
async def connect(sid, environ):
    print("User connected")

@sio.on('message')
async def message(sid, data):
    # Data: {'from': user_id, 'to': user_id, 'message': text}
    # Enrollment tekshirish
    # ... (db bilan tekshirish qo'shing)
    await sio.emit('message', data, room=data['to'])  # To user ga yuborish

# Achievements
@app.post("/achievements/")
def add_achievement(title: str, description: str, user_id: int, current_user = Depends(get_current_user), db = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(403, "Not authorized")
    ach = Achievement(user_id=user_id, title=title, description=description)
    db.add(ach)
    db.commit()
    return {"message": "Achievement added"}

# Settings (misol uchun user update)
@app.put("/settings/")
def update_settings(email: str, current_user = Depends(get_current_user), db = Depends(get_db)):
    current_user.email = email
    db.commit()
    return {"message": "Settings updated"}

# Payment simulation (realda integration qo'shing, hozir manual)
@app.post("/payments/{course_id}")
def process_payment(course_id: int, current_user = Depends(get_current_user), db = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(404, "Course not found")
    # Pul taqsimoti: platforma 30%, teacher 70%
    platform_share = course.price * 0.3
    teacher_share = course.price * 0.7
    # DB ga saqlash
    payment = Payment(user_id=current_user.id, course_id=course_id, amount=course.price, status="pending")
    db.add(payment)
    db.commit()
    raise HTTPException(402, "Please contact @Azizbek_1990_year on Telegram for payment")  # Frontend tutadi
