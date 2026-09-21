import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Activity, ShieldCheck, Video, VideoOff, MessageSquare, Sparkles, ArrowRight,
  Sun, Moon, Zap, Smartphone, Layout, CheckCircle2, ChevronDown, Mic, MicOff,
  PhoneOff, Users, Laptop, Radio, Database, Lock, Key, Copy, Check
} from 'lucide-react';

/* ════════════════════════════════════════════════════════════════════════════
   THREE.JS — "The Pulse" 3D Scroll Engine
   One persistent WebGL scene behind the whole page. The scroll position drives
   a 3D camera & scene state machine through six distinct stages:

     0 hero          Network sphere on right, heartbeat ripples & particle dust
     1 features      Sphere drifts off-screen left, expand constellation grid
     2 security      Wireframe encryption shell closes around, green scan beam
     3 webrtc        Sphere recedes; six live video call tiles fly in with 3D mesh
     4 architecture  Sphere flattens into 3 stacked layers: Client / Relay / Storage
     5 launch        Camera pushes through glowing core (hyper-drive zoom)
   ════════════════════════════════════════════════════════════════════════════ */

const PALETTE = {
  dark: { c1: '#6366F1', c2: '#22D3EE', secure: '#34D399', packet: '#67E8F9', line: '#818CF8', dust: '#A5B4FC', shell: '#34D399' },
  light: { c1: '#4F46E5', c2: '#0891B2', secure: '#059669', packet: '#0E7490', line: '#6366F1', dust: '#6366F1', shell: '#059669' },
};

const OP = {
  dark: { node: 1, line: 0.22, packet: 1, dust: 0.6, halo: 0.30, ring: 0.7, shell: 0.22, scan: 0.7, tileLine: 0.30 },
  light: { node: 0.9, line: 0.28, packet: 0.95, dust: 0.35, halo: 0.14, ring: 0.5, shell: 0.30, scan: 0.6, tileLine: 0.35 },
};

const KEYS = [
  { cam: [0, 0, 9.5], pos: [0, -0.1, 0], nx: 0.52, scale: 1.15, secure: 0, tiles: 0, morph: 0, dim: 1, tilt: 0 },
  { cam: [0, 0.2, 10], pos: [0, -0.8, -3], nx: -0.78, scale: 0.95, secure: 0, tiles: 0, morph: 0, dim: 0.5, tilt: 0.1 },
  { cam: [0, 0, 9], pos: [0, 0, 0], nx: -0.5, scale: 1.1, secure: 1, tiles: 0, morph: 0, dim: 1, tilt: 0 },
  { cam: [0, 0, 9], pos: [0, 0, -10], nx: 0, scale: 1.6, secure: 0.4, tiles: 1, morph: 0, dim: 0.35, tilt: 0 },
  { cam: [0, 0.8, 10], pos: [0, 0, 0], nx: 0.5, scale: 0.95, secure: 0.5, tiles: 0, morph: 1, dim: 1, tilt: 0.42 },
  { cam: [0, 0, 6.2], pos: [0, 0, 0], nx: 0, scale: 1.5, secure: 0, tiles: 0, morph: 0, dim: 0.75, tilt: 0 },
];

