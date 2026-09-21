const express = require('express');
const CallLog = require('../models/CallLog');
const authMiddleware = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/calls - Fetch user's call history logs
router.get('/', authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const callLogs = await CallLog.find({
      $or: [{ callerId: currentUserId }, { receiverId: currentUserId }],
    })
      .populate('callerId', 'name username avatarInitial avatarColor isOnline lastSeen')
      .populate('receiverId', 'name username avatarInitial avatarColor isOnline lastSeen')
      .populate('channelId', 'name isDM memberIds')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ calls: callLogs });
  } catch (error) {
    logger.error('Error fetching call logs:', error);
    res.status(500).json({ message: 'Server error fetching call history logs.' });
  }
});

// POST /api/calls - Create/Log a call record
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { receiverId, channelId, roomCode, callType, status, duration } = req.body;

    const callLog = new CallLog({
      callerId: req.user.id,
      receiverId: receiverId || null,
      channelId: channelId || null,
      roomCode: roomCode || '',
      callType: callType === 'audio' ? 'audio' : 'video',
      status: status || 'completed',
      duration: duration || '00:00',
    });

    await callLog.save();
    await callLog.populate('callerId', 'name username avatarInitial avatarColor isOnline lastSeen');
    await callLog.populate('receiverId', 'name username avatarInitial avatarColor isOnline lastSeen');

    logger.info(`[CallLog] New call log created by user ${req.user.id}`);
    res.status(201).json({ call: callLog });
  } catch (error) {
    logger.error('Error creating call log:', error);
    res.status(500).json({ message: 'Server error logging call.' });
  }
});

module.exports = router;
