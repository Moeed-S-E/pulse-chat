const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, username: user.username, email: user.email },
    process.env.JWT_SECRET || 'pulsechat_secret_key_dev_2026_super_secure',
    { expiresIn: '7d' }
  );
};

const validateUsernameFormat = (username) => {
  if (!username) return false;
  const normalized = username.toLowerCase().trim().replace(/^@/, '');
  const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
  return usernameRegex.test(normalized);
};

const validateEmailFormat = (email) => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

// GET /api/auth/check-username/:username
router.get('/check-username/:username', async (req, res) => {
  try {
    const rawUsername = req.params.username || '';
    const normalizedUsername = rawUsername.toLowerCase().trim().replace(/^@/, '');

    if (!normalizedUsername) {
      return res.status(400).json({ available: false, message: 'Username is required.' });
    }

    if (!validateUsernameFormat(normalizedUsername)) {
      return res.status(400).json({
        available: false,
        message: 'Username must be 3-30 characters long and contain only letters, numbers, underscores, or hyphens.',
      });
    }

    const existingUser = await User.findOne({ username: normalizedUsername });
    if (existingUser) {
      return res.json({ available: false, message: 'Username is already taken.' });
    }

    return res.json({ available: true, message: 'Username is available!' });
  } catch (error) {
    console.error('Check username error:', error);
    res.status(500).json({ available: false, message: 'Server error checking username availability.' });
  }
});

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({ message: 'All fields (name, username, email, password) are required.' });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({ message: 'Full name must be at least 2 characters long.' });
    }

    const normalizedUsername = username.toLowerCase().trim().replace(/^@/, '');
    if (!validateUsernameFormat(normalizedUsername)) {
      return res.status(400).json({
        message: 'Username must be 3-30 characters long and contain only letters, numbers, underscores, or hyphens.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!validateEmailFormat(normalizedEmail)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    // Check existing user
    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
    });

    if (existingUser) {
      if (existingUser.email === normalizedEmail) {
        return res.status(400).json({ message: 'Email is already registered.' });
      }
      return res.status(400).json({ message: 'Username is already taken.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const avatarInitial = name.trim().charAt(0).toUpperCase();

    const user = new User({
      name: name.trim(),
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
      avatarInitial,
      isOnline: true,
    });

    await user.save();

    const token = generateToken(user);
    res.status(201).json({ token, user });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error during signup.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { loginIdentifier, password } = req.body;

    if (!loginIdentifier || !password) {
      return res.status(400).json({ message: 'Username/Email and Password are required.' });
    }

    const normalizedId = loginIdentifier.toLowerCase().trim().replace(/^@/, '');

    const user = await User.findOne({
      $or: [{ email: normalizedId }, { username: normalizedId }],
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    const token = generateToken(user);
    res.json({ token, user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching user.' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, username, bio, avatarColor } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (name !== undefined && name.trim()) {
      user.name = name.trim();
      user.avatarInitial = user.name.charAt(0).toUpperCase();
    }

    if (username !== undefined && username.trim()) {
      const normalizedUsername = username.toLowerCase().trim().replace(/^@/, '');

      if (!validateUsernameFormat(normalizedUsername)) {
        return res.status(400).json({
          message: 'Username must be 3-30 characters long and contain only letters, numbers, underscores, or hyphens.',
        });
      }

      if (normalizedUsername !== user.username) {
        const existing = await User.findOne({
          username: normalizedUsername,
          _id: { $ne: user._id },
        });
        if (existing) {
          return res.status(400).json({ message: 'Username is already taken.' });
        }
        user.username = normalizedUsername;
      }
    }

    if (bio !== undefined) {
      user.bio = bio.trim();
    }

    if (avatarColor !== undefined) {
      user.avatarColor = avatarColor;
    }

    await user.save();
    res.json({ user });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error updating profile.' });
  }
});

module.exports = router;
