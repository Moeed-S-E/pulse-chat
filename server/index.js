const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');

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

// CORS callback — exact configured origins or local origins only
const isOriginAllowed = (origin, callback) => {
  if (!origin) return callback(null, true);
  const isExplicit = configuredOrigins.includes(origin);
  const isLocal = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

  if (isExplicit || isLocal) {
    return callback(null, true);
  }

  return callback(new Error('Not allowed by CORS'));
};

// Rate limiter for Auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many auth requests from this IP, please try again after 15 minutes.' },
});

// Morgan HTTP request logging streamed through Winston logger
const morganStream = {
  write: (message) => logger.info(message.trim()),
};
app.use(morgan('combined', { stream: morganStream }));

// Middleware
app.set('trust proxy', 1);
app.use(cors({
  origin: isOriginAllowed,
  credentials: true,
}));

// Route-specific body parsers & limits
app.use('/api/auth', express.json({ limit: '20kb' }), authLimiter, authRoutes);
app.use('/api/users', express.json({ limit: '20kb' }), userRoutes);
app.use('/api/calls', express.json({ limit: '20kb' }), callRoutes);
app.use('/api/channels', express.json({ limit: '12mb' }), channelRoutes, channelMessages);
app.use('/api/messages', express.json({ limit: '12mb' }), messageOps);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbOk = mongoose.connection.readyState === 1;
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ok' : 'db_down',
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
  maxHttpBufferSize: 12 * 1024 * 1024,
});

app.set('io', io);
setupSocketHandler(io);

// MongoDB connection & server start
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pulsechat';
const maskPassword = (uri) => uri.replace(/\/\/([^:@/]+):([^@]+)@/, '//$1:***@');

mongoose.connect(MONGODB_URI)
  .then(() => {
    logger.info(`[Database] Connected to MongoDB at: ${maskPassword(MONGODB_URI)}`);
    server.listen(PORT, () => {
      logger.info(`[Server] PulseChat server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    logger.error(`[Database] Connection error: ${err.message}`);
    process.exit(1);
  });
