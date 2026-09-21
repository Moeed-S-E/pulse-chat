# ⚡ PulseChat — Real-Time Encrypted Chat & WebRTC Video Platform

**PulseChat** is an ultra-fast, full-stack real-time communication platform built with Node.js/Express, Socket.io, WebRTC, MongoDB, and React (Vite). It features end-to-end zero-knowledge encryption, interactive 3D WebGL animations, real-time messaging, and high-definition video calling.

---

## ✨ Features & Highlights

### 🎨 3D Scroll-Driven Landing Page
- **Interactive Three.js WebGL Engine**: Powered by persistent particle physics, dynamic particle graph edges, and scroll velocity acceleration.
- **6 Continuous Scroll Stages**:
  1. **Intro / Hero**: 3D network sphere with heartbeat energy ripples and mouse parallax.
  2. **Features**: Sphere drifts left and expands into a constellation grid.
  3. **Security**: Wireframe Icosahedron Encryption Shell closes around the sphere with a vertical scanning beam.
  4. **WebRTC Video**: 6 live video call tiles float into perspective mesh with live connection lines.
  5. **Architecture**: Sphere morphs into 3 stacked architectural planes (`Client`, `Relay`, `Storage`) with interactive node highlighting.
  6. **Launch**: Camera zooms straight through the glowing core with a particle hyper-drive speed boost into the CTA card.
- **Interactive Encryption Playground (`CipherCard`)**: Live editable plaintext input that encrypts on the fly into AES-256 GCM simulation hex stream with copy-to-clipboard functionality.

### 🔒 End-to-End Zero-Knowledge Encryption
- **Web Crypto API**: Native browser-based AES-256 GCM encryption.
- **Zero-Knowledge Architecture**: Private keys stay strictly in the browser. The server and database only ever store raw ciphertext payloads.

### 💬 Real-Time Messaging & Workspace Channels
- **Public Channels & DMs**: Public topic channels, 1:1 Direct Messaging, and username discovery search (`@username`).
- **Real-Time Delivery**: Socket.io-driven messaging with live typing indicators, presence tracking, and online status badges.
- **Rich Media Sharing**: Image sharing, code snippets, and system logs.

### 📹 HD WebRTC Video Calling
- **Native WebRTC Integration**: Direct peer-to-peer `RTCPeerConnection` media streaming.
- **Call Controls**: Mute/unmute microphone, toggle camera, call timer, participant badges, and room code join (`PULSE-xxxx`).
- **Call Overlays**: Incoming call dark banner, outgoing call screen with pulsing ripples, floating draggable self-view video tile, and automated call summary logs (`Video call ended · 04:32`).

---

## 🏗️ System Architecture

```
React (Vite) ── Socket.io-client ── WebRTC (native RTCPeerConnection)
       │
       ▼
Node.js / Express ── Socket.io server (chat events + WebRTC signaling)
       │
       ▼
MongoDB / Mongoose (Users, Channels, Messages)
```

### WebRTC Signaling Flow over Socket.io

```
Caller                     Socket.io Server                Callee
  │──── call:invite ────────────▶│──── call:incoming ─────────▶│
  │                               │                              │
  │◀─── call:accept ──────────────│◀──── call:accept ───────────│
  │                               │                              │
  │──── webrtc:offer ────────────▶│──── webrtc:offer ───────────▶│
  │◀─── webrtc:answer ─────────────│◀──── webrtc:answer ─────────│
  │──── webrtc:ice-candidate ────▶│──── webrtc:ice-candidate ───▶│
  │◀─── webrtc:ice-candidate ──────│◀──── webrtc:ice-candidate ──│
  │                                                               │
  │◀══════════ direct P2P media stream (after ICE) ═════════════▶│
```

---

## 📁 Repository Structure

