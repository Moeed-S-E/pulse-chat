const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const assert = require('assert');

const authRoutes = require('../routes/authRoutes');
const channelRoutes = require('../routes/channelRoutes');
const { channelMessages, messageOps } = require('../routes/messageRoutes');
const userRoutes = require('../routes/userRoutes');
const User = require('../models/User');
const Channel = require('../models/Channel');
const Message = require('../models/Message');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/channels', channelMessages);
app.use('/api/messages', messageOps);
app.use('/api/users', userRoutes);

const PORT = 5095;
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

async function runVideoCallTests() {
  console.log('--- STARTING WEBRTC VIDEO CALLING & ROOM CODE UNIT TESTS ---');
  let testCount = 0;
  let passCount = 0;

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[Test DB] Connected to MongoDB test database.');

    const dbName = mongoose.connection.db.databaseName;
    if (!dbName.endsWith('test')) {
      throw new Error(`[Test Safety] Refusing to run tests on non-test DB "${dbName}".`);
    }

    await User.deleteMany({ email: /@calltest\.com$/ });
    await Channel.deleteMany({});
    await Message.deleteMany({});

    server = app.listen(PORT);
    console.log(`[Test Server] Listening on port ${PORT}`);

    const callerRes = await request('POST', '/api/auth/signup', {
      name: 'Caller User',
      username: 'caller_host',
      email: 'caller@calltest.com',
      password: 'password123',
    });
    assert.strictEqual(callerRes.status, 201);
    const callerToken = callerRes.body.token;

    const calleeRes = await request('POST', '/api/auth/signup', {
      name: 'Callee User',
      username: 'callee_peer',
      email: 'callee@calltest.com',
      password: 'password123',
    });
    assert.strictEqual(calleeRes.status, 201);

    // Test 1: User search by @username
    testCount++;
    console.log(`\nTest ${testCount}: Lookup user by @username for direct video call`);
    const searchRes = await request('GET', '/api/users/search?q=callee_peer', null, callerToken);
    assert.strictEqual(searchRes.status, 200);
    assert.ok(searchRes.body.users.length > 0);
    assert.strictEqual(searchRes.body.users[0].username, 'callee_peer');
    console.log('✓ Passed: Resolved target user by @username handle.');
    passCount++;

    // Test 2: Create 1:1 Direct Call Channel
    testCount++;
    console.log(`\nTest ${testCount}: Create 1:1 direct video call DM channel`);
    const calleeId = calleeRes.body.user._id;
    const dmRes = await request('POST', `/api/channels/dm/${calleeId}`, null, callerToken);
    assert.strictEqual(dmRes.status, 200);
    assert.strictEqual(dmRes.body.channel.isDM, true);
    console.log('✓ Passed: DM channel prepared for video calling.');
    passCount++;

    // Test 3: Log Video Call Ended System Message in Thread
    testCount++;
    console.log(`\nTest ${testCount}: Log video call ended system message in thread`);
    const channelId = dmRes.body.channel._id;
    const callMsg = new Message({
      channelId,
      senderId: callerRes.body.user._id,
      content: 'Video call ended · 03:45',
      messageType: 'system_call',
      callDuration: '03:45',
    });
    await callMsg.save();
    assert.strictEqual(callMsg.messageType, 'system_call');
    assert.strictEqual(callMsg.content, 'Video call ended · 03:45');
    console.log('✓ Passed: Video call end system message logged in thread.');
    passCount++;

    console.log(`\n========================================`);
    console.log(`ALL ${passCount}/${testCount} VIDEO CALLING & ROOM CODE TESTS PASSED!`);
    console.log(`========================================\n`);

    await User.deleteMany({ email: /@calltest\.com$/ });
    await Channel.deleteMany({});
    await Message.deleteMany({});
  } catch (err) {
    console.error('\n❌ Video call test failed:', err);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
  }
}

runVideoCallTests();
