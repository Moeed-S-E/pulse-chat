const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Channel = require('../models/Channel');

const activeSockets = new Map(); // userId -> Set of socketIds

const setupSocketHandler = (io) => {
  // Socket.io middleware for JWT authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pulsechat_secret_key_dev_2026_super_secure');
      socket.userId = decoded.id;
      socket.username = decoded.username;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`[Socket] User connected: ${socket.username} (${userId}), Socket ID: ${socket.id}`);

    // Track user socket
    if (!activeSockets.has(userId)) {
      activeSockets.set(userId, new Set());
    }
    activeSockets.get(userId).add(socket.id);

    // Join user's personal room for 1:1 call signaling
    socket.join(`user:${userId}`);

    // Automatically join all channel socket rooms for this user
    try {
      const userChannels = await Channel.find({
        $or: [{ isDM: false }, { memberIds: userId }],
      }).select('_id');
      userChannels.forEach((c) => {
        socket.join(`channel:${c._id}`);
      });
    } catch (err) {
      console.error('[Socket] Error auto-joining channel rooms:', err);
    }

    // Update user presence to online
    try {
      await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
      io.emit('presence:update', { userId, isOnline: true });
    } catch (err) {
      console.error('Error updating online status:', err);
    }

    // Join channel room
    socket.on('channel:join', ({ channelId }) => {
      if (channelId) {
        socket.join(`channel:${channelId}`);
        console.log(`[Socket] ${socket.username} joined channel:${channelId}`);
      }
    });

    // Leave channel room
    socket.on('channel:leave', ({ channelId }) => {
      if (channelId) {
        socket.leave(`channel:${channelId}`);
      }
    });

    // Send chat message
    socket.on('message:send', async ({ channelId, content, messageType, mediaUrl }) => {
      try {
        if (!channelId) return;

        const type = messageType === 'image' ? 'image' : 'text';

        if (type === 'text' && (!content || !content.trim())) return;
        if (type === 'image' && (!mediaUrl && !content)) return;

        const message = new Message({
          channelId,
          senderId: userId,
          content: content ? content.trim() : (type === 'image' ? '📷 Image' : ''),
          messageType: type,
          mediaUrl: mediaUrl || (type === 'image' ? content : ''),
        });

        await message.save();
        await message.populate('senderId', 'name username avatarInitial avatarColor bio isOnline');

        // Update channel updatedAt timestamp for sorting
        await Channel.findByIdAndUpdate(channelId, { updatedAt: new Date() });

        // Broadcast to current channel room
        io.to(`channel:${channelId}`).emit('message:new', message);

        // Broadcast sidebar lastMessage update to all connected users
        io.emit('channel:last_message', { channelId, lastMessage: message });
      } catch (err) {
        console.error('Error handling message:send:', err);
        socket.emit('error', { message: 'Failed to send message.' });
      }
    });

    // Typing indicators
    socket.on('typing:start', ({ channelId }) => {
      if (channelId) {
        socket.to(`channel:${channelId}`).emit('typing:update', {
          channelId,
          userId,
          username: socket.username,
          isTyping: true,
        });
      }
    });

    socket.on('typing:stop', ({ channelId }) => {
      if (channelId) {
        socket.to(`channel:${channelId}`).emit('typing:update', {
          channelId,
          userId,
          username: socket.username,
          isTyping: false,
        });
      }
    });

    // --- 1:1 WebRTC Call Signaling ---

    // Outgoing call invite from caller -> callee
    socket.on('call:invite', async ({ targetUserId, channelId, callerInfo }) => {
      console.log(`[Call] Invite from ${socket.username} (${userId}) to target ${targetUserId}`);

      const targetRoom = io.sockets.adapter.rooms.get(`user:${targetUserId}`);
      if (!targetRoom || targetRoom.size === 0) {
        socket.emit('call:declined', {
          declinerUserId: targetUserId,
          channelId,
          reason: 'User is currently offline.',
        });
        return;
      }

      io.to(`user:${targetUserId}`).emit('call:incoming', {
        callerUserId: userId,
        callerInfo: callerInfo || { id: userId, username: socket.username, name: socket.username },
        channelId,
      });
    });

    // Callee accepts call
    socket.on('call:accept', ({ callerUserId, channelId }) => {
      console.log(`[Call] Accepted by ${socket.username} for caller ${callerUserId}`);
      io.to(`user:${callerUserId}`).emit('call:accepted', {
        acceptorUserId: userId,
        channelId,
      });
    });

    // Callee declines call
    socket.on('call:decline', ({ callerUserId, channelId, reason }) => {
      console.log(`[Call] Declined by ${socket.username} for caller ${callerUserId}`);
      io.to(`user:${callerUserId}`).emit('call:declined', {
        declinerUserId: userId,
        channelId,
        reason: reason || 'Call declined',
      });
    });

    // Relay WebRTC offer
    socket.on('webrtc:offer', ({ targetUserId, offer }) => {
      io.to(`user:${targetUserId}`).emit('webrtc:offer', {
        fromUserId: userId,
        offer,
      });
    });

    // Relay WebRTC answer
    socket.on('webrtc:answer', ({ targetUserId, answer }) => {
      io.to(`user:${targetUserId}`).emit('webrtc:answer', {
        fromUserId: userId,
        answer,
      });
    });

    // Relay WebRTC ICE candidate
    socket.on('webrtc:ice-candidate', ({ targetUserId, candidate }) => {
      io.to(`user:${targetUserId}`).emit('webrtc:ice-candidate', {
        fromUserId: userId,
        candidate,
      });
    });

    // End Call & log system call message
    socket.on('call:end', async ({ targetUserId, channelId, duration }) => {
      console.log(`[Call] Ended by ${socket.username} in channel ${channelId}, duration: ${duration}`);

      if (targetUserId) {
        io.to(`user:${targetUserId}`).emit('call:ended', {
          endedByUserId: userId,
          duration: duration || '00:00',
        });
      }

      // Log system call message in chat thread if channelId exists
      if (channelId) {
        try {
          const callMsg = new Message({
            channelId,
            senderId: userId,
            content: `Video call ended · ${duration || '00:00'}`,
            messageType: 'system_call',
            callDuration: duration || '00:00',
          });

          await callMsg.save();
          await callMsg.populate('senderId', 'name username avatarInitial avatarColor bio isOnline');

          await Channel.findByIdAndUpdate(channelId, { updatedAt: new Date() });

          io.to(`channel:${channelId}`).emit('message:new', callMsg);
          io.emit('channel:last_message', { channelId, lastMessage: callMsg });
        } catch (err) {
          console.error('Error logging system call message:', err);
        }
      }
    });

    // --- Meeting Room Code WebRTC Signaling (1:M Multi-Peer Mesh) ---

    socket.on('meeting:join', async ({ roomCode }) => {
      if (!roomCode) return;
      const cleanCode = roomCode.toUpperCase().trim();
      const roomName = `meeting:${cleanCode}`;

      // Get existing room sockets before joining
      const socketsInRoom = await io.in(roomName).fetchSockets();
      const existingPeers = socketsInRoom
        .filter((s) => s.userId !== userId)
        .map((s) => ({
          userId: s.userId,
          username: s.username,
        }));

      socket.join(roomName);
      socket.currentMeetingRoom = cleanCode;
      console.log(`[Meeting Room] ${socket.username} (${userId}) joined code room ${cleanCode}`);

      // Send existing participants list to the joining user
      socket.emit('meeting:existing_peers', {
        roomCode: cleanCode,
        existingPeers,
      });

      // Notify existing participants about the new peer
      socket.to(roomName).emit('meeting:peer_joined', {
        userId,
        username: socket.username,
        roomCode: cleanCode,
      });
    });

    socket.on('meeting:webrtc:offer', ({ roomCode, targetUserId, offer }) => {
      if (!roomCode) return;
      const payload = {
        fromUserId: userId,
        fromUsername: socket.username,
        offer,
      };

      if (targetUserId) {
        io.to(`user:${targetUserId}`).emit('meeting:webrtc:offer', payload);
      } else {
        socket.to(`meeting:${roomCode.toUpperCase().trim()}`).emit('meeting:webrtc:offer', payload);
      }
    });

    socket.on('meeting:webrtc:answer', ({ roomCode, targetUserId, answer }) => {
      if (!roomCode) return;
      const payload = {
        fromUserId: userId,
        fromUsername: socket.username,
        answer,
      };

      if (targetUserId) {
        io.to(`user:${targetUserId}`).emit('meeting:webrtc:answer', payload);
      } else {
        socket.to(`meeting:${roomCode.toUpperCase().trim()}`).emit('meeting:webrtc:answer', payload);
      }
    });

    socket.on('meeting:webrtc:ice-candidate', ({ roomCode, targetUserId, candidate }) => {
      if (!roomCode) return;
      const payload = {
        fromUserId: userId,
        candidate,
      };

      if (targetUserId) {
        io.to(`user:${targetUserId}`).emit('meeting:webrtc:ice-candidate', payload);
      } else {
        socket.to(`meeting:${roomCode.toUpperCase().trim()}`).emit('meeting:webrtc:ice-candidate', payload);
      }
    });

    socket.on('meeting:leave', ({ roomCode }) => {
      if (!roomCode) return;
      const cleanCode = roomCode.toUpperCase().trim();
      socket.leave(`meeting:${cleanCode}`);
      socket.currentMeetingRoom = null;
      socket.to(`meeting:${cleanCode}`).emit('meeting:peer_left', {
        userId,
        username: socket.username,
      });
    });

    // Disconnect handling
    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${socket.username} (${userId})`);
      const userSockets = activeSockets.get(userId);

      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          activeSockets.delete(userId);

          // Grace period timeout before marking offline
          setTimeout(async () => {
            if (!activeSockets.has(userId)) {
              try {
                await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
                io.emit('presence:update', { userId, isOnline: false });
              } catch (err) {
                console.error('Error updating offline status:', err);
              }
            }
          }, 1000);
        }
      }
    });
  });
};

module.exports = setupSocketHandler;
