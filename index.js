const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:4200", 
    methods: ["GET", "POST"]
  }
});

let onlineUsers = {};  
let messageQueue = [];

app.use(cors());

io.on('connection', (socket) => {
  socket.on('join', (username) => {
    onlineUsers[socket.id] = username; 
    console.log(`${username} joined`);
    socket.emit('messageQueue', messageQueue);
    io.emit('onlineUsers', Object.values(onlineUsers));
  });

  socket.on('message', (data) => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const message = {
      id: Date.now().toString(), 
      sender: onlineUsers[socket.id],
      text: data.text,
      time: `${hours}:${minutes}`,
      edited: false,
      reactions: {}
    };
    messageQueue.push(message);
    io.emit('message', message);
  });

  socket.on('edit-message', (data) => {
     messageQueue = messageQueue.map((msg) => 
      msg.id === data.id ? data : msg
    );
    data.isEdited=true;
     io.emit('message', data);
  });

  socket.on('delete-message', (messageId) => {
    console.log(messageQueue,messageId);
    messageQueue = messageQueue.filter((msg) => msg.id !== messageId);
    console.log(messageQueue,messageId);
    io.emit('message', messageQueue);
    io.emit('messageDeleted', messageId);
  });

  socket.on('reactToMessage', (data) => {
    const { messageId, reaction } = data;
    const message = messageQueue.find(msg => msg.id === messageId);
    if (message) {
      message.reaction = reaction;
    }
    io.emit('messageReacted', { messageId, reaction });
  });


  //user logout
  socket.on('logout', () => {
    delete onlineUsers[socket.id];
    io.emit('onlineUsers', Object.values(onlineUsers));
  });

  // Handle user disconnection
  socket.on('disconnect', () => {
    const username = onlineUsers[socket.id];
    delete onlineUsers[socket.id];
    console.log(`${username} disconnected`);
    io.emit('onlineUsers', Object.values(onlineUsers));
  });
});

// Start the server
server.listen(8080, () => {
  console.log('Socket.IO server is running on http://localhost:8080');
});
