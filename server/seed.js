const dotenv = require('dotenv');
dotenv.config();

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

    const dbName = mongoose.connection.db.databaseName;
    if (process.env.ALLOW_SEED !== '1' || !dbName.endsWith('test')) {
      console.error(`[DB] Safety guard: Refusing to seed database "${dbName}". ALLOW_SEED=1 and a database name ending in "test" are required.`);
      process.exit(1);
    }

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

    console.log('[DB] No hardcoded fake channels or messages created.');
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
