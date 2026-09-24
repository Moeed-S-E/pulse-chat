const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const assert = require('assert');
const { Server } = require('socket.io');
const { io: ioClient } = require('../../client/node_modules/socket.io-client');

const authRoutes = require('../routes/authRoutes');
const channelRoutes = require('../routes/channelRoutes');
const { channelMessages, messageOps } = require('../routes/messageRoutes');
const setupSocketHandler = require('../socket/socketHandler');
const User = require('../models/User');
const Channel = require('../models/Channel');
const Message = require('../models/Message');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/channels', channelMessages);
app.use('/api/messages', messageOps);

const PORT = 5098;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pulsechat_test';

let server;
let ioServer;

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

    const dbName = mongoose.connection.db.databaseName;
    if (!dbName.endsWith('test')) {
      throw new Error(`[Test Safety] Refusing to run tests on non-test DB "${dbName}".`);
    }

    await User.deleteMany({ email: /@chattest\.com$/ });
    await Channel.deleteMany({});
    await Message.deleteMany({});

    server = http.createServer(app);
    ioServer = new Server(server, { cors: { origin: '*' } });
    app.set('io', ioServer);
    setupSocketHandler(ioServer);

    await new Promise((resolve) => server.listen(PORT, resolve));
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

    const userB = await request('POST', '/api/auth/signup', {
      name: 'User B',
      username: 'userb_chat',
      email: 'userb@chattest.com',
      password: 'password123',
    });
    assert.strictEqual(userB.status, 201);
    const userIdB = userB.body.user._id;

    // Test 1: Create group channel
    testCount++;
    console.log(`\nTest ${testCount}: Create group channel with member validation`);
    const chanRes = await request(
      'POST',
      '/api/channels',
      { name: 'engineering-hub', description: 'Engineering discussion', memberIds: [userIdB] },
      tokenA
    );
    assert.strictEqual(chanRes.status, 201);
    assert.strictEqual(chanRes.body.channel.name, 'engineering-hub');
    assert.strictEqual(chanRes.body.channel.isDM, false);
    const publicChannelId = chanRes.body.channel._id;
    console.log('✓ Passed: Group channel created successfully.');
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

    // Test 4: Post text message in channel
    testCount++;
    console.log(`\nTest ${testCount}: Post text message in channel`);
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
    console.log(`\nTest ${testCount}: Prevent unauthorized access to DM thread (GET)`);
    const userC = await request('POST', '/api/auth/signup', {
      name: 'User C',
      username: 'userc_chat',
      email: 'userc@chattest.com',
      password: 'password123',
    });
    const tokenC = userC.body.token;

    const unauthRes = await request('GET', `/api/channels/${dmChannelId}/messages`, null, tokenC);
    assert.strictEqual(unauthRes.status, 403);
    assert.strictEqual(unauthRes.body.message, 'Not a member of this chat.');
    console.log('✓ Passed: Unauthorized access to DM thread blocked with 403.');
    passCount++;

    // Test 8: Block non-member from posting messages (POST /api/channels/:id/messages -> 403)
    testCount++;
    console.log(`\nTest ${testCount}: Prevent non-member from posting messages (POST)`);
    const nonMemberPostRes = await request(
      'POST',
      `/api/channels/${dmChannelId}/messages`,
      { content: 'Hacking into DM thread' },
      tokenC
    );
    assert.strictEqual(nonMemberPostRes.status, 403);
    assert.strictEqual(nonMemberPostRes.body.message, 'Not a member of this chat.');
    console.log('✓ Passed: Non-member POST message blocked with 403.');
    passCount++;

    // Test 9: Forward message across non-member channels -> 403
    testCount++;
    console.log(`\nTest ${testCount}: Prevent forward message across non-member channels`);
    const fwdRes = await request(
      'POST',
      `/api/messages/${msg1Res.body.message._id}/forward`,
      { targetChannelId: dmChannelId, encryptedContent: 'forged forward' },
      tokenC
    );
    assert.strictEqual(fwdRes.status, 403);
    assert.strictEqual(fwdRes.body.message, 'Not authorized.');
    console.log('✓ Passed: Forward across non-member channel blocked with 403.');
    passCount++;

    // Test 10: DM initiator cannot delete recipient's message -> 403
    testCount++;
    console.log(`\nTest ${testCount}: DM initiator cannot delete recipient message`);
    const tokenB = userB.body.token;
    const msgFromB = await request(
      'POST',
      `/api/channels/${dmChannelId}/messages`,
      { content: 'User B reply message' },
      tokenB
    );
    assert.strictEqual(msgFromB.status, 201);
    const msgFromBId = msgFromB.body.message._id;

    // User A (DM initiator) attempts to delete User B's message
    const delRes = await request('DELETE', `/api/messages/${msgFromBId}`, null, tokenA);
    assert.strictEqual(delRes.status, 403);
    assert.strictEqual(delRes.body.message, 'Not authorized to delete this message.');
    console.log('✓ Passed: DM initiator blocked from deleting recipient message with 403.');
    passCount++;

    // Test 11: Non-member socket channel:join receives no message:new
    testCount++;
    console.log(`\nTest ${testCount}: Non-member socket channel:join receives no message:new`);
    const clientSocketC = ioClient(`http://localhost:${PORT}`, {
      auth: { token: tokenC },
      transports: ['websocket'],
    });

    await new Promise((resolve) => clientSocketC.on('connect', resolve));
    clientSocketC.emit('channel:join', { channelId: dmChannelId });

    let messageReceivedByC = false;
    clientSocketC.on('message:new', () => {
      messageReceivedByC = true;
    });

    // Send a message in DM channel by member User A
    await request('POST', `/api/channels/${dmChannelId}/messages`, { content: 'Secret DM content' }, tokenA);

    await new Promise((resolve) => setTimeout(resolve, 300));
    assert.strictEqual(messageReceivedByC, false);
    clientSocketC.disconnect();
    console.log('✓ Passed: Non-member socket received no message:new after channel:join.');
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
    if (ioServer) ioServer.close();
    if (server) server.close();
    await mongoose.disconnect();
  }
}

runChatTests();
