const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Channel = require('./models/Channel');
const Message = require('./models/Message');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pulsechat';

async function seedDatabase() {
  console.log('--- STARTING PULSECHAT TEST DATABASE SEEDING ---');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`[DB] Connected to MongoDB database at: ${MONGODB_URI}`);

    // Clear existing collections
    await User.deleteMany({});
    await Channel.deleteMany({});
    await Message.deleteMany({});
    console.log('[DB] Cleared existing users, channels, and messages.');

    const commonPasswordHash = await bcrypt.hash('password123', 10);

    // Create 4 Test Users
    const users = await User.create([
      {
        name: 'Sam Wilson',
        username: 'samuel',
        email: 'samuel@pulsechat.io',
        passwordHash: commonPasswordHash,
        avatarInitial: 'S',
        avatarColor: '#5B6CFF',
        bio: 'Senior Product Engineer & Video Architect',
        isOnline: true,
      },
      {
        name: 'Alex Rivera',
        username: 'alex_rivera',
        email: 'alex@pulsechat.io',
        passwordHash: commonPasswordHash,
        avatarInitial: 'A',
        avatarColor: '#10B981',
        bio: 'Frontend Lead & UI Designer',
        isOnline: true,
      },
      {
        name: 'Jane Doe',
        username: 'jane_doe',
        email: 'jane@pulsechat.io',
        passwordHash: commonPasswordHash,
        avatarInitial: 'J',
        avatarColor: '#F59E0B',
        bio: 'Backend Systems & WebRTC Specialist',
        isOnline: false,
      },
      {
        name: 'Dev Tester',
        username: 'dev_tester',
        email: 'dev@pulsechat.io',
        passwordHash: commonPasswordHash,
        avatarInitial: 'D',
        avatarColor: '#EC4899',
        bio: 'QA Lead & System Tester',
        isOnline: true,
      },
    ]);

    const [samuel, alex, jane, dev] = users;
    console.log(`[DB] Seeded ${users.length} test user accounts.`);

    // Create Public Channels
    const generalChannel = await Channel.create({
      name: 'general',
      description: 'Company-wide announcements & general chat',
      isDM: false,
      isBroadcast: false,
      memberIds: [samuel._id, alex._id, jane._id, dev._id],
    });

    const designChannel = await Channel.create({
      name: 'design-team',
      description: 'UI/UX mockups, glassmorphism designs & image assets',
      isDM: false,
      isBroadcast: false,
      memberIds: [samuel._id, alex._id],
    });

    const videoCallChannel = await Channel.create({
      name: 'video-calls',
      description: 'Multi-participant WebRTC meeting room (Code: PULSE-8821)',
      isDM: false,
      isBroadcast: false,
      memberIds: [samuel._id, alex._id, jane._id, dev._id],
    });

    // Create 1:1 Direct Message Channels
    const dmSamAlex = await Channel.create({
      name: `dm-${samuel._id}-${alex._id}`,
      isDM: true,
      isBroadcast: false,
      memberIds: [samuel._id, alex._id],
    });

    const dmSamJane = await Channel.create({
      name: `dm-${samuel._id}-${jane._id}`,
      isDM: true,
      isBroadcast: false,
      memberIds: [samuel._id, jane._id],
    });

    console.log('[DB] Seeded public & DM topic channels.');

    // Seed Messages in #general
    await Message.create([
      {
        channelId: generalChannel._id,
        senderId: samuel._id,
        content: 'Welcome everyone to PulseChat! Feel free to test chatting, image sharing, and video calling.',
        messageType: 'text',
      },
      {
        channelId: generalChannel._id,
        senderId: alex._id,
        content: 'Hey @samuel! The new 1:M WebRTC video calling and toast notifications look super clean.',
        messageType: 'text',
      },
      {
        channelId: generalChannel._id,
        senderId: jane._id,
        content: 'Meeting room code PULSE-8821 is active for multi-user video call testing.',
        messageType: 'text',
      },
    ]);

    // Seed DM Messages between Sam and Alex
    await Message.create([
      {
        channelId: dmSamAlex._id,
        senderId: alex._id,
        content: 'Hey Sam! Ready to test direct video calling to @alex_rivera?',
        messageType: 'text',
      },
      {
        channelId: dmSamAlex._id,
        senderId: samuel._id,
        content: 'Video call ended · 04:12',
        messageType: 'system_call',
        callDuration: '04:12',
      },
    ]);

    console.log('[DB] Seeded initial chat messages & call logs.');

    console.log('\n========================================');
    console.log('PULSECHAT TEST DATABASE SEEDED SUCCESSFULLY!');
    console.log('========================================\n');
    console.log('TEST USER ACCOUNTS FOR LOGGING IN (Password for ALL: password123):');
    console.log('1) Username: samuel        | Email: samuel@pulsechat.io');
    console.log('2) Username: alex_rivera    | Email: alex@pulsechat.io');
    console.log('3) Username: jane_doe      | Email: jane@pulsechat.io');
    console.log('4) Username: dev_tester    | Email: dev@pulsechat.io');
    console.log('========================================\n');
  } catch (err) {
    console.error('❌ Error seeding database:', err);
  } finally {
    await mongoose.disconnect();
  }
}

seedDatabase();
