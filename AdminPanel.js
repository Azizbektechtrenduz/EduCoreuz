import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Box, Typography, Button, TextField } from '@mui/material';

const AdminPanel = () => {
  const [stats, setStats] = useState({});
  const [userId, setUserId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [price, setPrice] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    };
    fetchStats();
  }, []);

  const handleGiftPremium = async () => {
    const token = localStorage.getItem('token');
    await axios.post(`http://localhost:8000/admin/gift_premium/${userId}`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    alert('Gifted!');
  };

  const handleMakePremium = async () => {
    const token = localStorage.getItem('token');
    await axios.put(`http://localhost:8000/courses/${courseId}/make_premium?price=${price}`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    alert('Made premium!');
  };

  return (
    <Box>
      <Typography variant="h4">Admin Panel</Typography>
      <Typography>Users: {stats.users}</Typography>
      <Typography>Courses: {stats.courses}</Typography>
      <Typography>Premiums: {stats.premiums}</Typography>
      <TextField label="User ID for Premium Gift" value={userId} onChange={(e) => setUserId(e.target.value)} />
      <Button onClick={handleGiftPremium}>Gift Premium</Button>
      <TextField label="Course ID" value={courseId} onChange={(e) => setCourseId(e.target.value)} />
      <TextField label="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
      <Button onClick={handleMakePremium}>Make Course Premium</Button>
    </Box>
  );
};

export default AdminPanel;
