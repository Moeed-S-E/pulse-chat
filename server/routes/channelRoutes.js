const express = require('express');

const Channel = require('../models/Channel');
const User = require('../models/User');
const Message = require('../models/Message');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// GET /api/channels - List public channels & user DMs / Broadcast channels
router.get('/', authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.id;

    // Fetch channels: public non-DMs OR channels where current user is in memberIds
    const channels = await Channel.find({
      $or: [
        { isDM: false },
        { memberIds: currentUserId },
      ],
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

    // Combine current user with provided memberIds
    const membersSet = new Set([req.user.id]);
    if (Array.isArray(memberIds)) {
      memberIds.forEach((id) => {
        if (id) membersSet.add(id.toString());
      });
    }

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

    // Notify all channel members via socket
    const io = req.app.get('io');
    if (io) {
      channel.memberIds.forEach((m) => {
        const memberIdStr = typeof m === 'object' ? m._id.toString() : m.toString();
        io.to(`user:${memberIdStr}`).emit('channel:created', channel);
      });
    }

    res.status(201).json({ channel });
  } catch (error) {
    console.error('Error creating channel/group:', error);
    res.status(500).json({ message: 'Server error creating group.' });
  }
});

// GET /api/channels/:id - Get single channel
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id)
      .populate('memberIds', 'name username avatarInitial avatarColor isOnline lastSeen')
      .populate('createdBy', 'name username');

    if (!channel) {
      return res.status(404).json({ message: 'Channel not found.' });
    }

    // Check membership for DM channels
    if (channel.isDM && !channel.memberIds.some((m) => m._id.toString() === req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to view this DM.' });
    }

    res.json({ channel });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching channel.' });
  }
});

// POST /api/channels/:id/join - Join public channel
router.post('/:id/join', authMiddleware, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found.' });
    }

    if (channel.isDM) {
      return res.status(400).json({ message: 'Cannot join a DM channel.' });
    }

    if (!channel.memberIds.includes(req.user.id)) {
      channel.memberIds.push(req.user.id);
      await channel.save();
    }

    await channel.populate('memberIds', 'name username avatarInitial avatarColor isOnline lastSeen');
    res.json({ channel });
  } catch (error) {
    res.status(500).json({ message: 'Server error joining channel.' });
  }
});

// POST /api/channels/dm/:targetUserId - Get or Create DM channel
router.post('/dm/:targetUserId', authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const targetUserId = req.params.targetUserId;

    if (currentUserId === targetUserId) {
      return res.status(400).json({ message: 'Cannot create a DM with yourself.' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found.' });
    }

    // Search for existing DM between these two users
    let channel = await Channel.findOne({
      isDM: true,
      memberIds: { $all: [currentUserId, targetUserId] },
    }).populate('memberIds', 'name username avatarInitial avatarColor isOnline lastSeen');

    let isNew = false;
    if (!channel) {
      isNew = true;
      channel = new Channel({
        name: `dm-${currentUserId}-${targetUserId}`,
        isDM: true,
        memberIds: [currentUserId, targetUserId],
        createdBy: currentUserId,
      });

      await channel.save();
      await channel.populate('memberIds', 'name username avatarInitial avatarColor isOnline lastSeen');
    }

    if (isNew) {
      const io = req.app.get('io');
      if (io) {
        channel.memberIds.forEach((m) => {
          const memberIdStr = typeof m === 'object' ? m._id.toString() : m.toString();
          io.to(`user:${memberIdStr}`).emit('channel:created', channel);
        });
      }
    }

    res.status(200).json({ channel });
  } catch (error) {
    console.error('Error creating DM:', error);
    res.status(500).json({ message: 'Server error creating DM.' });
  }
});

module.exports = router;
