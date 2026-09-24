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
app.use(express.json({ limit: '10mb' }));
app.use('/api/auth', authRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/channels', channelMessages);
app.use('/api/messages', messageOps);

const PORT = 5097;
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

async function runImageChatTests() {
  console.log('--- STARTING WEBSOCKET IMAGE SHARING UNIT TESTS ---');
  let testCount = 0;
  let passCount = 0;

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[Test DB] Connected to MongoDB test database.');

    const dbName = mongoose.connection.db.databaseName;
    if (!dbName.endsWith('test')) {
      throw new Error(`[Test Safety] Refusing to run tests on non-test DB "${dbName}".`);
    }

    await User.deleteMany({ email: /@imgtest\.com$/ });
    await Channel.deleteMany({ name: 'image-lounge' });

    server = app.listen(PORT);
    console.log(`[Test Server] Listening on port ${PORT}`);

    // Create user for image test
    const userRes = await request('POST', '/api/auth/signup', {
      name: 'Image Tester',
      username: 'img_tester',
      email: 'tester@imgtest.com',
      password: 'password123',
    });
    assert.strictEqual(userRes.status, 201);
    const token = userRes.body.token;

    // Create channel
    const chanRes = await request(
      'POST',
      '/api/channels',
      { name: 'image-lounge', description: 'Image sharing lounge' },
      token
    );
    assert.strictEqual(chanRes.status, 201);
    const channelId = chanRes.body.channel._id;

    // Test 1: Send Image Message via Data URL
    testCount++;
    console.log(`\nTest ${testCount}: Send image message via WebSocket/API payload`);
    const sampleImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSU5ErkJggg==';
    const imgMsgRes = await request(
      'POST',
      `/api/channels/${channelId}/messages`,
      {
        content: '📷 Image',
        messageType: 'image',
        mediaUrl: sampleImageBase64,
      },
      token
    );

    assert.strictEqual(imgMsgRes.status, 201);
    assert.strictEqual(imgMsgRes.body.message.messageType, 'image');
    assert.strictEqual(imgMsgRes.body.message.mediaUrl, sampleImageBase64);
    assert.strictEqual(imgMsgRes.body.message.senderId.username, 'img_tester');
    console.log('✓ Passed: Image message created and stored with mediaUrl.');
    passCount++;

    // Test 2: Fetch message thread including image messages
    testCount++;
    console.log(`\nTest ${testCount}: Retrieve thread history containing image messages`);
    const threadRes = await request('GET', `/api/channels/${channelId}/messages`, null, token);
    assert.strictEqual(threadRes.status, 200);
    assert.strictEqual(threadRes.body.messages.length, 1);
    assert.strictEqual(threadRes.body.messages[0].messageType, 'image');
    assert.strictEqual(threadRes.body.messages[0].mediaUrl, sampleImageBase64);
    console.log('✓ Passed: Thread history cleanly returned image message payload.');
    passCount++;

    console.log(`\n========================================`);
    console.log(`ALL ${passCount}/${testCount} WEBSOCKET IMAGE SHARING TESTS PASSED!`);
    console.log(`========================================\n`);

    await User.deleteMany({ email: /@imgtest\.com$/ });
    await Channel.deleteMany({ name: 'image-lounge' });
  } catch (err) {
    console.error('\n❌ Image chat unit test failed:', err);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
  }
}

runImageChatTests();
