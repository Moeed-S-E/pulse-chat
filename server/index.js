const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const channelRoutes = require('./routes/channelRoutes');
const messageRoutes = require('./routes/messageRoutes');
const setupSocketHandler = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Middleware
app.use(cors({
  origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/channels', messageRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'PulseChat API', timestamp: new Date() });
});

// Socket.io initialization
const io = new Server(server, {
  cors: {
    origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  maxHttpBufferSize: 25 * 1024 * 1024,
});

setupSocketHandler(io);

// MongoDB connection & server start
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pulsechat';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('[Database] Connected to MongoDB at:', MONGODB_URI);
    server.listen(PORT, () => {
      console.log(`[Server] PulseChat server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[Database] Connection error:', err.message);
    console.log('[Server] Starting server without MongoDB for dev testing...');
    server.listen(PORT, () => {
      console.log(`[Server] PulseChat server running on http://localhost:${PORT}`);
    });
  });
