const express = require('express');
const mongoose = require('mongoose');

const Channel = require('../models/Channel');
const User = require('../models/User');
const Message = require('../models/Message');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// GET /api/channels - List user member channels (groups, broadcasts, DMs)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.id;

    // Fetch ONLY channels where current user is in memberIds
    const channels = await Channel.find({
      memberIds: currentUserId,
    })
      .populate('memberIds', 'name username avatarInitial avatarColor isOnline lastSeen')
      .populate('createdBy', 'name username')
      .sort({ updatedAt: -1 });

    // Attach last message preview to each channel
    const channelsWithLastMessage = await Promise.all(
      channels.map(async (channel) => {
        const lastMessage = await Message.findOne({ channelId: channel._id })
          .sort({ createdAt: -1 })
          .populate('senderId', 'name username');

        const channelObj = channel.toObject();
        channelObj.lastMessage = lastMessage || null;
        return channelObj;
      })
    );

    res.json({ channels: channelsWithLastMessage });
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({ message: 'Server error fetching channels.' });
  }
});

// POST /api/channels - Create group channel or WhatsApp broadcast list
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, isBroadcast, memberIds } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Channel or group name is required.' });
    }

    const normalizedName = name.trim().toLowerCase().replace(/\s+/g, '-');

    const existing = await Channel.findOne({ name: normalizedName, isDM: false });
    if (existing) {
      return res.status(400).json({ message: 'A group/channel with this name already exists.' });
    }

    // Validate and combine current user with valid memberIds from DB
    const validIds = (Array.isArray(memberIds) ? memberIds : []).filter((id) => mongoose.isValidObjectId(id));
    const foundUsers = await User.find({ _id: { $in: validIds } }).select('_id');
    const membersSet = new Set([req.user.id]);
    foundUsers.forEach((u) => membersSet.add(u._id.toString()));

    const channel = new Channel({
      name: normalizedName,
      description: description ? description.trim() : '',
      isDM: false,
      isBroadcast: Boolean(isBroadcast),
      memberIds: Array.from(membersSet),
      createdBy: req.user.id,
    });

    await channel.save();
    await channel.populate('memberIds', 'name username avatarInitial avatarColor isOnline lastSeen');
    await channel.populate('createdBy', 'name username');

    // Make live sockets join room & emit channel:created
    const io = req.app.get('io');
    if (io) {
      channel.memberIds.forEach((m) => {
        const id = (m._id || m).toString();
        io.in(`user:${id}`).socketsJoin(`channel:${channel._id}`);
        io.to(`user:${id}`).emit('channel:created', channel);
      });
    }

    res.status(201).json({ channel });
  } catch (error) {
    console.error('Error creating channel/group:', error);
    res.status(500).json({ message: 'Server error creating group.' });
  }
});

// GET /api/channels/:id - Get single channel (enforce membership for all channels)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id)
      .populate('memberIds', 'name username avatarInitial avatarColor isOnline lastSeen')
      .populate('createdBy', 'name username');

    if (!channel) {
      return res.status(404).json({ message: 'Channel not found.' });
    }

    // Membership check for ALL channel types (DM and group)
    const isMember = channel.memberIds.some((m) => m._id.toString() === req.user.id);
    if (!isMember) {
      return res.status(403).json({ message: 'Not a member of this chat.' });
    }

    res.json({ channel });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching channel.' });
  }
});

// POST /api/channels/:id/leave - Leave non-creator group
router.post('/:id/leave', authMiddleware, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found.' });
    }
    if (channel.isDM) {
      return res.status(400).json({ message: 'Cannot leave a DM.' });
    }
    if (channel.createdBy?.toString() === req.user.id) {
      return res.status(400).json({ message: 'Creator cannot leave group. Delete the group instead.' });
    }

    const isMember = channel.memberIds.some((m) => m.toString() === req.user.id);
    if (!isMember) {
      return res.status(400).json({ message: 'You are not a member of this group.' });
    }

    channel.memberIds = channel.memberIds.filter((m) => m.toString() !== req.user.id);
    await channel.save();

    const io = req.app.get('io');
    if (io) {
      io.in(`user:${req.user.id}`).socketsLeave(`channel:${channel._id}`);
      io.to(`channel:${channel._id}`).emit('channel:member_left', { channelId: channel._id, userId: req.user.id });
    }

    res.json({ message: 'Left channel successfully', channelId: channel._id });
  } catch (error) {
    res.status(500).json({ message: 'Server error leaving channel.' });
  }
});

// POST /api/channels/dm/:targetUserId - Get or Create DM channel (race-safe via dmKey)
router.post('/dm/:targetUserId', authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const targetUserId = req.params.targetUserId;

    if (currentUserId === targetUserId) {
      return res.status(400).json({ message: 'Cannot create a DM with yourself.' });
    }

    if (!mongoose.isValidObjectId(targetUserId)) {
      return res.status(400).json({ message: 'Invalid target user ID.' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found.' });
    }

    const dmKey = [currentUserId, targetUserId].sort().join(':');

    let channel = await Channel.findOne({
      $or: [
        { dmKey },
        { isDM: true, memberIds: { $all: [currentUserId, targetUserId] } },
      ],
    }).populate('memberIds', 'name username avatarInitial avatarColor isOnline lastSeen');

    let isNew = false;
    if (channel && !channel.dmKey) {
      channel.dmKey = dmKey;
      await channel.save();
    }

    if (!channel) {
      isNew = true;
      try {
        channel = new Channel({
          name: `dm-${dmKey}`,
          isDM: true,
          dmKey,
          memberIds: [currentUserId, targetUserId],
          createdBy: currentUserId,
        });
        await channel.save();
      } catch (e) {
        if (e.code !== 11000) throw e;
        channel = await Channel.findOne({ dmKey });
      }
      await channel.populate('memberIds', 'name username avatarInitial avatarColor isOnline lastSeen');
    }

    if (isNew) {
      const io = req.app.get('io');
      if (io) {
        channel.memberIds.forEach((m) => {
          const id = (m._id || m).toString();
          io.in(`user:${id}`).socketsJoin(`channel:${channel._id}`);
          io.to(`user:${id}`).emit('channel:created', channel);
        });
      }
    }

    res.status(200).json({ channel });
  } catch (error) {
    console.error('Error creating DM:', error);
    res.status(500).json({ message: 'Server error creating DM.' });
  }
});

// DELETE /api/channels/:id - Delete group channel (Creator only) or DM chat
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const channelId = req.params.id;
    const channel = await Channel.findById(channelId);

    if (!channel) {
      return res.status(404).json({ message: 'Channel or chat not found.' });
    }

    const isMember = channel.memberIds.some((m) => m.toString() === req.user.id);
    const isCreator = channel.createdBy && channel.createdBy.toString() === req.user.id;

    if (channel.isDM ? !isMember : !isCreator) {
      return res.status(403).json({ message: 'Not authorized to delete this chat.' });
    }

    // Delete all messages in this channel
    await Message.deleteMany({ channelId });

    // Delete the channel itself
    await Channel.findByIdAndDelete(channelId);

    // Socket cleanup & notification
    const io = req.app.get('io');
    if (io) {
      io.in(`channel:${channelId}`).socketsLeave(`channel:${channelId}`);
      channel.memberIds.forEach((m) => {
        const id = (m._id || m).toString();
        io.to(`user:${id}`).emit('channel:deleted', { channelId });
      });
    }

    res.json({ success: true, channelId });
  } catch (error) {
    console.error('Error deleting channel/chat:', error);
    res.status(500).json({ message: 'Server error deleting chat.' });
  }
});

module.exports = router;
