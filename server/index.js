const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');

dotenv.config();

const logger = require('./utils/logger');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const channelRoutes = require('./routes/channelRoutes');
const { channelMessages, messageOps } = require('./routes/messageRoutes');
const callRoutes = require('./routes/callRoutes');
const setupSocketHandler = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Parse configured origins (supports single or comma-separated URLs)
const configuredOrigins = CLIENT_URL.split(',').map((url) => url.trim()).filter(Boolean);

const isOriginAllowed = (origin, callback) => {
  // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
  if (!origin) return callback(null, true);

  const isExplicit = configuredOrigins.includes(origin);
  const isLocal = origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1');
  const isVercel = /\.vercel\.app$/.test(origin);
  const isRender = /\.onrender\.com$/.test(origin);

  if (isExplicit || isLocal || isVercel || isRender) {
    return callback(null, true);
  }

  // Allow all origins by default in production to ensure cross-origin Vercel deployments succeed seamlessly
  return callback(null, true);
};

// Morgan HTTP request logging streamed through Winston logger
const morganStream = {
  write: (message) => logger.info(message.trim()),
};
app.use(morgan('combined', { stream: morganStream }));

// Middleware
app.use(cors({
  origin: isOriginAllowed,
  credentials: true,
}));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/channels', channelMessages);
app.use('/api/messages', messageOps);
app.use('/api/calls', callRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'PulseChat API',
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Serve frontend static build if available (for full-stack deployment on Render)
const clientBuildPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Socket.io initialization
const io = new Server(server, {
  cors: {
    origin: isOriginAllowed,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  maxHttpBufferSize: 25 * 1024 * 1024,
});

app.set('io', io);
setupSocketHandler(io);

// MongoDB connection & server start
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pulsechat';

mongoose.connect(MONGODB_URI)
  .then(() => {
    logger.info(`[Database] Connected to MongoDB at: ${MONGODB_URI}`);
    server.listen(PORT, () => {
      logger.info(`[Server] PulseChat server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    logger.error(`[Database] Connection error: ${err.message}`);
    logger.info('[Server] Starting server without MongoDB for dev testing...');
    server.listen(PORT, () => {
      logger.info(`[Server] PulseChat server running on http://localhost:${PORT}`);
    });
  });
