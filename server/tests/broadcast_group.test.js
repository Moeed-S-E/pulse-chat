const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const assert = require('assert');

const authRoutes = require('../routes/authRoutes');
const channelRoutes = require('../routes/channelRoutes');
const { channelMessages, messageOps } = require('../routes/messageRoutes');
const User = require('../models/User');
const Channel = require('../models/Channel');
const Message = require('../models/Message');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/channels', channelMessages);
app.use('/api/messages', messageOps);

const PORT = 5096;
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

async function runBroadcastGroupTests() {
  console.log('--- STARTING GROUP & WHATSAPP BROADCAST CHANNEL UNIT TESTS ---');
  let testCount = 0;
  let passCount = 0;

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[Test DB] Connected to MongoDB test database.');

    await User.deleteMany({ email: /@group\.com$/ });
    await Channel.deleteMany({ name: /broadcast/ });

    server = app.listen(PORT);
    console.log(`[Test Server] Listening on port ${PORT}`);

    // Create Admin User & 2 Group Recipients
    const admin = await request('POST', '/api/auth/signup', {
      name: 'Group Admin',
      username: 'group_admin',
      email: 'admin@group.com',
      password: 'password123',
    });
    assert.strictEqual(admin.status, 201);
    const token = admin.body.token;

    const recipient1 = await request('POST', '/api/auth/signup', {
      name: 'Recipient One',
      username: 'recip1',
      email: 'recip1@group.com',
      password: 'password123',
    });
    assert.strictEqual(recipient1.status, 201);
    const recip1Id = recipient1.body.user._id;

    const recipient2 = await request('POST', '/api/auth/signup', {
      name: 'Recipient Two',
      username: 'recip2',
      email: 'recip2@group.com',
      password: 'password123',
    });
    assert.strictEqual(recipient2.status, 201);
    const recip2Id = recipient2.body.user._id;

    // Test 1: Create WhatsApp-style Broadcast Channel with Selected Members
    testCount++;
    console.log(`\nTest ${testCount}: Create WhatsApp Broadcast Channel with member selection`);
    const createRes = await request(
      'POST',
      '/api/channels',
      {
        name: 'announcements-broadcast',
        description: 'WhatsApp-style broadcast list for company announcements',
        isBroadcast: true,
        memberIds: [recip1Id, recip2Id],
      },
      token
    );
    assert.strictEqual(createRes.status, 201);
    assert.strictEqual(createRes.body.channel.isBroadcast, true);
    assert.strictEqual(createRes.body.channel.memberIds.length, 3); // Admin + 2 Recipients
    const channelId = createRes.body.channel._id;
    console.log('✓ Passed: Broadcast channel created with member selection.');
    passCount++;

    // Test 2: Post Broadcast Message to Channel
    testCount++;
    console.log(`\nTest ${testCount}: Post broadcast message to all group members`);
    const broadcastMsgRes = await request(
      'POST',
      `/api/channels/${channelId}/messages`,
      {
        content: '📢 Important Update: Q3 All-Hands meeting starts in 15 minutes!',
      },
      token
    );
    assert.strictEqual(broadcastMsgRes.status, 201);
    assert.strictEqual(
      broadcastMsgRes.body.message.content,
      '📢 Important Update: Q3 All-Hands meeting starts in 15 minutes!'
    );
    console.log('✓ Passed: Broadcast message sent successfully.');
    passCount++;

    // Test 3: Verify Recipients Can Read Broadcast Message Thread
    testCount++;
    console.log(`\nTest ${testCount}: Verify recipient access to broadcast message thread`);
    const recipToken = recipient1.body.token;
    const historyRes = await request('GET', `/api/channels/${channelId}/messages`, null, recipToken);
    assert.strictEqual(historyRes.status, 200);
    assert.strictEqual(historyRes.body.messages.length, 1);
    assert.strictEqual(
      historyRes.body.messages[0].content,
      '📢 Important Update: Q3 All-Hands meeting starts in 15 minutes!'
    );
    console.log('✓ Passed: Recipient retrieved broadcast message thread successfully.');
    passCount++;

    console.log(`\n========================================`);
    console.log(`ALL ${passCount}/${testCount} GROUP & BROADCAST TESTS PASSED!`);
    console.log(`========================================\n`);

    await User.deleteMany({ email: /@group\.com$/ });
    await Channel.deleteMany({ name: /broadcast/ });
  } catch (err) {
    console.error('\n❌ Broadcast group test failed:', err);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
  }
}

runBroadcastGroupTests();
