const express = require('express');

const Message = require('../models/Message');
const Channel = require('../models/Channel');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// GET /api/channels/:id/messages?before=<timestamp>&limit=50
router.get('/:id/messages', authMiddleware, async (req, res) => {
  try {
    const channelId = req.params.id;
    const limit = parseInt(req.query.limit, 10) || 50;
    const before = req.query.before;

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found.' });
    }

    if (channel.isDM && !channel.memberIds.includes(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to view messages in this DM.' });
    }

    const filter = { channelId };
    if (before) {
      filter.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('senderId', 'name username avatarInitial avatarColor bio isOnline');

    // Return in chronological order (oldest to newest)
    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error fetching messages.' });
  }
});

// POST /api/channels/:id/messages - REST endpoint to send message
router.post('/:id/messages', authMiddleware, async (req, res) => {
  try {
    const channelId = req.params.id;
    const { content, messageType, mediaUrl } = req.body;

    const validTypes = ['text', 'image', 'system_call'];
    const type = validTypes.includes(messageType) ? messageType : 'text';

    if (type !== 'image' && (!content || !content.trim())) {
      return res.status(400).json({ message: 'Message content cannot be empty.' });
    }

    if (type === 'image' && (!mediaUrl && !content)) {
      return res.status(400).json({ message: 'Image data URL or mediaUrl is required for image messages.' });
    }

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found.' });
    }

    if (channel.isDM && !channel.memberIds.includes(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to post in this DM.' });
    }

    const message = new Message({
      channelId,
      senderId: req.user.id,
      content: content ? content.trim() : (type === 'image' ? '📷 Image' : ''),
      messageType: type,
      mediaUrl: mediaUrl || (type === 'image' ? content : ''),
    });

    await message.save();
    await message.populate('senderId', 'name username avatarInitial avatarColor bio isOnline');

    await Channel.findByIdAndUpdate(channelId, { updatedAt: new Date() });

    res.status(201).json({ message });
  } catch (error) {
    console.error('Error posting message:', error);
    res.status(500).json({ message: 'Server error sending message.' });
  }
});

module.exports = router;
