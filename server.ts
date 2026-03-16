import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Server } from 'socket.io';
import http from 'http';
import path from 'path';

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Socket.io for Collaborative Workspace
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room ${roomId}`);
    });

    socket.on('canvas-draw', (data) => {
      socket.to(data.roomId).emit('canvas-draw', data);
    });

    socket.on('note-update', (data) => {
      socket.to(data.roomId).emit('note-update', data);
    });

    socket.on('chat-message', (data) => {
      socket.to(data.roomId).emit('chat-message', data);
    });

    // WebRTC Signaling for Live Meets
    socket.on('join-meet', (roomId) => {
      socket.join(roomId);
      socket.to(roomId).emit('user-connected', socket.id);

      socket.on('disconnect', () => {
        socket.to(roomId).emit('user-disconnected', socket.id);
      });
    });

    socket.on('offer', (payload) => {
      io.to(payload.target).emit('offer', {
        callerId: socket.id,
        sdp: payload.sdp
      });
    });

    socket.on('answer', (payload) => {
      io.to(payload.target).emit('answer', {
        callerId: socket.id,
        sdp: payload.sdp
      });
    });

    socket.on('ice-candidate', (payload) => {
      io.to(payload.target).emit('ice-candidate', {
        callerId: socket.id,
        candidate: payload.candidate
      });
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