const TILE_USERS = [
  { name: 'You', initial: 'Y', color: ['#4F46E5', '#22D3EE'], self: true },
  { name: 'Alex Rivera', initial: 'A', color: ['#059669', '#34D399'] },
  { name: 'Sam Wilson', initial: 'S', color: ['#4F46E5', '#818CF8'] },
  { name: 'Maya Chen', initial: 'M', color: ['#DB2777', '#F472B6'] },
  { name: 'Omar Khan', initial: 'O', color: ['#D97706', '#FBBF24'] },
  { name: 'Lena Fischer', initial: 'L', color: ['#7C3AED', '#A78BFA'] },
];

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const easeOutBack = (t) => { const c1 = 1.70158; const c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function setRGB(v, hex) {
  const n = parseInt(hex.slice(1), 16);
  v.set(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function sampleKeys(stage) {
  const s = clamp(stage, 0, KEYS.length - 1);
  const i = Math.min(Math.floor(s), KEYS.length - 2);
  const f = smooth(s - i);
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const m = (k) => lerp(a[k], b[k], f);
  const v = (k) => [lerp(a[k][0], b[k][0], f), lerp(a[k][1], b[k][1], f), lerp(a[k][2], b[k][2], f)];
  return { cam: v('cam'), pos: v('pos'), nx: m('nx'), scale: m('scale'), secure: m('secure'), tiles: m('tiles'), morph: m('morph'), dim: m('dim'), tilt: m('tilt') };
}

/* ── GLSL Shaders ─────────────────────────────────────────────────────────── */

const POINT_VERT = /* glsl */ `
  attribute float aSize; attribute float aPhase; attribute float aKind; attribute float aLayer;
  uniform float uTime, uPixelRatio, uSizeMul, uWave, uHighlight, uMaxSize, uFadeRange;
  varying float vKind; varying float vGlow; varying float vFade;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float r = length(position);
    float wave = exp(-pow((r - uWave) * 1.6, 2.0));
    float tw = 0.85 + 0.15 * sin(uTime * 2.0 + aPhase * 6.2831);
    float hl = 0.0;
    if (uHighlight > -0.5) { hl = abs(aLayer - uHighlight) < 0.5 ? 1.0 : -0.7; }
    float size = aSize * tw * (1.0 + wave * 1.1 + max(hl, 0.0) * 0.7) * uSizeMul;
    gl_PointSize = clamp(size * uPixelRatio * (12.0 / -mv.z), 1.0, uMaxSize * uPixelRatio);
    gl_Position = projectionMatrix * mv;
    vKind = aKind;
    vGlow = wave + max(hl, 0.0) * 0.8;
    vFade = clamp(1.25 - (-mv.z - 4.0) / uFadeRange, 0.15, 1.0) * (1.0 + min(hl, 0.0));
  }
`;

const POINT_FRAG = /* glsl */ `
  uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uTint;
  uniform float uSecure, uOpacity, uDark;
  varying float vKind; varying float vGlow; varying float vFade;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    vec3 col = mix(uC1, uC2, vKind);
    col = mix(col, uTint, uSecure * 0.65);
    col = mix(col, vec3(1.0), clamp(vGlow, 0.0, 1.0) * 0.5 * uDark);
    float soft = pow(clamp(1.0 - d * 2.0, 0.0, 1.0), 2.2) + smoothstep(0.12, 0.0, d) * 0.6 * uDark;
    float solid = smoothstep(0.5, 0.32, d);
    float a = mix(solid * 0.92, soft, uDark);
    a *= uOpacity * vFade * (1.0 + vGlow * 0.6);
    gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
  }
`;

const LINE_VERT = /* glsl */ `
  uniform float uWave; varying float vGlow; varying float vFade;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float r = length(position);
    vGlow = exp(-pow((r - uWave) * 1.4, 2.0));
    vFade = clamp(1.3 - (-mv.z - 4.0) / 16.0, 0.1, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const LINE_FRAG = /* glsl */ `
  uniform vec3 uColor; uniform vec3 uTint; uniform float uOpacity, uSecure;
  varying float vGlow; varying float vFade;
  void main() {
    vec3 col = mix(uColor, uTint, uSecure * 0.6);
    gl_FragColor = vec4(col, clamp(uOpacity * vFade * (1.0 + vGlow * 2.5), 0.0, 1.0));
  }
`;

const CORE_VERT = /* glsl */ `
  uniform float uTime; varying vec3 vN; varying vec3 vV; varying float vD;
  void main() {
    vec3 p = position;
    float n = sin(p.x * 3.1 + uTime * 1.1) * sin(p.y * 3.7 - uTime * 0.9) * sin(p.z * 3.3 + uTime * 1.3);
    p += normal * n * 0.09;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    vD = n;
    gl_Position = projectionMatrix * mv;
  }
`;

const CORE_FRAG = /* glsl */ `
  uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uTint;
  uniform float uDark, uSecure, uOpacity;
  varying vec3 vN; varying vec3 vV; varying float vD;
  void main() {
    float f = pow(1.0 - clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0), 2.2);
    vec3 base = mix(uC1, uC2, clamp(f * 1.2 + vD * 0.6 + 0.25, 0.0, 1.0));
    base = mix(base, uTint, uSecure * 0.4);
    float a = mix(0.95, 0.28 + f * 0.9, uDark);
    vec3 col = base * mix(0.9, 0.55 + f * 1.2, uDark);
    gl_FragColor = vec4(col, clamp(a * uOpacity, 0.0, 1.0));
  }
`;

const BB_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

const HALO_FRAG = /* glsl */ `
  uniform vec3 uC1; uniform vec3 uC2; uniform float uOpacity; varying vec2 vUv;
  void main() {
    float r = length(vUv - 0.5) * 2.0;
    float a = pow(clamp(1.0 - r, 0.0, 1.0), 2.5);
    gl_FragColor = vec4(mix(uC1, uC2, r * 0.6), a * uOpacity);
  }
`;

const RING_FRAG = /* glsl */ `
  uniform vec3 uC; uniform float uT, uOpacity; varying vec2 vUv;
  void main() {
    float r = length(vUv - 0.5) * 2.0;
    float d = abs(r - uT);
    float a = smoothstep(0.07, 0.0, d) * pow(1.0 - uT, 1.5) * uOpacity;
    gl_FragColor = vec4(uC, a);
  }
`;

const TILE_FRAG = /* glsl */ `
  uniform sampler2D uMap; uniform float uAlpha, uTime, uSpeak, uSeed; varying vec2 vUv;
  const float ASPECT = 1.6;
  float sdRoundBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
  void main() {
    vec2 p = (vUv - 0.5) * vec2(ASPECT, 1.0);
    float d = sdRoundBox(p, vec2(ASPECT * 0.5, 0.5), 0.08);
    float mask = 1.0 - smoothstep(-0.003, 0.003, d);
    vec3 col = texture2D(uMap, vUv).rgb;
    float n = sin(vUv.x * 7.0 + uTime * 0.6 + uSeed) * sin(vUv.y * 5.0 - uTime * 0.45 + uSeed * 1.7);
    col += vec3(0.05, 0.06, 0.09) * n;
    col *= 0.965 + 0.035 * sin(vUv.y * 300.0 + uTime * 2.5);
    col *= 1.0 - 0.45 * smoothstep(0.35, 0.95, length(p * vec2(0.9, 1.5)));
    float ring = smoothstep(-0.018, -0.010, d) * (1.0 - smoothstep(-0.004, 0.002, d));
    vec3 speakCol = vec3(0.20, 0.83, 0.60);
    col = mix(col, speakCol, ring * (0.10 + uSpeak * 0.85));
    col += speakCol * uSpeak * 0.06;
    gl_FragColor = vec4(col, mask * uAlpha);
  }
`;

/* ── Tile Canvas Textures ─────────────────────────────────────────────────── */

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawTile(cv, u, st) {
  const ctx = cv.getContext('2d');
  const w = cv.width;
  const h = cv.height;
  const off = u.self && st.camOff;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0A0F1E';
  ctx.fillRect(0, 0, w, h);
  if (!off) {
    const g = ctx.createRadialGradient(w * 0.5, h * 0.4, 8, w * 0.5, h * 0.4, w * 0.62);
    g.addColorStop(0, u.color[0] + 'AA');
    g.addColorStop(1, '#0A0F1E00');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  const cx = w / 2;
  const cy = h / 2 - 16;
  const r = off ? 46 : 60;
  const ag = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  ag.addColorStop(0, off ? '#334155' : u.color[0]);
  ag.addColorStop(1, off ? '#1E293B' : u.color[1]);
  ctx.fillStyle = ag;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `700 ${off ? 44 : 54}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(u.initial, cx, cy + 2);
  if (off) {
    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 20px system-ui, sans-serif';
    ctx.fillText('Camera off', cx, cy + r + 30);
  }
  // name pill
  ctx.font = '600 20px system-ui, sans-serif';
  ctx.textAlign = 'left';
  const tw = ctx.measureText(u.name).width;
  ctx.fillStyle = 'rgba(2,6,23,0.55)';
  roundRect(ctx, 18, h - 54, tw + 28, 34, 17);
  ctx.fill();
  ctx.fillStyle = '#F8FAFC';
  ctx.textBaseline = 'middle';
  ctx.fillText(u.name, 32, h - 37);
  // mic badge
  const mx = w - 36;
  const my = h - 37;
  const muted = u.self && st.muted;
  ctx.fillStyle = muted ? '#EF4444' : 'rgba(2,6,23,0.55)';
  ctx.beginPath();
  ctx.arc(mx, my, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#F8FAFC';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  roundRect(ctx, mx - 4.5, my - 10, 9, 13, 4.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(mx, my, 8, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(mx, my + 8);
  ctx.lineTo(mx, my + 12);
  ctx.stroke();
  if (muted) {
    ctx.beginPath();
    ctx.moveTo(mx - 11, my - 11);
    ctx.lineTo(mx + 11, my + 11);
    ctx.stroke();
  }
}

/* ── 3D Scene Factory ─────────────────────────────────────────────────────── */

function createPulseScene(canvas, { isDark, reduceMotion }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  const pr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(pr);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 120);
  const world = new THREE.Group();
  scene.add(world);
  const overlay = new THREE.Group();
  scene.add(overlay);

  const rand = mulberry32(7);
  const disposables = [];
  const track = (o) => { disposables.push(o); return o; };

  /* materials */
  const mkPointMat = () => track(new THREE.ShaderMaterial({
    vertexShader: POINT_VERT,
    fragmentShader: POINT_FRAG,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 }, uPixelRatio: { value: pr }, uSizeMul: { value: 1 }, uWave: { value: -100 },
      uHighlight: { value: -1 }, uMaxSize: { value: 90 }, uFadeRange: { value: 16 },
      uC1: { value: new THREE.Vector3() }, uC2: { value: new THREE.Vector3() }, uTint: { value: new THREE.Vector3() },
      uSecure: { value: 0 }, uOpacity: { value: 1 }, uDark: { value: 1 },
    },
  }));
  const nodeMat = mkPointMat();
  const packetMat = mkPointMat();
  const dustMat = mkPointMat();
  const tpMat = mkPointMat();
  dustMat.uniforms.uFadeRange.value = 70;

  const lineMat = track(new THREE.ShaderMaterial({
    vertexShader: LINE_VERT, fragmentShader: LINE_FRAG, transparent: true, depthWrite: false,
    uniforms: {
      uWave: { value: -100 }, uColor: { value: new THREE.Vector3() }, uTint: { value: new THREE.Vector3() },
      uOpacity: { value: 0.2 }, uSecure: { value: 0 },
    },
  }));

  const coreMat = track(new THREE.ShaderMaterial({
    vertexShader: CORE_VERT, fragmentShader: CORE_FRAG, transparent: true, depthWrite: false,
    uniforms: {
      uTime: { value: 0 }, uC1: { value: new THREE.Vector3() }, uC2: { value: new THREE.Vector3() }, uTint: { value: new THREE.Vector3() },
      uDark: { value: 1 }, uSecure: { value: 0 }, uOpacity: { value: 1 },
    },
  }));

  const haloMat = track(new THREE.ShaderMaterial({
    vertexShader: BB_VERT, fragmentShader: HALO_FRAG, transparent: true, depthWrite: false,
    uniforms: { uC1: { value: new THREE.Vector3() }, uC2: { value: new THREE.Vector3() }, uOpacity: { value: 0.3 } },
  }));

  const ringMats = [0, 1, 2].map(() => track(new THREE.ShaderMaterial({
    vertexShader: BB_VERT, fragmentShader: RING_FRAG, transparent: true, depthWrite: false,
    uniforms: { uC: { value: new THREE.Vector3() }, uT: { value: 0 }, uOpacity: { value: 0.7 } },
  })));

  const shellMat = track(new THREE.LineBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  const scanMat = track(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  const tileLineMat = track(new THREE.LineBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));

  const planeGeo = track(new THREE.PlaneGeometry(1, 1));

  /* network graph */
  const N = 110;
  const A = new Float32Array(N * 3);
  const B = new Float32Array(N * 3);
  const phase = new Float32Array(N);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const layerY = [-1.7, 0, 1.7];
  const layerCenter = [-0.66, 0, 0.66];
  const nodeAttrs = { size: new Float32Array(N), phase, kind: new Float32Array(N), layer: new Float32Array(N) };
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const rr = Math.sqrt(1 - y * y);
    const th = golden * i;
    const rad = 1.9 + rand() * 0.7;
    A[i * 3] = Math.cos(th) * rr * rad;
    A[i * 3 + 1] = y * rad;
    A[i * 3 + 2] = Math.sin(th) * rr * rad;
    const layer = y < -0.33 ? 0 : y > 0.33 ? 2 : 1;
    const rd = 3.0 * (0.3 + 0.7 * Math.sqrt(rand()));
    B[i * 3] = Math.cos(th) * rd;
    B[i * 3 + 1] = layerY[layer] + (y - layerCenter[layer]) * 0.5;
    B[i * 3 + 2] = Math.sin(th) * rd;
    phase[i] = rand();
    nodeAttrs.size[i] = 9 + rand() * 12 + (rand() > 0.88 ? 8 : 0);
    nodeAttrs.kind[i] = rand();
    nodeAttrs.layer[i] = layer;
  }

  const edges = [];
  const edgeSet = new Set();
  const adj = Array.from({ length: N }, () => []);
  for (let i = 0; i < N; i++) {
    const d = [];
    for (let j = 0; j < N; j++) {
      if (i === j) continue;
      const dx = A[i * 3] - A[j * 3];
      const dy = A[i * 3 + 1] - A[j * 3 + 1];
      const dz = A[i * 3 + 2] - A[j * 3 + 2];
      d.push([dx * dx + dy * dy + dz * dz, j]);
    }
    d.sort((p, q) => p[0] - q[0]);
    for (let k = 0; k < 3; k++) {
      const j = d[k][1];
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push(i < j ? [i, j] : [j, i]);
        adj[i].push(j);
        adj[j].push(i);
      }
    }
  }

  function makePoints(n, material, attrs) {
    const g = track(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(attrs.size, 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(attrs.phase, 1));
    g.setAttribute('aKind', new THREE.BufferAttribute(attrs.kind, 1));
    g.setAttribute('aLayer', new THREE.BufferAttribute(attrs.layer, 1));
    const pts = new THREE.Points(g, material);
    pts.frustumCulled = false;
    return pts;
  }

  const nodePts = makePoints(N, nodeMat, nodeAttrs);
  world.add(nodePts);
  const cur = nodePts.geometry.attributes.position.array;

  const lineGeo = track(new THREE.BufferGeometry());
  lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(edges.length * 6), 3).setUsage(THREE.DynamicDrawUsage));
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  lines.frustumCulled = false;
  world.add(lines);

  /* Packets */
  const P = 70;
  const packets = Array.from({ length: P }, () => {
    const from = Math.floor(rand() * N);
    return { from, to: adj[from][Math.floor(rand() * adj[from].length)], prev: -1, t: rand(), sp: 0.22 + rand() * 0.4 };
  });
  const pAttrs = { size: new Float32Array(P * 3), phase: new Float32Array(P * 3), kind: new Float32Array(P * 3), layer: new Float32Array(P * 3) };
  for (let i = 0; i < P; i++) {
    pAttrs.size.set([16, 10, 6], i * 3);
    pAttrs.phase.set([rand(), rand(), rand()], i * 3);
  }
  const packetPts = makePoints(P * 3, packetMat, pAttrs);
  world.add(packetPts);

  /* Core Orb */
  const core = new THREE.Mesh(track(new THREE.SphereGeometry(0.9, 64, 48)), coreMat);
  world.add(core);

  /* Encryption Shell + Scan Ring */
  const shell = new THREE.LineSegments(track(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(3.1, 2))), shellMat);
  world.add(shell);
  const scan = new THREE.Mesh(track(new THREE.TorusGeometry(1, 0.006, 6, 120)), scanMat);
  scan.rotation.x = Math.PI / 2;
  world.add(scan);

  /* Halo + Pulse Rings */
  const halo = new THREE.Mesh(planeGeo, haloMat);
  overlay.add(halo);
  const rings = ringMats.map((m) => {
    const r = new THREE.Mesh(planeGeo, m);
    r.scale.setScalar(10);
    overlay.add(r);
    return r;
  });

  /* Ambient Dust */
  const D = 520;
  const dAttrs = { size: new Float32Array(D), phase: new Float32Array(D), kind: new Float32Array(D), layer: new Float32Array(D) };
  const dust = makePoints(D, dustMat, dAttrs);
  {
    const arr = dust.geometry.attributes.position.array;
    for (let i = 0; i < D; i++) {
      arr[i * 3] = (rand() - 0.5) * 64;
      arr[i * 3 + 1] = (rand() - 0.5) * 38;
      arr[i * 3 + 2] = -28 + rand() * 30;
      dAttrs.size[i] = 2 + rand() * 4;
      dAttrs.phase[i] = rand();
      dAttrs.kind[i] = rand();
    }
    dust.geometry.attributes.position.needsUpdate = true;
  }
  scene.add(dust);

  /* Call Tiles */
  const tilesGroup = new THREE.Group();
  scene.add(tilesGroup);
  const selfState = { muted: false, camOff: false };
  const tiles = TILE_USERS.map((u, i) => {
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 320;
    const tex = track(new THREE.CanvasTexture(cv));
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    const mat = track(new THREE.ShaderMaterial({
      vertexShader: BB_VERT, fragmentShader: TILE_FRAG, transparent: true, depthWrite: false,
      uniforms: { uMap: { value: tex }, uAlpha: { value: 0 }, uTime: { value: 0 }, uSpeak: { value: 0 }, uSeed: { value: i * 1.7 } },
    }));
    const mesh = new THREE.Mesh(planeGeo, mat);
    mesh.visible = false;
    tilesGroup.add(mesh);
    drawTile(cv, u, selfState);
    tex.needsUpdate = true;
    return { u, cv, tex, mat, mesh, speak: 0, x: 0, y: 0, w: 1, h: 1 };
  });

  const tilePairs = [];
  for (let i = 0; i < tiles.length; i++) for (let j = i + 1; j < tiles.length; j++) tilePairs.push([i, j]);
  const tileLineGeo = track(new THREE.BufferGeometry());
  tileLineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(tilePairs.length * 6), 3).setUsage(THREE.DynamicDrawUsage));
  const tileLines = new THREE.LineSegments(tileLineGeo, tileLineMat);
  tileLines.frustumCulled = false;
  tilesGroup.add(tileLines);

  const TP = 22;
  const tpAttrs = { size: new Float32Array(TP).fill(13), phase: new Float32Array(TP), kind: new Float32Array(TP), layer: new Float32Array(TP) };
  for (let i = 0; i < TP; i++) tpAttrs.phase[i] = rand();
  const tilePackets = makePoints(TP, tpMat, tpAttrs);
  tilesGroup.add(tilePackets);
  const tpState = Array.from({ length: TP }, () => ({ pair: Math.floor(rand() * tilePairs.length), t: rand(), sp: 0.3 + rand() * 0.4, dir: rand() > 0.5 ? 1 : 0 }));

  function layoutTiles() {
    const aspect = camera.aspect;
    const halfH = Math.tan(THREE.MathUtils.degToRad(22.5)) * 9;
    const halfW = halfH * aspect;
    const portrait = aspect < 1.15;
    const cols = portrait ? 2 : 3;
    const rows = portrait ? 3 : 2;
    const gap = 0.18;
    const maxW = Math.min(2 * halfW * 0.9, 10.5);
    const maxH = 2 * halfH * (portrait ? 0.56 : 0.52);
    const tw = Math.min((maxW - gap * (cols - 1)) / cols, ((maxH - gap * (rows - 1)) / rows) * 1.6);
    const th = tw / 1.6;
    tiles.forEach((t, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      t.x = (col - (cols - 1) / 2) * (tw + gap);
      t.y = ((rows - 1) / 2 - row) * (th + gap) + 0.05;
      t.w = tw;
      t.h = th;
    });
  }

  /* Theme */
  let dark = isDark;
  function applyTheme(nextDark) {
    dark = nextDark;
    const P_ = dark ? PALETTE.dark : PALETTE.light;
    const blend = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
    [nodeMat, packetMat, dustMat, tpMat, lineMat, coreMat, haloMat, ...ringMats, shellMat, scanMat, tileLineMat].forEach((m) => {
      m.blending = blend;
      m.needsUpdate = true;
    });
    [nodeMat, dustMat].forEach((m) => { setRGB(m.uniforms.uC1.value, P_.c1); setRGB(m.uniforms.uC2.value, P_.c2); });
    setRGB(dustMat.uniforms.uC1.value, P_.dust);
    setRGB(dustMat.uniforms.uC2.value, P_.dust);
    [packetMat, tpMat].forEach((m) => { setRGB(m.uniforms.uC1.value, P_.packet); setRGB(m.uniforms.uC2.value, P_.packet); });
    [nodeMat, packetMat, dustMat, tpMat, coreMat].forEach((m) => setRGB(m.uniforms.uTint.value, P_.secure));
    [nodeMat, packetMat, dustMat, tpMat, coreMat].forEach((m) => { m.uniforms.uDark.value = dark ? 1 : 0; });
    setRGB(lineMat.uniforms.uColor.value, P_.line);
    setRGB(lineMat.uniforms.uTint.value, P_.secure);
    setRGB(coreMat.uniforms.uC1.value, P_.c1);
    setRGB(coreMat.uniforms.uC2.value, P_.c2);
    setRGB(haloMat.uniforms.uC1.value, P_.c1);
    setRGB(haloMat.uniforms.uC2.value, P_.c2);
    ringMats.forEach((m) => setRGB(m.uniforms.uC.value, P_.c2));
    shellMat.color.set(P_.shell);
    scanMat.color.set(P_.shell);
    tileLineMat.color.set(P_.line);
  }
  applyTheme(isDark);

  /* State & Physics */
  const clock = new THREE.Clock();
  const motion = reduceMotion ? 0.25 : 1;
  let time = 0;
  let pulseT = 0.5;
  let stageCur = 0;
  let stageTarget = 0;
  let stageInit = false;
  let scrollVel = 0;
  const ptr = { x: 0, y: 0 };
  const ptrT = { x: 0, y: 0 };
  let raf = 0;
  let disposed = false;

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    layoutTiles();
  }
  resize();
  window.addEventListener('resize', resize);

  function frame() {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    const rdt = Math.min(clock.getDelta(), 0.05);
    const dt = rdt * motion * (1 + scrollVel * 0.12);
    scrollVel *= 0.90; // smooth decay
    time += dt;
    pulseT += dt;
    if (pulseT > 4.6) pulseT = 0;
    stageCur += (stageTarget - stageCur) * (1 - Math.exp(-rdt * 4.5));
    ptr.x += (ptrT.x - ptr.x) * (1 - Math.exp(-rdt * 3));
    ptr.y += (ptrT.y - ptr.y) * (1 - Math.exp(-rdt * 3));

    const K = sampleKeys(stageCur);
    const aspect = camera.aspect;
    const mobile = aspect < 0.85;
    const fit = mobile ? 0.68 : clamp(aspect / 1.75, 0.62, 1);
    const op = dark ? OP.dark : OP.light;
    const dim = K.dim * (mobile ? lerp(0.6, 1, K.tiles) : 1);

    camera.position.set(K.cam[0] + ptr.x * 0.4, K.cam[1] + ptr.y * 0.25, K.cam[2]);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    const dist = K.cam[2] - K.pos[2];
    const halfW = Math.tan(THREE.MathUtils.degToRad(22.5)) * dist * aspect;
    world.position.set(mobile ? 0 : K.nx * halfW, K.pos[1], K.pos[2]);
    world.scale.setScalar(K.scale * fit);
    world.rotation.set(K.tilt - ptr.y * 0.12, time * 0.12 + ptr.x * 0.35, 0);

    /* Heartbeat */
    const b1 = Math.exp(-pulseT * 7);
    const b2 = pulseT > 0.3 ? 0.6 * Math.exp(-(pulseT - 0.3) * 7) : 0;
    const kick = (b1 + b2) * 0.14;
    const wave = pulseT < 3.2 ? pulseT * 2.5 : -100;

    /* Morph nodes between sphere / 3 architectural layers */
    const m = smooth(clamp(K.morph, 0, 1));
    for (let i = 0; i < N; i++) {
      const i3 = i * 3;
      const ph = phase[i] * 6.2832;
      cur[i3] = lerp(A[i3], B[i3], m) + Math.sin(time * 0.6 + ph) * 0.05;
      cur[i3 + 1] = lerp(A[i3 + 1], B[i3 + 1], m) + Math.cos(time * 0.5 + ph * 1.3) * 0.05;
      cur[i3 + 2] = lerp(A[i3 + 2], B[i3 + 2], m) + Math.sin(time * 0.55 + ph * 0.7) * 0.05;
    }
    nodePts.geometry.attributes.position.needsUpdate = true;

    const lp = lineGeo.attributes.position.array;
    for (let e = 0; e < edges.length; e++) {
      const a3 = edges[e][0] * 3;
      const b3 = edges[e][1] * 3;
      const o = e * 6;
      lp[o] = cur[a3]; lp[o + 1] = cur[a3 + 1]; lp[o + 2] = cur[a3 + 2];
      lp[o + 3] = cur[b3]; lp[o + 4] = cur[b3 + 1]; lp[o + 5] = cur[b3 + 2];
    }
    lineGeo.attributes.position.needsUpdate = true;

    const pp = packetPts.geometry.attributes.position.array;
    for (let i = 0; i < P; i++) {
      const p = packets[i];
      p.t += p.sp * dt;
      if (p.t >= 1) {
        p.t -= 1;
        const arrived = p.to;
        const nb = adj[arrived];
        let n = nb[Math.floor(Math.random() * nb.length)];
        if (nb.length > 1 && n === p.from) n = nb[(nb.indexOf(n) + 1) % nb.length];
        p.from = arrived;
        p.to = n;
      }
      const f3 = p.from * 3;
      const t3 = p.to * 3;
      for (let k = 0; k < 3; k++) {
        const tt = Math.max(0, p.t - k * 0.07);
        const o = (i * 3 + k) * 3;
        pp[o] = lerp(cur[f3], cur[t3], tt);
        pp[o + 1] = lerp(cur[f3 + 1], cur[t3 + 1], tt);
        pp[o + 2] = lerp(cur[f3 + 2], cur[t3 + 2], tt);
      }
    }
    packetPts.geometry.attributes.position.needsUpdate = true;

    core.scale.setScalar((1 - 0.3 * m) * (1 + kick));

    overlay.position.copy(world.position);
    overlay.scale.copy(world.scale);
    overlay.quaternion.copy(camera.quaternion);
    halo.scale.setScalar(9 * (1 - 0.25 * m + kick));
    rings.forEach((r, i) => {
      const p = clamp((pulseT - i * 0.18) / 2.0, 0, 1);
      r.visible = pulseT < 3.2 && p > 0 && p < 1;
      ringMats[i].uniforms.uT.value = p;
      ringMats[i].uniforms.uOpacity.value = op.ring * dim * (1 - i * 0.25);
    });

    /* Encryption Shell + Scanner */
    shellMat.opacity = K.secure * op.shell;
    shell.visible = K.secure > 0.01;
    shell.rotation.y = -time * 0.05;
    const sy = Math.sin(time * 0.9) * 2.3;
    scan.position.y = sy;
    scan.scale.setScalar(Math.sqrt(Math.max(0.2, 3.1 * 3.1 - sy * sy)));
    scanMat.opacity = K.secure * op.scan * (1 - Math.abs(sy) / 3.1 * 0.5);
    scan.visible = K.secure > 0.01;

    /* Uniforms */
    [nodeMat, packetMat, dustMat, tpMat].forEach((mm) => { mm.uniforms.uTime.value = time; });
    nodeMat.uniforms.uWave.value = wave;
    packetMat.uniforms.uWave.value = wave;
    nodeMat.uniforms.uSecure.value = K.secure;
    packetMat.uniforms.uSecure.value = K.secure;
    lineMat.uniforms.uSecure.value = K.secure;
    coreMat.uniforms.uSecure.value = K.secure;
    lineMat.uniforms.uWave.value = wave;
    coreMat.uniforms.uTime.value = time;
    nodeMat.uniforms.uOpacity.value = op.node * dim;
    packetMat.uniforms.uOpacity.value = op.packet * dim;
    lineMat.uniforms.uOpacity.value = op.line * dim;
    coreMat.uniforms.uOpacity.value = dim;
    haloMat.uniforms.uOpacity.value = op.halo * dim * (1 + kick * 2);
    dustMat.uniforms.uOpacity.value = op.dust;
    dust.rotation.y = time * 0.01;
    dust.position.x = -ptr.x * 0.8;
    dust.position.y = -ptr.y * 0.5;

    /* Call Tiles */
    const showTiles = K.tiles > 0.01;
    tilesGroup.visible = showTiles;
    if (showTiles) {
      const speakers = selfState.muted ? [1, 2, 3, 4, 5] : [1, 2, 3, 4, 5, 0];
      const speaker = speakers[Math.floor(time / 2.2) % speakers.length];
      tiles.forEach((t, i) => {
        const s = easeOutBack(clamp(K.tiles * 1.6 - i * 0.12, 0, 1));
        const a = clamp(K.tiles * 1.6 - i * 0.12, 0, 1);
        t.speak += ((i === speaker ? 1 : 0) - t.speak) * (1 - Math.exp(-rdt * 8));
        const bob = Math.sin(time * 0.9 + i) * 0.06;
        t.mesh.visible = a > 0.01;
        t.mesh.position.set(t.x, t.y + bob, 0);
        t.mesh.scale.set(t.w * (0.6 + 0.4 * s), t.h * (0.6 + 0.4 * s), 1);
        t.mesh.rotation.set(-ptr.y * 0.08, ptr.x * 0.12 + Math.sin(time * 0.5 + i) * 0.03, 0);
        t.mat.uniforms.uAlpha.value = a;
        t.mat.uniforms.uTime.value = time;
        t.mat.uniforms.uSpeak.value = t.speak * (0.75 + 0.25 * Math.sin(time * 8));
      });
      const tl = tileLineGeo.attributes.position.array;
      tilePairs.forEach(([i, j], e) => {
        const a = tiles[i].mesh.position;
        const b = tiles[j].mesh.position;
        const o = e * 6;
        tl[o] = a.x; tl[o + 1] = a.y; tl[o + 2] = -0.02;
        tl[o + 3] = b.x; tl[o + 4] = b.y; tl[o + 5] = -0.02;
      });
      tileLineGeo.attributes.position.needsUpdate = true;
      tileLineMat.opacity = op.tileLine * K.tiles;

      const tpp = tilePackets.geometry.attributes.position.array;
      tpState.forEach((s, i) => {
        s.t += s.sp * dt * 0.6;
        if (s.t >= 1) { s.t -= 1; s.pair = Math.floor(Math.random() * tilePairs.length); s.dir = Math.random() > 0.5 ? 1 : 0; }
        const [ia, ib] = tilePairs[s.pair];
        const a = tiles[s.dir ? ia : ib].mesh.position;
        const b = tiles[s.dir ? ib : ia].mesh.position;
        tpp[i * 3] = lerp(a.x, b.x, s.t);
        tpp[i * 3 + 1] = lerp(a.y, b.y, s.t);
        tpp[i * 3 + 2] = 0.05;
      });
      tilePackets.geometry.attributes.position.needsUpdate = true;
      tpMat.uniforms.uOpacity.value = K.tiles;
    }

    renderer.render(scene, camera);
  }
  frame();

  return {
    setStage(v) {
      stageTarget = v;
      if (!stageInit) { stageCur = v; stageInit = true; }
    },
    addVelocity(v) {
      scrollVel = Math.min(scrollVel + Math.abs(v) * 0.04, 6);
    },
    setPointer(x, y) { ptrT.x = x; ptrT.y = y; },
    setTheme: applyTheme,
    pulse() { pulseT = 0; },
    setHighlight(layer) { nodeMat.uniforms.uHighlight.value = layer; },
    setSelf(st) {
      selfState.muted = !!st.muted;
      selfState.camOff = !!st.camOff;
      drawTile(tiles[0].cv, TILE_USERS[0], selfState);
      tiles[0].tex.needsUpdate = true;
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      disposables.forEach((d) => d.dispose && d.dispose());
      renderer.dispose();
    },
  };
}