```
Final-Project/
├── client/                     # Frontend React (Vite) Application
│   ├── src/
│   │   ├── components/         # UI & Feature Components
│   │   │   ├── auth/           # Login & Signup Forms
│   │   │   ├── calls/          # WebRTC Call Overlays & Modals
│   │   │   ├── home/           # Chat Header, Sidebar, Thread, Input
│   │   │   └── ui/             # Design System Elements (Avatar, Modal, Toast)
│   │   ├── context/            # Global Context (Auth, Socket, Call, Theme, Toast)
│   │   ├── pages/              # LandingPage, HomePage, AuthPage, SettingsPage
│   │   ├── utils/              # Web Crypto AES-256 & Helper Functions
│   │   ├── App.jsx             # Main Router & Provider Tree
│   │   ├── index.css           # TailwindCSS v4 + 3D Keyframes & Shimmer Styles
│   │   └── main.jsx            # React Root Entrypoint
│   ├── package.json
│   └── vite.config.js
│
├── server/                     # Backend Node.js / Express Server
│   ├── middleware/             # JWT Authentication Middleware
│   ├── models/                 # Mongoose Data Models (User, Channel, Message)
│   ├── routes/                 # Express API Routes (Auth, User, Channel, Message)
│   ├── socket/                 # Socket.io Event & WebRTC Signaling Handler
│   ├── tests/                  # Backend Unit Test Suite (27 tests)
│   ├── index.js                # Express & Socket.io Server Entrypoint
│   ├── seed.js                 # Database Seeding Script
│   └── package.json
└── README.md
```

---

## 🚀 Quick Start & Running Locally

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017/pulsechat`) or MongoDB Atlas URI

### 1. Backend Server Setup

```bash
cd server
npm install

# (Optional) Seed initial channels & test users (@alice & @bob)
npm run seed

# Start development server (running on http://localhost:5000)
npm run dev
```

### 2. Frontend Client Setup

```bash
cd client
npm install

# Start Vite dev server (running on http://localhost:5173)
npm run dev
```

---

## 🧪 Testing

### Running Backend Automated Unit Tests

The backend includes a comprehensive 27-test unit suite covering authentication, DM creation, message threads, WebSocket payload validation, group broadcast channels, and WebRTC video call helper endpoints.

```bash
cd server
npm test
```

### WebRTC Testing Across Physical Devices (HTTPS Setup)

Web browsers require HTTPS for camera and microphone access (`navigator.mediaDevices.getUserMedia`) when accessed outside `localhost`.

To test 1:1 video calling across separate devices:

```bash
# Option A: Cloudflare Tunnel
cloudflared tunnel --url http://localhost:5173

# Option B: ngrok
ngrok http 5173
```

Open the generated HTTPS URL on a mobile device or second computer to test live WebRTC video streams.

---

## 🎬 Demo Walkthrough Script

1. **User A Signup**: Open `http://localhost:5173/signup`, register as **Alice** (`@alice`).
2. **User B Signup**: Open an Incognito window, register as **Bob** (`@bob`).
3. **Connect by Username**:
   - In Alice's sidebar, click the **User Plus** icon to open "Find & Connect".
   - Search `@bob` and click **Connect**. A 1:1 DM channel opens automatically.
4. **Real-time Chat & Encryption**:
   - Send messages between Alice and Bob. Test live typing indicators (`Bob is typing...`) and real-time delivery.
5. **Presence Tracking**:
   - Close Bob's browser tab. Bob's status indicator turns gray within 1 second. Re-open to see it return to active green.
6. **1:1 WebRTC Video Calling**:
   - Click the **Video Call** button in Alice's chat header.
   - Alice sees the dark Outgoing Call screen with pulsing ripples.
   - Bob sees the dark Incoming Call overlay with Accept and Decline buttons.
   - Click **Accept** on Bob's screen to launch the active video canvas.
   - Test mic mute, camera toggle, and draggable self-view tile.
   - Click **End Call** to tear down the peer connection and log a system summary in the chat thread (`Video call ended · 00:15`).

---

## 📄 License

MIT License — built for PulseChat.
