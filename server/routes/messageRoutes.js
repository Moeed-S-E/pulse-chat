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

// PUT /api/messages/:id - Edit message content
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Message content cannot be empty.' });
    }

    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    if (message.senderId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only edit your own messages.' });
    }

    message.content = content.trim();
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();
    await message.populate('senderId', 'name username avatarInitial avatarColor bio isOnline');

    const io = req.app.get('io');
    if (io) {
      io.to(`channel:${message.channelId}`).emit('message:update', message);
    }

    res.json({ message });
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({ message: 'Server error editing message.' });
  }
});

// DELETE /api/messages/:id - Delete message
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    const channel = await Channel.findById(message.channelId);
    const isSender = message.senderId.toString() === req.user.id;
    const isChannelCreator = channel && channel.createdBy?.toString() === req.user.id;

    if (!isSender && !isChannelCreator) {
      return res.status(403).json({ message: 'Not authorized to delete this message.' });
    }

    message.isDeleted = true;
    message.content = 'This message was deleted';
    message.mediaUrl = '';
    await message.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`channel:${message.channelId}`).emit('message:delete', {
        messageId: message._id,
        channelId: message.channelId,
      });
    }

    res.json({ messageId: message._id, success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ message: 'Server error deleting message.' });
  }
});

// POST /api/messages/:id/forward - Forward message to another channel
router.post('/:id/forward', authMiddleware, async (req, res) => {
  try {
    const { targetChannelId, encryptedContent } = req.body;
    if (!targetChannelId) {
      return res.status(400).json({ message: 'Target channel is required.' });
    }

    const originalMsg = await Message.findById(req.params.id);
    if (!originalMsg) {
      return res.status(404).json({ message: 'Original message not found.' });
    }

    const targetChannel = await Channel.findById(targetChannelId);
    if (!targetChannel) {
      return res.status(404).json({ message: 'Target channel not found.' });
    }

    const forwardedMsg = new Message({
      channelId: targetChannelId,
      senderId: req.user.id,
      content: encryptedContent || originalMsg.content,
      messageType: originalMsg.messageType,
      mediaUrl: originalMsg.mediaUrl,
      isForwarded: true,
    });

    await forwardedMsg.save();
    await forwardedMsg.populate('senderId', 'name username avatarInitial avatarColor bio isOnline');
    await Channel.findByIdAndUpdate(targetChannelId, { updatedAt: new Date() });

    const io = req.app.get('io');
    if (io) {
      io.to(`channel:${targetChannelId}`).emit('message:new', forwardedMsg);
      io.emit('channel:last_message', { channelId: targetChannelId, lastMessage: forwardedMsg });
    }

    res.status(201).json({ message: forwardedMsg });
  } catch (error) {
    console.error('Error forwarding message:', error);
    res.status(500).json({ message: 'Server error forwarding message.' });
  }
});

module.exports = router;