/* ════════════════════════════════════════════════════════════════════════════
   PAGE COMPONENTS
   ════════════════════════════════════════════════════════════════════════════ */

const GLASS = 'bg-white/75 dark:bg-slate-900/60 backdrop-blur-2xl';
const FOCUS = 'outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';

const NAV = [
  { label: 'Features', stage: 1 },
  { label: 'Security', stage: 2 },
  { label: 'Video', stage: 3 },
  { label: 'Architecture', stage: 4 },
];
const STAGE_LABELS = ['Intro', 'Features', 'Security', 'Video', 'Architecture', 'Launch'];

const FEATURES = [
  { icon: ShieldCheck, title: 'End-to-End Encryption', body: 'AES-256 GCM via Web Crypto API. Messages are encrypted on your device before transmission.' },
  { icon: Video, title: 'HD Video Meetings', body: 'Peer-to-peer 1:1 calls and multi-participant group rooms powered by WebRTC.' },
  { icon: MessageSquare, title: 'Real-Time Channels', body: 'Socket.io engine with typing indicators, presence, and instant zero-latency delivery.' },
  { icon: Layout, title: 'Refined Interface', body: 'Apple HIG grouped inset design, dark and light appearance, and custom accent themes.' },
  { icon: Smartphone, title: 'Fully Responsive', body: 'Fluid drawer on mobile screens, side-by-side on desktop, touch-optimised UI.' },
  { icon: Zap, title: 'Zero-Knowledge Privacy', body: 'Private keys stay on your device. The server only ever sees opaque ciphertext.' },
];

