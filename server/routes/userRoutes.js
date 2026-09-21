const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// GET /api/users/search?q=username
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const query = req.query.q || '';
    const cleanQuery = query.toLowerCase().trim().replace(/^@/, '');

    if (!cleanQuery) {
      // Return recent or featured users if no query
      const users = await User.find({ _id: { $ne: req.user.id } })
        .limit(10)
        .select('name username avatarInitial isOnline lastSeen');
      return res.json({ users });
    }

    const users = await User.find({
      _id: { $ne: req.user.id },
      $or: [
        { username: { $regex: cleanQuery, $options: 'i' } },
        { name: { $regex: cleanQuery, $options: 'i' } },
      ],
    })
      .limit(20)
      .select('name username avatarInitial isOnline lastSeen');

    res.json({ users });
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({ message: 'Server error during user search.' });
  }
});

module.exports = router;
