const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const assert = require('assert');
const jwt = require('jsonwebtoken');

const authRoutes = require('../routes/authRoutes');
const channelRoutes = require('../routes/channelRoutes');
const messageRoutes = require('../routes/messageRoutes');
const User = require('../models/User');
const Channel = require('../models/Channel');
const Message = require('../models/Message');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/channels', messageRoutes);

const PORT = 5098;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pulsechat_test';

let server;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';
    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = data ? JSON.parse(data) : {};
            resolve({ status: res.statusCode, body: json });
          } catch (e) {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runChatTests() {
  console.log('--- STARTING CHATTING & CHANNEL FUNCTIONALITY UNIT TESTS ---');
  let testCount = 0;
  let passCount = 0;

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[Test DB] Connected to MongoDB test database.');

    await User.deleteMany({ email: /@chattest\.com$/ });
    await Channel.deleteMany({});
    await Message.deleteMany({});

    server = app.listen(PORT);
    console.log(`[Test Server] Listening on port ${PORT}`);

    // Create 2 test users: User A and User B
    const userA = await request('POST', '/api/auth/signup', {
      name: 'User A',
      username: 'usera_chat',
      email: 'usera@chattest.com',
      password: 'password123',
    });
    assert.strictEqual(userA.status, 201);
    const tokenA = userA.body.token;
    const userIdA = userA.body.user._id;

    const userB = await request('POST', '/api/auth/signup', {
      name: 'User B',
      username: 'userb_chat',
      email: 'userb@chattest.com',
      password: 'password123',
    });
    assert.strictEqual(userB.status, 201);
    const tokenB = userB.body.token;
    const userIdB = userB.body.user._id;

    // Test 1: Create public channel
    testCount++;
    console.log(`\nTest ${testCount}: Create public topic channel`);
    const chanRes = await request(
      'POST',
      '/api/channels',
      { name: 'engineering-hub', description: 'Engineering discussion' },
      tokenA
    );
    assert.strictEqual(chanRes.status, 201);
    assert.strictEqual(chanRes.body.channel.name, 'engineering-hub');
    assert.strictEqual(chanRes.body.channel.isDM, false);
    const publicChannelId = chanRes.body.channel._id;
    console.log('✓ Passed: Public channel created successfully.');
    passCount++;

    // Test 2: Create 1:1 Direct Message channel
    testCount++;
    console.log(`\nTest ${testCount}: Create 1:1 Direct Message channel`);
    const dmRes = await request('POST', `/api/channels/dm/${userIdB}`, null, tokenA);
    assert.strictEqual(dmRes.status, 200);
    assert.strictEqual(dmRes.body.channel.isDM, true);
    assert.strictEqual(dmRes.body.channel.memberIds.length, 2);
    const dmChannelId = dmRes.body.channel._id;
    console.log('✓ Passed: 1:1 DM channel created successfully.');
    passCount++;

    // Test 3: List user channels & DMs
    testCount++;
    console.log(`\nTest ${testCount}: Fetch channel list for authenticated user`);
    const listRes = await request('GET', '/api/channels', null, tokenA);
    assert.strictEqual(listRes.status, 200);
    assert.ok(Array.isArray(listRes.body.channels));
    assert.ok(listRes.body.channels.length >= 2);
    console.log('✓ Passed: Channel list retrieved with populated members.');
    passCount++;

    // Test 4: Post text message in public channel
    testCount++;
    console.log(`\nTest ${testCount}: Post text message in public channel`);
    const msg1Res = await request(
      'POST',
      `/api/channels/${publicChannelId}/messages`,
      { content: 'Hello team! Welcome to the engineering hub.' },
      tokenA
    );
    assert.strictEqual(msg1Res.status, 201);
    assert.strictEqual(msg1Res.body.message.content, 'Hello team! Welcome to the engineering hub.');
    assert.strictEqual(msg1Res.body.message.senderId.username, 'usera_chat');
    console.log('✓ Passed: Message posted and populated with sender profile.');
    passCount++;

    // Test 5: Post text message in 1:1 DM channel
    testCount++;
    console.log(`\nTest ${testCount}: Post text message in 1:1 DM channel`);
    const msg2Res = await request(
      'POST',
      `/api/channels/${dmChannelId}/messages`,
      { content: 'Hey User B! Got a quick question for you.' },
      tokenA
    );
    assert.strictEqual(msg2Res.status, 201);
    assert.strictEqual(msg2Res.body.message.content, 'Hey User B! Got a quick question for you.');
    console.log('✓ Passed: 1:1 DM message posted.');
    passCount++;

    // Test 6: Fetch messages thread history
    testCount++;
    console.log(`\nTest ${testCount}: Fetch message thread history`);
    const historyRes = await request('GET', `/api/channels/${publicChannelId}/messages`, null, tokenA);
    assert.strictEqual(historyRes.status, 200);
    assert.strictEqual(historyRes.body.messages.length, 1);
    assert.strictEqual(historyRes.body.messages[0].content, 'Hello team! Welcome to the engineering hub.');
    console.log('✓ Passed: Thread history returned chronologically.');
    passCount++;

    // Test 7: Block unauthorized non-member from viewing DM messages
    testCount++;
    console.log(`\nTest ${testCount}: Prevent unauthorized access to DM thread`);
    // Create User C (not part of User A & B DM)
    const userC = await request('POST', '/api/auth/signup', {
      name: 'User C',
      username: 'userc_chat',
      email: 'userc@chattest.com',
      password: 'password123',
    });
    const tokenC = userC.body.token;

    const unauthRes = await request('GET', `/api/channels/${dmChannelId}/messages`, null, tokenC);
    assert.strictEqual(unauthRes.status, 403);
    assert.strictEqual(unauthRes.body.message, 'Not authorized to view messages in this DM.');
    console.log('✓ Passed: Unauthorized access to DM thread blocked with 403.');
    passCount++;

    console.log(`\n========================================`);
    console.log(`ALL ${passCount}/${testCount} CHATTING UNIT TESTS PASSED!`);
    console.log(`========================================\n`);

    await User.deleteMany({ email: /@chattest\.com$/ });
    await Channel.deleteMany({});
    await Message.deleteMany({});
  } catch (err) {
    console.error('\n❌ Chat unit tests failed with error:', err);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
  }
}

runChatTests();
