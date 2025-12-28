import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Box, Typography, Button, Card, CardContent, List, ListItem } from '@mui/material';
import AIAssistant from './AIAssistant';  // Oldingi komponent

const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get('http://localhost:8000/courses/', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setCourses(res.data));
    axios.get('http://localhost:8000/enrollments/', { headers: { Authorization: `Bearer ${token}` } })  // Yangi endpoint qo'shing backendda
      .then(res => setEnrollments(res.data));
    axios.get('http://localhost:8000/achievements/', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setAchievements(res.data));
  }, []);

  const handleEnroll = async (courseId) => {
    // ... Oldingi
  };

  const updateProgress = async (enrollmentId, newProgress) => {
    const token = localStorage.getItem('token');
    await axios.put(`http://localhost:8000/enrollments/${enrollmentId}/progress?progress=${newProgress}`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    // Refresh enrollments va achievements
  };

  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="h4" gutterBottom>Kurslar</Typography>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {courses.map(course => (
          <Card key={course.id} sx={{ width: 300 }}>
            <CardContent>
              <Typography variant="h6">{course.title}</Typography>
              <Typography>{course.description}</Typography>
              <Typography>Daraja: {course.difficulty}</Typography>
              <Button variant="contained" onClick={() => handleEnroll(course.id)}>Yozilish</Button>
              {selectedCourse === course.id && <AIAssistant courseId={course.id} />}
            </CardContent>
          </Card>
        ))}
      </Box>
      
      <Typography variant="h5" sx={{ mt: 4 }}>Mening Kurslarim</Typography>
      <List>
        {enrollments.map(enroll => (
          <ListItem key={enroll.id}>
            <Typography>{enroll.course.title} - Progress: {enroll.progress}%</Typography>
            <Button onClick={() => updateProgress(enroll.id, enroll.progress + 10)}>+10% Yangilash</Button>  {/* Misol */}
          </ListItem>
        ))}
      </List>
      
      <Typography variant="h5" sx={{ mt: 4 }}>Yutuqlarim</Typography>
      <List>
        {achievements.map(ach => (
          <ListItem key={ach.id}>
            <Typography variant="subtitle1">{ach.title}</Typography>
            <Typography>{ach.description}</Typography>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default Courses;
