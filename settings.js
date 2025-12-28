import React, { useState } from 'react';
import axios from 'axios';
import { Box, TextField, Button } from '@mui/material';

const Settings = () => {
  const [email, setEmail] = useState('');

  const handleUpdate = async () => {
    const token = localStorage.getItem('token');
    await axios.put('http://localhost:8000/settings/', { email }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    alert('Updated!');
  };

  return (
    <Box>
      <TextField label="New Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Button onClick={handleUpdate}>Update</Button>
    </Box>
  );
};

export default Settings;
