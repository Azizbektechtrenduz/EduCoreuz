import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { Box, TextField, Button } from '@mui/material';

const socket = io('http://localhost:8000');

const Chat = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [toUser, setToUser] = useState('');  // To user ID

  useEffect(() => {
    socket.on('message', (data) => {
      setMessages([...messages, data]);
    });
  }, [messages]);

  const sendMessage = () => {
    const data = { from: localStorage.getItem('user_id'), to: toUser, message };
    socket.emit('message', data);
    setMessage('');
  };

  return (
    <Box>
      <TextField label="To User ID" value={toUser} onChange={(e) => setToUser(e.target.value)} />
      <TextField label="Message" value={message} onChange={(e) => setMessage(e.target.value)} />
      <Button onClick={sendMessage}>Send</Button>
      {messages.map((msg, idx) => <Typography key={idx}>{msg.message}</Typography>)}
    </Box>
  );
};

export default Chat;
