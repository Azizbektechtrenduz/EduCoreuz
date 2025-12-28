import React, { useState } from 'react';
import axios from 'axios';
import { Button, TextField, Box } from '@mui/material';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const response = await axios.post('http://localhost:8000/token', { username, password });
      localStorage.setItem('token', response.data.access_token);
      window.location.href = '/dashboard';
    } catch (err) {
      alert('Login failed');
    }
  };

  return (
    <Box>
      <TextField label="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
      <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <Button onClick={handleLogin}>Login</Button>
    </Box>
  );
};

export default Login;
