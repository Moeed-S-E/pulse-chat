const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const assert = require('assert');

const authRoutes = require('../routes/authRoutes');
const User = require('../models/User');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

const PORT = 5099;
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

async function runTests() {
  console.log('--- STARTING AUTH & USER PROFILE UNIT TESTS ---');
  let testCount = 0;
  let passCount = 0;

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[Test DB] Connected to MongoDB test database.');

    // Clear test users
    await User.deleteMany({ email: /@testdomain\.com$/ });

    server = app.listen(PORT);
    console.log(`[Test Server] Listening on port ${PORT}`);

    // Test 1: Check available username
    testCount++;
    console.log(`\nTest ${testCount}: Check available username`);
    const checkRes1 = await request('GET', '/api/auth/check-username/fresh_user_99');
    assert.strictEqual(checkRes1.status, 200);
    assert.strictEqual(checkRes1.body.available, true);
    console.log('✓ Passed: Username is reported as available.');
    passCount++;

    // Test 2: Invalid username format check
    testCount++;
    console.log(`\nTest ${testCount}: Invalid username format check`);
    const checkRes2 = await request('GET', '/api/auth/check-username/a');
    assert.strictEqual(checkRes2.status, 400);
    assert.strictEqual(checkRes2.body.available, false);
    console.log('✓ Passed: Invalid username format rejected.');
    passCount++;

    // Test 3: Sign up new user
    testCount++;
    console.log(`\nTest ${testCount}: Sign up new user account`);
    const signupPayload = {
      name: 'Alice Developer',
      username: 'alice_dev',
      email: 'alice@testdomain.com',
      password: 'securepassword123',
    };
    const signupRes = await request('POST', '/api/auth/signup', signupPayload);
    assert.strictEqual(signupRes.status, 201);
    assert.ok(signupRes.body.token, 'Token should be returned');
    assert.strictEqual(signupRes.body.user.username, 'alice_dev');
    assert.strictEqual(signupRes.body.user.name, 'Alice Developer');
    assert.strictEqual(signupRes.body.user.avatarInitial, 'A');
    console.log('✓ Passed: Account created successfully with token and initial profile.');
    passCount++;

    const token = signupRes.body.token;

    // Test 4: Duplicate username signup prevention
    testCount++;
    console.log(`\nTest ${testCount}: Duplicate username signup prevention`);
    const dupUserRes = await request('POST', '/api/auth/signup', {
      name: 'Alice Second',
      username: 'alice_dev',
      email: 'alice2@testdomain.com',
      password: 'password123',
    });
    assert.strictEqual(dupUserRes.status, 400);
    assert.strictEqual(dupUserRes.body.message, 'Username is already taken.');
    console.log('✓ Passed: Duplicate username prevented.');
    passCount++;

    // Test 5: Duplicate email signup prevention
    testCount++;
    console.log(`\nTest ${testCount}: Duplicate email signup prevention`);
    const dupEmailRes = await request('POST', '/api/auth/signup', {
      name: 'Alice Third',
      username: 'alice_unique',
      email: 'alice@testdomain.com',
      password: 'password123',
    });
    assert.strictEqual(dupEmailRes.status, 400);
    assert.strictEqual(dupEmailRes.body.message, 'Email is already registered.');
    console.log('✓ Passed: Duplicate email prevented.');
    passCount++;

    // Test 6: Sign up second user for collision testing
    testCount++;
    console.log(`\nTest ${testCount}: Sign up second user for testing profile handle collisions`);
    const user2Res = await request('POST', '/api/auth/signup', {
      name: 'Bob Smith',
      username: 'bob_smith',
      email: 'bob@testdomain.com',
      password: 'password123',
    });
    assert.strictEqual(user2Res.status, 201);
    console.log('✓ Passed: Second user registered.');
    passCount++;

    // Test 7: Login user using username
    testCount++;
    console.log(`\nTest ${testCount}: Login with username`);
    const loginRes = await request('POST', '/api/auth/login', {
      loginIdentifier: 'alice_dev',
      password: 'securepassword123',
    });
    assert.strictEqual(loginRes.status, 200);
    assert.ok(loginRes.body.token);
    assert.strictEqual(loginRes.body.user.username, 'alice_dev');
    console.log('✓ Passed: Logged in using username.');
    passCount++;

    // Test 8: Fetch current user profile (/me)
    testCount++;
    console.log(`\nTest ${testCount}: Verify authenticated session (/api/auth/me)`);
    const meRes = await request('GET', '/api/auth/me', null, token);
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.body.user.username, 'alice_dev');
    console.log('✓ Passed: Correct user session returned.');
    passCount++;

    // Test 9: Update profile display name and username
    testCount++;
    console.log(`\nTest ${testCount}: Update profile display name, username, and bio`);
    const updateRes = await request(
      'PUT',
      '/api/auth/profile',
      {
        name: 'Alice Wonder',
        username: 'alice_wonderland',
        bio: 'Fullstack Engineer & PulseChat enthusiast',
        avatarColor: '#7C4DFF',
      },
      token
    );
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.user.name, 'Alice Wonder');
    assert.strictEqual(updateRes.body.user.username, 'alice_wonderland');
    assert.strictEqual(updateRes.body.user.avatarInitial, 'A');
    assert.strictEqual(updateRes.body.user.bio, 'Fullstack Engineer & PulseChat enthusiast');
    console.log('✓ Passed: Profile updated successfully.');
    passCount++;

    // Test 10: Prevent changing username to taken handle
    testCount++;
    console.log(`\nTest ${testCount}: Prevent changing username to taken handle ('bob_smith')`);
    const takenRes = await request(
      'PUT',
      '/api/auth/profile',
      { username: 'bob_smith' },
      token
    );
    assert.strictEqual(takenRes.status, 400);
    assert.strictEqual(takenRes.body.message, 'Username is already taken.');
    console.log('✓ Passed: Username collision blocked on profile update.');
    passCount++;

    console.log(`\n========================================`);
    console.log(`ALL ${passCount}/${testCount} TESTS PASSED SUCCESSFULLY!`);
    console.log(`========================================\n`);

    // Clean up test data
    await User.deleteMany({ email: /@testdomain\.com$/ });
  } catch (err) {
    console.error('\n❌ Test execution failed with error:', err);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
  }
}

runTests();
