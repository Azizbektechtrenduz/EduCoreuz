# ... Oldingi importlar va modellar saqlanadi

from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()
client = OpenAI(api_key=os.getenv("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"))

# Kurs tavsiyasi (oldingi embedding logic saqlanadi, lekin AI bilan yaxshilandi)
def get_recommendations(user_id, db):
    # ... Oldingi logic
    # AI bilan yaxshilash uchun prompt qo'sh
    rec_ids = [...]  # Oldingi
    prompt = f"Recommended courses: {', '.join([c.title for c in recs])}. Improve recommendations based on user strengths: {user.strengths}"
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )
    improved = response.choices[0].message.content
    # Parse va return

# AI assistant
@app.post("/ai/assistant")
def ai_assistant(query: str, course_id: int = None, current_user=Depends(get_current_user), db=Depends(get_db)):
    context = ""
    if course_id:
        course = db.query(Course).get(course_id)
        context = f"Kurs: {course.title}\n{course.description}\n"
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Sen ta'lim yordamchisisan. O'zbek va ingliz tilida javob ber. Qisqa va aniq tushuntir."},
            {"role": "user", "content": f"{context}Savol: {query}"}
        ]
    )
    return {"answer": response.choices[0].message.content}

# Personal plan
@app.get("/ai/personal_plan")
def personal_plan(current_user=Depends(get_current_user), db=Depends(get_db)):
    enrollments = db.query(Enrollment).filter(Enrollment.student_id == current_user.id).all()
    prompt = f"O'quvchi {len(enrollments)} ta kursda. Progress: {[e.progress for e in enrollments]}. Haftalik individual o'quv rejasi tuz. Yutuqlar: {[a.title for a in current_user.achievements]}"
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )
    return {"plan": response.choices[0].message.content}

# Kurs endpoints (yutuqlar bilan integratsiya)
@app.post("/courses/", response_model=CourseOut)
def create_course(course: CourseCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    # ... Oldingi
    # Kurs yaratilganda AI taglar generatsiya
    prompt = f"Generate tags and difficulty for course: {course.title} {course.description}"
    response = client.chat.completions.create(model="gpt-4o-mini", messages=[{"role": "user", "content": prompt}])
    data = json.loads(response.choices[0].message.content)  # Assume JSON output
    new_course.tags = json.dumps(data['tags'])
    new_course.difficulty = data['difficulty']
    # ...

@app.put("/enrollments/{enrollment_id}/progress")
def update_progress(enrollment_id: int, progress: int, current_user=Depends(get_current_user), db=Depends(get_db)):
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id, Enrollment.student_id == current_user.id).first()
    if not enrollment:
        raise HTTPException(404, "Enrollment not found")
    enrollment.progress = progress
    if progress == 100:
        # Avto yutuq berish
        ach = Achievement(user_id=current_user.id, title=f"{enrollment.course.title} tugatildi!", description="Kursni 100% yakunladingiz.")
        db.add(ach)
        db.commit()
    db.commit()
    return {"message": "Progress updated"}

# Yutuqlar endpoints
@app.get("/achievements/")
def get_achievements(current_user=Depends(get_current_user), db=Depends(get_db)):
    return db.query(Achievement).filter(Achievement.user_id == current_user.id).all()

@app.post("/achievements/")
def add_achievement(title: str, description: str, user_id: int, current_user=Depends(get_current_user), db=Depends(get_db)):
    # ... Oldingi, lekin AI bilan description yaxshilash mumkin
