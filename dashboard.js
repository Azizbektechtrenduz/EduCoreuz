import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Box, Typography, Button } from '@mui/material';

const Dashboard = () => {
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:8000/courses/', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCourses(response.data);
      } catch (err) {
        setError('Error fetching courses');
      }
    };
    fetchCourses();
  }, []);

  const handleEnroll = async (courseId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:8000/enroll/${courseId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Enrolled!');
    } catch (err) {
      if (err.response.status === 402) {
        alert('To\'lov qilish uchun Telegramdan @Azizbek_1990_year ga yozing');
      } else {
        alert('Error');
      }
    }
  };

  return (
    <Box>
      <Typography variant="h4">Dashboard</Typography>
      {courses.map(course => (
        <Box key={course.id}>
          <Typography>{course.title}</Typography>
          <Button onClick={() => handleEnroll(course.id)}>Enroll</Button>
        </Box>
      ))}
      {error && <Typography color="error">{error}</Typography>}
    </Box>
  );
};

export default Dashboard;
