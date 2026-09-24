const express = require('express');

const Message = require('../models/Message');
const Channel = require('../models/Channel');
const authMiddleware = require('../middleware/auth');
const { getMemberChannel, emitToMembers } = require('../utils/access');

const channelMessages = express.Router();
const messageOps = express.Router();

// ==========================================
// Router 1: channelMessages (Mounted at /api/channels)
// ==========================================

// GET /api/channels/:id/messages?before=<timestamp>&limit=50
channelMessages.get('/:id/messages', authMiddleware, async (req, res) => {
  try {
    const channelId = req.params.id;
    const channel = await getMemberChannel(channelId, req.user.id);
    if (!channel) {
      return res.status(403).json({ message: 'Not a member of this chat.' });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const before = req.query.before;

    const filter = { channelId };
    if (before) {
      const d = new Date(before);
      if (Number.isNaN(d.getTime())) {
        return res.status(400).json({ message: 'Invalid "before" date.' });
      }
      filter.createdAt = { $lt: d };
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
channelMessages.post('/:id/messages', authMiddleware, async (req, res) => {
  try {
    const channelId = req.params.id;
    const { content, messageType, mediaUrl } = req.body;

    const validTypes = ['text', 'image'];
    const type = validTypes.includes(messageType) ? messageType : 'text';

    if (type !== 'image' && (!content || !content.trim())) {
      return res.status(400).json({ message: 'Message content cannot be empty.' });
    }

    if (type === 'image' && (!mediaUrl && !content)) {
      return res.status(400).json({ message: 'Image data URL or mediaUrl is required for image messages.' });
    }

    const channel = await getMemberChannel(channelId, req.user.id);
    if (!channel) {
      return res.status(403).json({ message: 'Not a member of this chat.' });
    }

    if (channel.isBroadcast && channel.createdBy?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the owner can post to a broadcast list.' });
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

    const io = req.app.get('io');
    if (io) {
      io.to(`channel:${channelId}`).emit('message:new', message);
      emitToMembers(io, channel, 'channel:last_message', { channelId, lastMessage: message });
    }

    res.status(201).json({ message });
  } catch (error) {
    console.error('Error posting message:', error);
    res.status(500).json({ message: 'Server error sending message.' });
  }
});

// ==========================================
// Router 2: messageOps (Mounted at /api/messages)
// ==========================================

// PUT /api/messages/:id - Edit message content
messageOps.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Message content cannot be empty.' });
    }

    const message = await Message.findById(req.params.id);
    if (!message || message.isDeleted) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    const channel = await getMemberChannel(message.channelId, req.user.id);
    if (!channel) {
      return res.status(403).json({ message: 'Not authorized.' });
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
messageOps.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    const channel = await getMemberChannel(message.channelId, req.user.id);
    if (!channel) {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    const isSender = message.senderId.toString() === req.user.id;
    const isGroupOwner = !channel.isDM && channel.createdBy?.toString() === req.user.id;

    if (!isSender && !isGroupOwner) {
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
messageOps.post('/:id/forward', authMiddleware, async (req, res) => {
  try {
    const { targetChannelId, encryptedContent, encryptedMediaUrl } = req.body;
    if (!targetChannelId) {
      return res.status(400).json({ message: 'Target channel is required.' });
    }

    const originalMsg = await Message.findById(req.params.id);
    if (!originalMsg || originalMsg.isDeleted) {
      return res.status(404).json({ message: 'Original message not found.' });
    }

    if (originalMsg.messageType === 'system_call') {
      return res.status(400).json({ message: 'Cannot forward call logs.' });
    }

    const [source, target] = await Promise.all([
      getMemberChannel(originalMsg.channelId, req.user.id),
      getMemberChannel(targetChannelId, req.user.id),
    ]);

    if (!source || !target) {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    if (!encryptedContent) {
      return res.status(400).json({ message: 'encryptedContent is required.' });
    }

    if (originalMsg.messageType === 'image' && !encryptedMediaUrl) {
      return res.status(400).json({ message: 'encryptedMediaUrl is required for images.' });
    }

    const forwardedMsg = new Message({
      channelId: targetChannelId,
      senderId: req.user.id,
      content: encryptedContent,
      messageType: originalMsg.messageType,
      mediaUrl: encryptedMediaUrl || '',
      isForwarded: true,
    });

    await forwardedMsg.save();
    await forwardedMsg.populate('senderId', 'name username avatarInitial avatarColor bio isOnline');
    await Channel.findByIdAndUpdate(targetChannelId, { updatedAt: new Date() });

    const io = req.app.get('io');
    if (io) {
      io.to(`channel:${targetChannelId}`).emit('message:new', forwardedMsg);
      emitToMembers(io, target, 'channel:last_message', { channelId: targetChannelId, lastMessage: forwardedMsg });
    }

    res.status(201).json({ message: forwardedMsg });
  } catch (error) {
    console.error('Error forwarding message:', error);
    res.status(500).json({ message: 'Server error forwarding message.' });
  }
});

module.exports = { channelMessages, messageOps };
