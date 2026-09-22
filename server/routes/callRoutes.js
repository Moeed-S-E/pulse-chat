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

// DELETE /api/calls - Clear all call logs for current user
router.delete('/', authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    await CallLog.deleteMany({
      $or: [{ callerId: currentUserId }, { receiverId: currentUserId }],
    });
    logger.info(`[CallLog] All call history cleared by user ${currentUserId}`);
    res.json({ success: true, message: 'All call history cleared.' });
  } catch (error) {
    logger.error('Error clearing call history:', error);
    res.status(500).json({ message: 'Server error clearing call history.' });
  }
});

// DELETE /api/calls/:id - Delete a specific call log item
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const log = await CallLog.findById(req.params.id);

    if (!log) {
      return res.status(404).json({ message: 'Call log not found.' });
    }

    const isOwner =
      log.callerId?.toString() === currentUserId ||
      log.receiverId?.toString() === currentUserId;

    if (!isOwner) {
      return res.status(403).json({ message: 'Not authorized to delete this call log.' });
    }

    await CallLog.findByIdAndDelete(req.params.id);
    logger.info(`[CallLog] Call log ${req.params.id} deleted by user ${currentUserId}`);
    res.json({ success: true, id: req.params.id });
  } catch (error) {
    logger.error('Error deleting call log:', error);
    res.status(500).json({ message: 'Server error deleting call log.' });
  }
});

module.exports = router;