const LAYERS = [
  { layer: 2, icon: Laptop, title: 'Client Layer', body: 'Keys are created and kept strictly in browser. Every message is encrypted locally before transmission.' },
  { layer: 1, icon: Radio, title: 'Relay Layer', body: 'Socket.io fans out events, typing and presence. Payloads pass through as unreadable ciphertext.' },
  { layer: 0, icon: Database, title: 'Storage Layer', body: 'The database holds ciphertext only. Without the client private key, data cannot be read.' },
];

/* ── Interactive Cipher Playground ───────────────────────────────────────── */

function CipherCard() {
  const [text, setText] = useState('Hey team, the new design spec is ready!');
  const [cipher, setCipher] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const chars = '0123456789abcdef';
    const gen = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * 16)]).join('');
    let tick = 0;
    setCipher(gen(64));
    const id = setInterval(() => {
      tick += 1;
      if (tick % 25 < 6) setCipher(gen(64));
    }, 100);
    return () => clearInterval(id);
  }, [text]);

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(cipher);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`${GLASS} rounded-3xl p-6 space-y-4 shadow-xl shadow-indigo-500/[0.04] dark:shadow-black/40 border border-white/60 dark:border-white/[0.08]`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
          <Lock className="w-3.5 h-3.5 text-emerald-500" />
          <span>AES-256 GCM WebCrypto</span>
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
          Zero-Knowledge
        </span>
      </div>

      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
          Plaintext Input (Local Only)
        </div>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type to test live encryption..."
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
        />
      </div>

      <div className="h-px bg-slate-200/60 dark:bg-white/[0.06]" />

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Ciphertext Stream (Server Stores)
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 flex items-center space-x-1 cursor-pointer transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied!' : 'Copy hex'}</span>
          </button>
        </div>
        <p className="font-mono text-xs break-all leading-relaxed text-emerald-700 dark:text-emerald-300/90 bg-emerald-500/5 dark:bg-emerald-500/[0.05] p-3 rounded-xl border border-emerald-500/20">
          {cipher}
        </p>
      </div>
    </div>
  );
}

/* ── Scroll Reveal Hook ──────────────────────────────────────────────────── */

function useReveal() {
  const refs = useRef([]);
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      refs.current.forEach((el) => el?.classList.add('is-visible'));
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    refs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);
  const addRef = (el) => { if (el && !refs.current.includes(el)) refs.current.push(el); };
  return addRef;
}

/* ── Main Landing Page Component ─────────────────────────────────────────── */

export default function LandingPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const isDarkRef = useRef(isDark);
  const sectionRefs = useRef([]);
  const progressRef = useRef(null);
  const lastScrollY = useRef(0);
  const [active, setActive] = useState(0);
  const [webglOk, setWebglOk] = useState(true);
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);

  const reveal = useReveal();
  isDarkRef.current = isDark;

  const handleLaunchApp = () => navigate(user ? '/app' : '/signup');
  const reg = (i) => (el) => { sectionRefs.current[i] = el; };
  const go = (i) => sectionRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  /* Create 3D Scene */
  useEffect(() => {
    let api;
    try {
      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      api = createPulseScene(canvasRef.current, { isDark: isDarkRef.current, reduceMotion: reduce });
      sceneRef.current = api;
      setReady(true);
    } catch (err) {
      console.warn('PulseChat: WebGL unavailable, showing static background.', err);
      setWebglOk(false);
    }
    return () => { api?.dispose(); sceneRef.current = null; };
  }, []);

  useEffect(() => { sceneRef.current?.setTheme(isDark); }, [isDark]);
  useEffect(() => { sceneRef.current?.setSelf({ muted, camOff }); }, [muted, camOff]);

  /* Scroll stage computation */
  const computeStage = useCallback(() => {
    const els = sectionRefs.current.filter(Boolean);
    if (els.length < 2) return 0;
    const mid = window.scrollY + window.innerHeight * 0.5;
    const c = els.map((el) => { const r = el.getBoundingClientRect(); return r.top + window.scrollY + r.height / 2; });
    if (mid <= c[0]) return 0;
    for (let i = 0; i < c.length - 1; i++) {
      if (mid < c[i + 1]) return i + (mid - c[i]) / (c[i + 1] - c[i]);
    }
    return c.length - 1;
  }, []);

  useEffect(() => {
    let ticking = false;
    const update = () => {
      ticking = false;
      const s = computeStage();
      sceneRef.current?.setStage(s);

      const dy = Math.abs(window.scrollY - lastScrollY.current);
      lastScrollY.current = window.scrollY;
      sceneRef.current?.addVelocity(dy);

      const idx = Math.round(s);
      setActive((prev) => (prev === idx ? prev : idx));
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, [computeStage, ready]);

  /* Pointer parallax */
  useEffect(() => {
    const onMove = (e) => {
      sceneRef.current?.setPointer((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    };
    const onDown = (e) => {
      if (e.target.closest && e.target.closest('a,button,input,[data-nopulse]')) return;
      sceneRef.current?.pulse();
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerdown', onDown); };
  }, []);

  const highlight = (layer) => sceneRef.current?.setHighlight(layer);

  return (
    <div className="relative min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 transition-colors selection:bg-[#312E81] selection:text-white font-sans pc-grid-bg">
      <style>{`
        @keyframes pc-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes pc-cue { 0%,100% { transform: translateY(0); opacity: .5; } 50% { transform: translateY(5px); opacity: 1; } }
        .pc-float { animation: pc-float 6s ease-in-out infinite; }
        .pc-cue { animation: pc-cue 2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .pc-float, .pc-cue { animation: none; } }
      `}</style>

      {/* Fixed WebGL 3D stage */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={`fixed inset-0 w-full h-full z-0 pointer-events-none transition-opacity duration-1000 ${ready ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#0B0F19]/80 backdrop-blur-2xl px-4 sm:px-8 py-3 flex items-center justify-between transition-colors border-b border-slate-200/40 dark:border-white/[0.05]">
        <button type="button" className={`flex items-center space-x-3 cursor-pointer rounded-2xl ${FOCUS}`} onClick={() => go(0)} aria-label="PulseChat home">
          <div className="w-9 h-9 rounded-2xl pulse-gradient-bg flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
            <Activity className="w-[18px] h-[18px]" />
          </div>
          <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-50">PulseChat</span>
        </button>

        <nav className="hidden md:flex items-center space-x-8 text-xs font-bold text-slate-500 dark:text-slate-400" aria-label="Sections">
          {NAV.map((n) => (
            <button
              key={n.stage}
              type="button"
              onClick={() => go(n.stage)}
              className={`cursor-pointer transition-colors hover:text-slate-900 dark:hover:text-white rounded ${FOCUS} ${active === n.stage ? 'text-slate-900 dark:text-white font-extrabold' : ''}`}
            >
              {n.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-all cursor-pointer ${FOCUS}`}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </button>

          {user ? (
            <button
              onClick={() => navigate('/app')}
              className={`pc-shimmer-btn px-5 py-2 rounded-xl bg-pulse-blue hover:bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all flex items-center space-x-2 cursor-pointer ${FOCUS}`}
            >
              <span>Open App</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <>
              <Link to="/login" className={`px-3 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors rounded-xl ${FOCUS}`}>
                Log In
              </Link>
              <button
                onClick={() => navigate('/signup')}
                className={`pc-shimmer-btn px-5 py-2 rounded-xl bg-pulse-blue hover:bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all flex items-center space-x-1.5 cursor-pointer ${FOCUS}`}
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Multi-color gradient scroll bar */}
        <div className="absolute left-0 right-0 bottom-0 h-[2px] overflow-hidden pointer-events-none">
          <div ref={progressRef} className="h-full w-full origin-left bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 opacity-80" style={{ transform: 'scaleX(0)' }} />
        </div>
      </header>

      {/* Floating stage quick-nav */}
      <nav className="hidden lg:flex fixed right-5 top-1/2 -translate-y-1/2 z-30 flex-col items-end gap-3" aria-label="Page position">
        {STAGE_LABELS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => go(i)}
            className={`group flex items-center gap-2.5 cursor-pointer rounded-full ${FOCUS}`}
            aria-label={label}
            aria-current={active === i ? 'true' : undefined}
          >
            <span className={`text-[11px] font-semibold transition-opacity text-slate-400 dark:text-slate-500 ${active === i ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'}`}>
              {label}
            </span>
            <span className={`block rounded-full transition-all ${active === i ? 'w-2.5 h-2.5 bg-pulse-blue shadow-[0_0_12px_2px_rgba(99,102,241,0.6)]' : 'w-1.5 h-1.5 bg-slate-300 dark:bg-slate-700'}`} />
          </button>
        ))}
      </nav>

      <main className="relative z-10">
        {/* ── 0 · HERO SECTION ─────────────────────────────────────────── */}
        <section ref={reg(0)} id="hero" className="min-h-screen px-4 sm:px-8 pt-28 pb-20 max-w-7xl mx-auto grid lg:grid-cols-2 items-center gap-12 relative">
          <div className="space-y-8 text-center lg:text-left">
            <div ref={reveal} className="lp-reveal inline-flex items-center space-x-2.5 px-4 py-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-400 text-[11px] font-bold border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              <span>End-to-End Encrypted • Zero Knowledge Architecture</span>
            </div>

            <h1 ref={reveal} className="lp-reveal text-[clamp(2.5rem,5.8vw,4.75rem)] font-extrabold tracking-[-0.035em] text-slate-900 dark:text-slate-50 leading-[1.04]">
              Team chat that<br /><span className="pc-gradient-text">stays private.</span>
            </h1>

            <p ref={reveal} className="lp-reveal text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-lg mx-auto lg:mx-0 font-medium leading-relaxed">
              PulseChat combines real-time messaging, zero-knowledge AES-256 GCM encryption, and HD multi-participant video calls in one seamless workspace.
            </p>

            <div ref={reveal} className="lp-reveal flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-1">
              <button
                onClick={handleLaunchApp}
                className={`pc-shimmer-btn w-full sm:w-auto px-8 py-4 rounded-2xl bg-pulse-blue hover:bg-indigo-600 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 transition-all flex items-center justify-center space-x-2.5 cursor-pointer group ${FOCUS}`}
              >
                <span>{user ? 'Open workspace' : 'Start chatting free'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              {!user && (
                <button
                  onClick={() => navigate('/login')}
                  className={`w-full sm:w-auto px-7 py-4 rounded-2xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 font-semibold text-sm transition-all cursor-pointer ${FOCUS}`}
                >
                  Log in to account
                </button>
              )}
            </div>

            <ul ref={reveal} className="lp-reveal pt-2 flex flex-wrap justify-center lg:justify-start items-center gap-x-6 gap-y-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
              {['AES-256 GCM Encrypted', 'WebRTC Peer-to-Peer', 'Zero-Knowledge Storage', 'Cross-Platform Ready'].map((t) => (
                <li key={t} className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500/80" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative hidden lg:block h-[540px]" data-nopulse-area>
            {!webglOk && (
              <div className="absolute inset-0 m-auto w-72 h-72 rounded-full pulse-gradient-bg opacity-40 blur-3xl" />
            )}
          </div>

          <button
            type="button"
            onClick={() => go(1)}
            className={`absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-300 dark:text-slate-600 cursor-pointer rounded-full p-2.5 hover:text-indigo-500 transition-colors ${FOCUS}`}
            aria-label="Scroll to features"
          >
            <ChevronDown className="w-6 h-6 pc-cue" />
          </button>
        </section>

        {/* ── 1 · FEATURES SECTION ─────────────────────────────────────── */}
        <section ref={reg(1)} id="features" className="min-h-screen px-4 sm:px-8 py-28 max-w-6xl mx-auto flex flex-col justify-center gap-14">
          <div ref={reveal} className="lp-reveal max-w-xl space-y-3">
            <div className="text-xs font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">Features</div>
            <h2 className="text-3xl sm:text-[2.75rem] font-extrabold tracking-[-0.03em] leading-[1.1]">
              Built for privacy,<br /><span className="pc-gradient-text">speed, and every screen.</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed">
              Web Crypto API, Socket.io, and WebRTC — running natively in the browser you already use.
            </p>
          </div>

          <div ref={reveal} className="lp-stagger grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="lp-reveal pc-card-3d p-7 rounded-3xl bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl border border-white/60 dark:border-white/[0.06] space-y-4">
                <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/[0.15] flex items-center justify-center text-indigo-500 shadow-inner">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h3>
                <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 2 · SECURITY SECTION ─────────────────────────────────────── */}
        <section ref={reg(2)} id="security" className="min-h-screen px-4 sm:px-8 py-28 max-w-7xl mx-auto grid lg:grid-cols-2 items-center gap-14">
          <div className="hidden lg:block" />
          <div className="space-y-8">
            <div ref={reveal} className="lp-reveal space-y-3">
              <div className="text-xs font-bold uppercase tracking-widest text-emerald-500 dark:text-emerald-400">Security</div>
              <h2 className="text-3xl sm:text-[2.75rem] font-extrabold tracking-[-0.03em] leading-[1.1]">
                Encrypted on your device.<br /><span className="pc-gradient-text-emerald">Unreadable everywhere else.</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg">
                AES-GCM through Web Crypto API. Keys never leave your device, so the server only stores ciphertext.
              </p>
            </div>

            <ol ref={reveal} className="lp-reveal space-y-4 max-w-lg">
              {[
                ['You type a message', 'Text or an image, typed into a channel or direct message.'],
                ['Device encrypts via WebCrypto', 'AES-256 GCM key generates ciphertext before transmission.'],
                ['Server stores ciphertext', 'Third parties cannot decrypt what the database holds.'],
              ].map(([t, d], i) => (
                <li key={t} className="flex items-start gap-4 p-3.5 rounded-2xl bg-white/40 dark:bg-white/[0.02] border border-white/40 dark:border-white/[0.04]">
                  <span className="w-7 h-7 shrink-0 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center shadow-sm">{i + 1}</span>
                  <div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{t}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{d}</div>
                  </div>
                </li>
              ))}
            </ol>

            <div ref={reveal} className="lp-reveal max-w-lg"><CipherCard /></div>
          </div>
        </section>

        {/* ── 3 · WEBRTC VIDEO SECTION ─────────────────────────────────── */}
        <section ref={reg(3)} id="webrtc" className="min-h-screen px-4 sm:px-8 pt-28 pb-12 max-w-5xl mx-auto flex flex-col justify-between gap-10">
          <div ref={reveal} className="lp-reveal text-center space-y-3 max-w-xl mx-auto">
            <div className="text-xs font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">WebRTC Video</div>
            <h2 className="text-3xl sm:text-[2.75rem] font-extrabold tracking-[-0.03em] leading-[1.1]">
              Start HD video calls directly from any channel.
            </h2>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed">
              1:1 calls and group rooms joined with a single click. The 3D video tiles above are live in WebGL.
            </p>
          </div>

          <div ref={reveal} className="lp-reveal flex flex-col items-center gap-3">
            <div className={`${GLASS} flex items-center gap-2 sm:gap-3 p-2.5 rounded-2xl shadow-xl shadow-black/[0.05] dark:shadow-black/40 border border-white/60 dark:border-white/[0.08]`} role="toolbar" aria-label="Meeting controls">
              <span className="hidden sm:inline-flex items-center px-4 text-xs font-semibold text-slate-400 dark:text-slate-400 border-r border-slate-200/60 dark:border-white/[0.08]">
                <span className="font-mono text-indigo-500 dark:text-indigo-400 font-bold">PULSE-8821</span>
              </span>
              <button
                type="button"
                onClick={() => setMuted((v) => !v)}
                aria-pressed={muted}
                aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
                className={`w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer transition-colors ${FOCUS} ${muted ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25' : 'bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/[0.1]'}`}
              >
                {muted ? <MicOff className="w-[18px] h-[18px]" /> : <Mic className="w-[18px] h-[18px]" />}
              </button>
              <button
                type="button"
                onClick={() => setCamOff((v) => !v)}
                aria-pressed={camOff}
                aria-label={camOff ? 'Turn camera on' : 'Turn camera off'}
                className={`w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer transition-colors ${FOCUS} ${camOff ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25' : 'bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/[0.1]'}`}
              >
                {camOff ? <VideoOff className="w-[18px] h-[18px]" /> : <Video className="w-[18px] h-[18px]" />}
              </button>

              {/* Audio waveform visualizer */}
              <div className="hidden md:flex items-end gap-0.5 h-4 px-2" aria-hidden="true">
                {[0.4, 0.8, 0.5, 0.9, 0.3].map((h, idx) => (
                  <span
                    key={idx}
                    className="w-1 bg-emerald-500 rounded-full animate-pulse"
                    style={{ height: `${h * 100}%`, animationDelay: `${idx * 150}ms` }}
                  />
                ))}
              </div>

              <span className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 flex items-center justify-center" title="6 participants">
                <Users className="w-[18px] h-[18px]" />
                <span className="sr-only">6 participants</span>
              </span>
              <button
                type="button"
                onClick={() => go(4)}
                aria-label="Leave call and continue"
                className={`w-11 h-11 rounded-xl bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center cursor-pointer transition-colors shadow-md shadow-rose-500/20 ${FOCUS}`}
              >
                <PhoneOff className="w-[18px] h-[18px]" />
              </button>
            </div>
          </div>
        </section>

        {/* ── 4 · ARCHITECTURE SECTION ─────────────────────────────────── */}
        <section ref={reg(4)} id="architecture" className="min-h-screen px-4 sm:px-8 py-28 max-w-7xl mx-auto grid lg:grid-cols-2 items-center gap-14">
          <div className="space-y-8">
            <div ref={reveal} className="lp-reveal space-y-3">
              <div className="text-xs font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">Architecture</div>
              <h2 className="text-3xl sm:text-[2.75rem] font-extrabold tracking-[-0.03em] leading-[1.1]">
                Keys stay on the client.<br /><span className="pc-gradient-text">Everything else sees ciphertext.</span>
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg">
                Hover over any layer to highlight its corresponding node structure in 3D.
              </p>
            </div>
            <div ref={reveal} className="lp-reveal space-y-3.5 max-w-lg" onMouseLeave={() => highlight(-1)}>
              {LAYERS.map(({ layer, icon: Icon, title, body }) => (
                <button
                  key={title}
                  type="button"
                  onMouseEnter={() => highlight(layer)}
                  onFocus={() => highlight(layer)}
                  onBlur={() => highlight(-1)}
                  onClick={() => highlight(layer)}
                  className={`${GLASS} pc-card-3d w-full text-left flex items-start gap-4 p-5 rounded-3xl cursor-pointer border border-white/60 dark:border-white/[0.06] hover:border-indigo-500/40 transition-colors ${FOCUS}`}
                >
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/[0.15] flex items-center justify-center text-indigo-500 shrink-0 mt-0.5 shadow-inner">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span>
                    <span className="block text-sm font-bold text-slate-900 dark:text-slate-100">{title}</span>
                    <span className="block text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">{body}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="hidden lg:block" />
        </section>

        {/* ── 5 · LAUNCH SECTION ───────────────────────────────────────── */}
        <section ref={reg(5)} id="launch" className="min-h-screen flex flex-col justify-between relative">
          <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-28 relative">
            <div className="absolute inset-0 m-auto w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl pc-glow-orb pointer-events-none" />
            <div ref={reveal} className="lp-reveal-scale max-w-2xl text-center space-y-8 relative z-10 p-10 rounded-3xl bg-white/40 dark:bg-white/[0.02] backdrop-blur-2xl border border-white/50 dark:border-white/[0.05] shadow-2xl">
              <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Zero configuration required</span>
              </div>
              <h2 className="text-3xl sm:text-[3rem] font-extrabold tracking-[-0.03em] leading-[1.08] text-slate-900 dark:text-slate-50">
                Ready to try <span className="pc-gradient-text">PulseChat?</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                Launch your private workspace in seconds. No plugins, no setup, just your browser.
              </p>
              <button
                onClick={handleLaunchApp}
                className={`pc-shimmer-btn px-8 py-4 rounded-2xl bg-pulse-blue hover:bg-indigo-600 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 transition-all inline-flex items-center space-x-2.5 cursor-pointer ${FOCUS}`}
              >
                <span>{user ? 'Open workspace' : 'Launch free workspace'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <footer className="bg-white/70 dark:bg-[#0B0F19]/70 backdrop-blur-2xl px-4 sm:px-8 py-5 text-xs font-semibold text-slate-400 dark:text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200/40 dark:border-white/[0.05]">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-pulse-blue" />
              <span className="font-extrabold text-slate-700 dark:text-slate-200">PulseChat</span>
              <span>© 2026</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="w-2 h-2 rounded-full bg-emerald-500 -ml-4" />
              <span className="text-slate-600 dark:text-slate-300 font-bold">All systems operational</span>
            </div>
          </footer>
        </section>
      </main>
    </div>
  );
}
