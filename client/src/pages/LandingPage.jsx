import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Copy,
  Check,
  Video,
} from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import * as THREE from 'three';
import { useAuth } from '../context/AuthContext';
import { warmupServer } from '../config/api';

gsap.registerPlugin(ScrollTrigger);

/* ── 1. PRELOADER: CINEMATIC TITLE SEQUENCE (1.5 - 2.0s) ─────────────── */
function Preloader({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [taglineIndex, setTaglineIndex] = useState(0);
  const preloaderRef = useRef(null);
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const lineRef = useRef(null);

  const taglines = [
    'A CONVERSATION STARTS HERE.',
    'DIRECT BY DESIGN.',
    'BUILT AROUND PEOPLE.',
    'PRIVACY, WITHOUT THE NOISE.',
  ];

  useEffect(() => {
    const valObj = { value: 0 };
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.to(preloaderRef.current, {
          yPercent: -100,
          duration: 1.2,
          ease: 'power4.inOut',
          onComplete: () => {
            if (onComplete) onComplete();
          },
        });
      },
    });

    tl.to(valObj, {
      value: 100,
      duration: 1.6,
      ease: 'power3.inOut',
      onUpdate: () => {
        const val = Math.floor(valObj.value);
        setProgress(val);
        if (val > 75) setTaglineIndex(3);
        else if (val > 50) setTaglineIndex(2);
        else if (val > 25) setTaglineIndex(1);
      },
    });

    gsap.fromTo(
      titleRef.current,
      { y: '110%' },
      { y: '0%', duration: 1.0, ease: 'power4.out' }
    );
    gsap.fromTo(
      subtitleRef.current,
      { y: '110%' },
      { y: '0%', duration: 1.0, delay: 0.1, ease: 'power4.out' }
    );
    gsap.fromTo(
      lineRef.current,
      { scaleX: 0 },
      { scaleX: 1, duration: 1.2, ease: 'power3.inOut', transformOrigin: 'left' }
    );

    return () => {
      tl.kill();
    };
  }, [onComplete]);

  return (
    <div
      ref={preloaderRef}
      className="fixed inset-0 z-50 bg-[#0B0B0B] text-[#F2F0EA] flex flex-col justify-between p-8 sm:p-16 font-sans select-none overflow-hidden"
    >
      <div className="flex justify-between items-baseline border-b border-[rgba(255,255,255,0.12)] pb-4 text-xs font-mono tracking-widest text-[#8B8B86] uppercase">
        <span>PULSECHAT</span>
        <span>EDITORIAL / 2026</span>
      </div>

      <div className="my-auto max-w-5xl space-y-6">
        <span className="text-xs font-mono text-[#C4F135] tracking-widest uppercase block transition-all">
          // {taglines[taglineIndex]}
        </span>
        <div className="overflow-hidden">
          <h1
            ref={titleRef}
            className="text-6xl sm:text-8xl lg:text-9xl font-black uppercase tracking-tighter text-white leading-none block"
          >
            PULSECHAT
          </h1>
        </div>
        <div className="overflow-hidden">
          <h2
            ref={subtitleRef}
            className="text-3xl sm:text-6xl font-light text-[#8B8B86] font-serif italic lowercase tracking-tight block"
          >
            private communication. reconsidered.
          </h2>
        </div>
        <div
          ref={lineRef}
          className="w-full h-0.5 bg-gradient-to-r from-[#C4F135] via-[#8B8B86] to-transparent my-6"
        />
      </div>

      <div className="border-t border-[rgba(255,255,255,0.12)] pt-6 flex justify-between items-end">
        <div>
          <span className="text-xs font-mono text-[#8B8B86] block mb-1">LOADING EXPERIENCE</span>
          <span className="text-3xl font-mono font-bold text-[#F2F0EA]">
            {String(progress).padStart(3, '0')} <span className="text-[#C4F135] text-xl">%</span>
          </span>
        </div>
        <div className="w-48 bg-[#151515] h-1 border border-[rgba(255,255,255,0.1)] overflow-hidden hidden sm:block">
          <div
            className="bg-[#C4F135] h-full transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/* ── 2. THREE.JS ABSTRACT SIGNAL TOPOLOGY CANVAS ────────────────────── */
function AbstractSignalCanvas() {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const cols = 44;
    const rows = 44;
    const count = cols * rows;
    const positions = new Float32Array(count * 3);

    let i = 0;
    for (let ix = 0; ix < cols; ix++) {
      for (let iy = 0; iy < rows; iy++) {
        positions[i] = (ix - cols / 2) * 0.18;
        positions[i + 1] = 0;
        positions[i + 2] = (iy - rows / 2) * 0.18;
        i += 3;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xf2f0ea,
      size: 0.035,
      transparent: true,
      opacity: 0.4,
    });

    const particles = new THREE.Points(geometry, material);
    particles.rotation.x = 0.85;
    particles.rotation.z = -0.3;
    scene.add(particles);

    const lineGeo = new THREE.IcosahedronGeometry(1.8, 2);
    const lineMat = new THREE.MeshBasicMaterial({
      color: 0xc4f135,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    });
    const networkSphere = new THREE.Mesh(lineGeo, lineMat);
    networkSphere.position.set(1.6, 0.2, 0);
    scene.add(networkSphere);

    let animationFrameId;
    let step = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      step += 0.02;

      const pos = geometry.attributes.position.array;
      let ptr = 0;
      for (let ix = 0; ix < cols; ix++) {
        for (let iy = 0; iy < rows; iy++) {
          pos[ptr + 1] =
            Math.sin((ix + step) * 0.25) * 0.3 +
            Math.cos((iy + step) * 0.25) * 0.3;
          ptr += 3;
        }
      }
      geometry.attributes.position.needsUpdate = true;

      networkSphere.rotation.x += 0.0015;
      networkSphere.rotation.y += 0.0025;

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      lineGeo.dispose();
      lineMat.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 pointer-events-none z-0 opacity-70"
    />
  );
}

/* ── 3. EDITORIAL CURSOR WITH CONTEXT LABELS ─────────────────────────── */
function EditorialCursor() {
  const cursorRef = useRef(null);
  const [cursorText, setCursorText] = useState('');
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    if (window.matchMedia('(pointer: coarse)').matches) return;

    let mouseX = 0;
    let mouseY = 0;
    let ballX = 0;
    let ballY = 0;

    const onMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      const target = e.target.closest('[data-cursor]');
      if (target) {
        setCursorText(target.getAttribute('data-cursor') || 'VIEW');
        setIsHovered(true);
      } else {
        setIsHovered(false);
      }
    };

    window.addEventListener('mousemove', onMouseMove);

    let rafId;
    const render = () => {
      ballX += (mouseX - ballX) * 0.18;
      ballY += (mouseY - ballY) * 0.18;
      gsap.set(cursor, {
        x: ballX,
        y: ballY,
      });
      rafId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      className={`hidden lg:flex fixed top-0 left-0 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 items-center justify-center transition-all duration-300 ${isHovered
        ? 'w-20 h-20 bg-[#F2F0EA] text-[#0B0B0B] rounded-full shadow-2xl scale-100'
        : 'w-4 h-4 bg-[#F2F0EA] rounded-full opacity-60 scale-75'
        }`}
    >
      {isHovered && (
        <span className="text-[10px] font-mono font-black uppercase tracking-widest text-[#0B0B0B]">
          {cursorText}
        </span>
      )}
    </div>
  );
}

/* ── 4. REUSABLE LINE-DRAW SECTION HEADER ────────────────────────────── */
function LineDrawSectionHeader({ number, subtitle, isLight = false }) {
  const containerRef = useRef(null);
  const lineRef = useRef(null);
  const numberRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 85%',
        },
      });

      tl.fromTo(
        lineRef.current,
        { scaleX: 0 },
        { scaleX: 1, duration: 1.0, ease: 'power3.inOut', transformOrigin: 'left' }
      ).fromTo(
        numberRef.current,
        { y: '-100%', opacity: 0 },
        { y: '0%', opacity: 1, duration: 0.6, ease: 'power3.out' },
        '-=0.5'
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="space-y-4 w-full">
      <div className="flex justify-between items-baseline font-mono text-xs uppercase tracking-widest">
        <div className="overflow-hidden">
          <span
            ref={numberRef}
            className={`block font-bold ${isLight ? 'text-[#0B0B0B]' : 'text-[#C4F135]'
              }`}
          >
            {number}
          </span>
        </div>
        <span className="text-[#8B8B86]">{subtitle}</span>
      </div>

      <div
        ref={lineRef}
        className={`w-full h-[1px] ${isLight
          ? 'bg-[rgba(11,11,11,0.2)]'
          : 'bg-[rgba(255,255,255,0.14)]'
          }`}
      />
    </div>
  );
}

/* ── 5. PEER TO PEER NODE ANIMATION STORY (SECTION 10) ────────────────── */
function PeerToPeerVisual() {
  const containerRef = useRef(null);
  const nodeARef = useRef(null);
  const nodeBRef = useRef(null);
  const lineRef = useRef(null);
  const signalRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 75%',
        },
      });

      tl.fromTo(
        nodeARef.current,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.7)' }
      )
        .fromTo(
          nodeBRef.current,
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.7)' },
          '-=0.3'
        )
        .fromTo(
          lineRef.current,
          { scaleX: 0 },
          { scaleX: 1, duration: 1.0, ease: 'power3.inOut', transformOrigin: 'left' },
          '-=0.2'
        )
        .fromTo(
          signalRef.current,
          { x: '-100%', opacity: 0 },
          { x: '100%', opacity: 1, duration: 1.5, repeat: -1, ease: 'power1.inOut' }
        );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="p-10 bg-[#151515] border border-[rgba(255,255,255,0.14)] relative overflow-hidden font-mono text-xs my-8"
    >
      <div className="flex justify-between items-center text-[#8B8B86] border-b border-[rgba(255,255,255,0.1)] pb-3 mb-12">
        <span>PEER SIGNAL DYNAMICS</span>
        <span className="text-[#C4F135]">DIRECT CHANNEL</span>
      </div>

      <div className="relative flex justify-between items-center py-12 px-6 sm:px-16">
        <div
          ref={nodeARef}
          className="w-16 h-16 rounded-full bg-[#0B0B0B] border border-[#C4F135] flex items-center justify-center font-bold text-white z-10 shadow-xl"
        >
          PEER A
        </div>

        {/* Connecting Line & Signal Pulse */}
        <div className="flex-1 mx-6 relative h-[2px] bg-[rgba(255,255,255,0.15)] overflow-hidden">
          <div
            ref={lineRef}
            className="w-full h-full bg-gradient-to-r from-[#C4F135] via-white to-[#C4F135]"
          />
          <div
            ref={signalRef}
            className="absolute top-0 bottom-0 w-24 bg-gradient-to-r from-transparent via-[#C4F135] to-transparent"
          />
        </div>

        <div
          ref={nodeBRef}
          className="w-16 h-16 rounded-full bg-[#0B0B0B] border border-[rgba(255,255,255,0.3)] flex items-center justify-center font-bold text-white z-10 shadow-xl"
        >
          PEER B
        </div>
      </div>

      <div className="flex justify-between text-[11px] text-[#8B8B86] border-t border-[rgba(255,255,255,0.1)] pt-4">
        <span>WEBRTC ICE DISCOVERY</span>
        <span>DIRECT PATH FOUND</span>
      </div>
    </div>
  );
}

/* ── 6. ENCRYPTION AT SOURCE STORY (SECTION 11) ──────────────────────── */
function EncryptionVisual() {
  const containerRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.enc-step',
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.15,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 80%',
          },
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="p-8 sm:p-12 bg-[#151515] border border-[rgba(255,255,255,0.14)] font-mono text-xs my-8 space-y-6"
    >
      <div className="flex justify-between items-center text-[#8B8B86] border-b border-[rgba(255,255,255,0.1)] pb-3">
        <span>SOURCE ENCRYPTION FLOW</span>
        <span className="text-[#C4F135]">CLIENT-SIDE AES</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-4 text-center">
        <div className="enc-step p-4 bg-[#0B0B0B] border border-[rgba(255,255,255,0.1)]">
          <span className="text-[#C4F135] font-bold block mb-1">01</span>
          <span className="text-white font-bold block">MESSAGE</span>
        </div>
        <div className="enc-step p-4 bg-[#0B0B0B] border border-[rgba(255,255,255,0.1)]">
          <span className="text-[#C4F135] font-bold block mb-1">02</span>
          <span className="text-white font-bold block">ENCRYPT</span>
        </div>
        <div className="enc-step p-4 bg-[#0B0B0B] border border-[#C4F135]">
          <span className="text-[#C4F135] font-bold block mb-1">03</span>
          <span className="text-white font-bold block">TRANSMIT</span>
        </div>
        <div className="enc-step p-4 bg-[#0B0B0B] border border-[rgba(255,255,255,0.1)]">
          <span className="text-[#C4F135] font-bold block mb-1">04</span>
          <span className="text-white font-bold block">RECEIVE</span>
        </div>
        <div className="enc-step p-4 bg-[#0B0B0B] border border-[rgba(255,255,255,0.1)] col-span-2 sm:col-span-1">
          <span className="text-[#C4F135] font-bold block mb-1">05</span>
          <span className="text-white font-bold block">DECRYPT</span>
        </div>
      </div>
    </div>
  );
}

/* ── 7. "THE TECHNOLOGY DISAPPEARS" MOMENT (SECTION 14) ───────────────── */
function TechnologyDisappearsSection() {
  const containerRef = useRef(null);
  const termsRef = useRef(null);
  const helloRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top top',
          end: '+=1200',
          pin: true,
          scrub: 1,
        },
      });

      // Terms fill viewport -> progressively fade away -> leaving HELLO.
      tl.to(termsRef.current, {
        opacity: 0,
        filter: 'blur(16px)',
        scale: 0.85,
        duration: 1,
      }).fromTo(
        helloRef.current,
        { opacity: 0, scale: 1.2 },
        { opacity: 1, scale: 1, duration: 1 },
        '-=0.5'
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen bg-[#0B0B0B] border-b border-[rgba(255,255,255,0.12)] flex items-center justify-center overflow-hidden px-6 text-center select-none"
    >
      {/* Jargon Wall that Fades Out */}
      <div
        ref={termsRef}
        className="absolute inset-0 flex flex-wrap items-center justify-center p-12 gap-8 text-2xl sm:text-4xl font-mono font-bold text-[rgba(255,255,255,0.15)] uppercase pointer-events-none"
      >
        <span>WEBRTC</span>
        <span>ICE CANDIDATES</span>
        <span>AES-GCM-256</span>
        <span>SDP HANDSHAKE</span>
        <span>MEDIA MESH</span>
        <span>SIGNAL SOCKET</span>
        <span>CLIENT MEMORY</span>
        <span>SRTP STREAM</span>
        <span>LATENCY OPTIMIZED</span>
      </div>

      {/* Result: HELLO. */}
      <div ref={helloRef} className="z-10 space-y-4">
        <h2 className="text-7xl sm:text-9xl font-black uppercase tracking-tighter text-white">
          HELLO.
        </h2>
        <p className="text-lg text-[#8B8B86] font-serif italic max-w-md mx-auto">
          When the technology disappears, the conversation remains.
        </p>
      </div>
    </div>
  );
}

/* ── 8. FINAL CTA REVEAL SEQUENCE (SECTION 34) ────────────────────────── */
function FinalCTASequence({ onLaunch }) {
  const containerRef = useRef(null);
  const talkRef = useRef(null);
  const directlyRef = useRef(null);
  const subtextRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 75%',
        },
      });

      tl.fromTo(
        talkRef.current,
        { y: '110%' },
        { y: '0%', duration: 0.9, ease: 'power4.out' }
      )
        .fromTo(
          directlyRef.current,
          { y: '-110%', opacity: 0 },
          { y: '0%', opacity: 1, duration: 0.9, ease: 'power4.out' },
          '-=0.5'
        )
        .fromTo(
          subtextRef.current,
          { y: 16, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' },
          '-=0.3'
        )
        .fromTo(
          buttonRef.current,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' },
          '-=0.4'
        );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="py-40 px-6 sm:px-12 bg-[#F2F0EA] text-[#0B0B0B] border-b border-[#0B0B0B] overflow-hidden"
    >
      <div className="max-w-6xl mx-auto text-center space-y-10">
        <span className="text-xs font-mono font-bold text-[#4A4A46] uppercase tracking-widest block">
          06 / TAKE ACTION
        </span>

        <div className="space-y-2">
          <div className="overflow-hidden">
            <h2
              ref={talkRef}
              className="text-6xl sm:text-8xl lg:text-9xl font-black uppercase tracking-tighter text-[#0B0B0B] leading-[0.88] block"
            >
              TALK
            </h2>
          </div>
          <div className="overflow-hidden">
            <h2
              ref={directlyRef}
              className="text-6xl sm:text-8xl lg:text-9xl font-black uppercase tracking-tighter text-[#4A4A46] leading-[0.88] block italic font-serif"
            >
              DIRECTLY.
            </h2>
          </div>
        </div>

        <div ref={subtextRef} className="space-y-2">
          <p className="text-base sm:text-xl text-[#4A4A46] max-w-xl mx-auto font-medium leading-relaxed">
            No unnecessary friction.
          </p>
          <p className="text-base sm:text-xl text-[#4A4A46] max-w-xl mx-auto font-medium leading-relaxed">
            Just the conversation.
          </p>
        </div>

        <div ref={buttonRef} className="pt-6 font-mono text-xs">
          <button
            onClick={onLaunch}
            className="px-12 py-5 bg-[#0B0B0B] hover:bg-[#C4F135] text-[#F2F0EA] hover:text-[#0B0B0B] font-bold uppercase tracking-widest transition-all inline-flex items-center space-x-3 cursor-pointer shadow-xl"
            data-cursor="ENTER"
          >
            <span>ENTER PULSECHAT</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ── 9. MAIN LANDING PAGE COMPONENT ──────────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    warmupServer();
  }, []);

  const [showPreloader, setShowPreloader] = useState(true);

  const horizontalSectionRef = useRef(null);
  const horizontalTrackRef = useRef(null);

  const heroTagRef = useRef(null);
  const heroLine1Ref = useRef(null);
  const heroLine2Ref = useRef(null);
  const heroLine3Ref = useRef(null);
  const heroParaRef = useRef(null);
  const heroCtaRef = useRef(null);
  const heroBgDriftRef = useRef(null);

  const secondHeroRef = useRef(null);
  const introLine1Ref = useRef(null);
  const introLine2Ref = useRef(null);
  const introParaRef = useRef(null);

  const protocolText1Ref = useRef(null);
  const protocolText2Ref = useRef(null);
  const protocolText3Ref = useRef(null);

  const footerTitleRef = useRef(null);
  const footerNavRef = useRef(null);
  const footerMetaRef = useRef(null);

  // Interactive Demo State
  const [demoActive, setDemoActive] = useState(false);
  const [demoConnecting, setDemoConnecting] = useState(false);
  const demoRoomCode = 'PULSE-8821';
  const [demoCopied, setDemoCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('video');

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.3,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.7,
    });

    lenis.on('scroll', (e) => {
      ScrollTrigger.update();
      const velocity = e.velocity || 0;
      const velocityTexts = document.querySelectorAll('.velocity-text');
      velocityTexts.forEach((el) => {
        gsap.to(el, {
          letterSpacing: `${Math.min(Math.abs(velocity) * 0.015, 0.15)}em`,
          duration: 0.2,
          ease: 'power1.out',
        });
      });
    });

    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const ctx = gsap.context(() => {
      if (!showPreloader) {
        // Hero Staged Entrance (Section 30)
        const heroTl = gsap.timeline({ delay: 0.2 });

        heroTl
          .fromTo(
            heroTagRef.current,
            { x: -16, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }
          )
          .fromTo(
            heroLine1Ref.current,
            { y: '110%' },
            { y: '0%', duration: 1.0, ease: 'power4.out' },
            '-=0.3'
          )
          .fromTo(
            heroLine2Ref.current,
            { y: '110%' },
            { y: '0%', duration: 1.0, ease: 'power4.out' },
            '-=0.75'
          )
          .fromTo(
            heroLine3Ref.current,
            { y: '110%' },
            { y: '0%', duration: 1.0, ease: 'power4.out' },
            '-=0.75'
          )
          .fromTo(
            heroParaRef.current,
            { y: 16, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' },
            '-=0.5'
          )
          .fromTo(
            heroCtaRef.current,
            { y: 16, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' },
            '-=0.6'
          );

        if (heroBgDriftRef.current) {
          gsap.fromTo(
            heroBgDriftRef.current,
            { x: -60 },
            {
              x: 60,
              ease: 'none',
              scrollTrigger: {
                trigger: heroBgDriftRef.current,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 0.8,
              },
            }
          );
        }
      }

      // Second Hero Statement Pause (Section 5)
      if (secondHeroRef.current) {
        gsap.fromTo(
          secondHeroRef.current,
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: secondHeroRef.current,
              start: 'top 80%',
            },
          }
        );
      }

      // Introduction Section (Section 6)
      if (introLine1Ref.current && introLine2Ref.current) {
        const introTl = gsap.timeline({
          scrollTrigger: {
            trigger: introLine1Ref.current,
            start: 'top 80%',
          },
        });

        introTl
          .fromTo(
            introLine1Ref.current,
            { y: '110%' },
            { y: '0%', duration: 1.0, ease: 'power4.out' }
          )
          .fromTo(
            introLine2Ref.current,
            { y: '110%' },
            { y: '0%', duration: 1.0, ease: 'power4.out' },
            '-=0.8'
          )
          .fromTo(
            introParaRef.current,
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' },
            '-=0.5'
          );
      }

      // Horizontal Anatomy Exhibition (Section 13)
      if (horizontalTrackRef.current && horizontalSectionRef.current) {
        const track = horizontalTrackRef.current;
        const totalWidth = track.scrollWidth - window.innerWidth;

        if (totalWidth > 0) {
          gsap.to(track, {
            x: -totalWidth,
            ease: 'none',
            scrollTrigger: {
              trigger: horizontalSectionRef.current,
              pin: true,
              scrub: 1,
              end: () => `+=${totalWidth + 400}`,
              invalidateOnRefresh: true,
            },
          });
        }
      }

      // Protocol Section (Section 17)
      if (protocolText1Ref.current) {
        const protTl = gsap.timeline({
          scrollTrigger: {
            trigger: protocolText1Ref.current,
            start: 'top 80%',
          },
        });

        protTl
          .fromTo(
            protocolText1Ref.current,
            { y: '110%' },
            { y: '0%', duration: 0.9, ease: 'power4.out' }
          )
          .fromTo(
            protocolText2Ref.current,
            { y: '110%' },
            { y: '0%', duration: 0.9, ease: 'power4.out' },
            '-=0.7'
          )
          .fromTo(
            protocolText3Ref.current,
            { y: '110%' },
            { y: '0%', duration: 0.9, ease: 'power4.out' },
            '-=0.7'
          );
      }

      // Footer Calm Reveal (Section 35)
      if (footerTitleRef.current) {
        const footerTl = gsap.timeline({
          scrollTrigger: {
            trigger: footerTitleRef.current,
            start: 'top 90%',
          },
        });

        footerTl
          .fromTo(
            footerTitleRef.current,
            { scale: 1.1, opacity: 0 },
            { scale: 1, opacity: 1, duration: 1.0, ease: 'power3.out' }
          )
          .fromTo(
            footerNavRef.current,
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' },
            '-=0.5'
          )
          .fromTo(
            footerMetaRef.current,
            { opacity: 0 },
            { opacity: 1, duration: 0.8, ease: 'power3.out' },
            '-=0.4'
          );
      }

      gsap.utils.toArray('.editorial-reveal').forEach((el) => {
        gsap.fromTo(
          el,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 85%',
            },
          }
        );
      });
    });

    return () => {
      gsap.ticker.remove(tick);
      ctx.revert();
      lenis.destroy();
    };
  }, [showPreloader]);

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(demoRoomCode);
    setDemoCopied(true);
    setTimeout(() => setDemoCopied(false), 2000);
  };

  const handleStartDemoToggle = () => {
    if (!demoActive) {
      setDemoConnecting(true);
      setTimeout(() => {
        setDemoConnecting(false);
        setDemoActive(true);
      }, 800);
    } else {
      setDemoActive(false);
    }
  };

  const handleLaunch = () => {
    if (user) {
      navigate('/app');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-[#F2F0EA] font-sans selection:bg-[#C4F135] selection:text-[#0B0B0B] antialiased overflow-x-hidden relative">
      <EditorialCursor />

      {showPreloader && (
        <Preloader onComplete={() => setShowPreloader(false)} />
      )}

      {/* ── NAVIGATION ────────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-40 bg-[#0B0B0B]/80 border-b border-[rgba(255,255,255,0.08)] backdrop-blur-xs">
        <div className="max-w-7xl mx-auto px-6 sm:px-12 h-20 flex items-center justify-between">
          <div
            onClick={() => navigate('/')}
            className="flex items-center space-x-3 cursor-pointer group"
            data-cursor="PULSE"
          >
            <span className="font-mono font-black text-xl text-[#F2F0EA] tracking-tighter uppercase">
              PULSE<span className="text-[#C4F135]">CHAT</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center space-x-12 text-xs font-mono text-[#8B8B86] uppercase tracking-widest">
            <a href="#intro" className="hover:text-[#F2F0EA] transition-colors">
              Product
            </a>
            <a href="#system" className="hover:text-[#F2F0EA] transition-colors">
              Technology
            </a>
            <a href="#anatomy" className="hover:text-[#F2F0EA] transition-colors">
              Architecture
            </a>
            <a href="#session" className="hover:text-[#F2F0EA] transition-colors">
              Experience
            </a>
          </nav>

          <div className="flex items-center space-x-6 font-mono text-xs">
            {!user && (
              <button
                onClick={() => navigate('/login')}
                className="text-[#8B8B86] hover:text-[#F2F0EA] uppercase tracking-widest transition-colors cursor-pointer"
                data-cursor="SIGN IN"
              >
                Sign In
              </button>
            )}
            <button
              onClick={handleLaunch}
              className="px-5 py-2.5 bg-transparent border border-[rgba(255,255,255,0.2)] hover:border-[#C4F135] text-[#F2F0EA] hover:text-[#C4F135] uppercase tracking-widest text-[11px] font-bold transition-all flex items-center space-x-2 cursor-pointer"
              data-cursor="LAUNCH"
            >
              <span>{user ? 'Enter App' : 'Enter PulseChat'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO SECTION (SECTION 4) ────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col justify-between pt-32 pb-16 px-6 sm:px-12 border-b border-[rgba(255,255,255,0.12)] overflow-hidden">
        <AbstractSignalCanvas />

        <div
          ref={heroBgDriftRef}
          className="absolute top-1/4 left-0 -translate-x-12 pointer-events-none select-none text-[18vw] font-black uppercase text-[rgba(255,255,255,0.02)] tracking-tighter whitespace-nowrap z-0"
        >
          PULSECHAT PEER MESH
        </div>

        <div
          ref={heroTagRef}
          className="relative z-10 flex justify-between items-start font-mono text-xs text-[#8B8B86] uppercase tracking-widest max-w-7xl mx-auto w-full pt-4"
        >
          <span className="text-[#C4F135] font-bold">PRIVATE BY DESIGN</span>
          <span className="hidden sm:inline">DIRECT COMMUNICATION // ENCRYPTED AT SOURCE</span>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto w-full my-auto py-12">
          <h1 className="text-[clamp(48px,8.5vw,140px)] font-black uppercase tracking-tighter leading-[0.88] text-white">
            <div className="overflow-hidden">
              <span ref={heroLine1Ref} className="block velocity-text">
                COMMUNICATION
              </span>
            </div>
            <div className="overflow-hidden">
              <span ref={heroLine2Ref} className="block velocity-text">
                WITHOUT
              </span>
            </div>
            <div className="overflow-hidden">
              <span
                ref={heroLine3Ref}
                className="inline-block sm:pl-32 lg:pl-48 text-[#8B8B86] font-serif font-normal lowercase italic velocity-text"
              >
                compromise.
              </span>
            </div>
          </h1>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
            <div className="md:col-span-7 space-y-6">
              <div ref={heroParaRef} className="overflow-hidden">
                <p className="text-base sm:text-xl text-[#8B8B86] font-medium leading-relaxed max-w-xl">
                  Voice. Video. Conversation. PulseChat brings people together through direct, private communication designed around the moment—not the machinery behind it.
                </p>
              </div>

              <div ref={heroCtaRef} className="pt-2 flex items-center space-x-6 font-mono text-xs">
                <button
                  onClick={handleLaunch}
                  className="px-8 py-4 bg-[#F2F0EA] hover:bg-[#C4F135] text-[#0B0B0B] font-bold uppercase tracking-wider transition-all flex items-center space-x-3 cursor-pointer shadow-lg"
                  data-cursor="ENTER"
                >
                  <span>ENTER PULSECHAT</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href="#system"
                  className="text-[#8B8B86] hover:text-[#F2F0EA] uppercase tracking-wider underline underline-offset-4 transition-colors cursor-pointer"
                  data-cursor="SEE"
                >
                  SEE HOW IT WORKS
                </a>
              </div>
            </div>

            <div className="md:col-span-5 flex justify-end font-mono text-[11px] text-[#8B8B86] uppercase tracking-wider border-t md:border-t-0 border-[rgba(255,255,255,0.1)] pt-6 md:pt-0">
              <div className="editorial-reveal space-y-1 text-right">
                <span className="text-white font-bold block">WEBRTC PEER CONNECTION</span>
                <span>AES-GCM CLIENT ENCRYPTION</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECOND HERO STATEMENT (SECTION 5) ────────────────────────── */}
      <section className="py-24 px-6 sm:px-16 border-b border-[rgba(255,255,255,0.12)] bg-[#0B0B0B]">
        <div ref={secondHeroRef} className="max-w-5xl mx-auto space-y-6 text-center">
          <h2 className="text-4xl sm:text-6xl font-black uppercase text-white tracking-tighter leading-tight">
            YOU SHOULDN'T HAVE TO THINK ABOUT THE INFRASTRUCTURE.
          </h2>
          <p className="text-lg text-[#8B8B86] font-serif italic max-w-xl mx-auto">
            Start a conversation. The technology stays out of the way.
          </p>
        </div>
      </section>

      {/* ── KINETIC MARQUEE TICKER BAND ── */}
      <div className="bg-[#C4F135] text-[#0B0B0B] font-mono text-xs font-black uppercase tracking-widest py-3 border-y border-[#C4F135] overflow-hidden select-none">
        <div className="whitespace-nowrap flex space-x-8 animate-marquee velocity-text">
          <span>/// DIRECT PEER COMMUNICATION</span>
          <span>•</span>
          <span>ENCRYPTED AT THE SOURCE</span>
          <span>•</span>
          <span>DESIGNED AROUND PEOPLE</span>
          <span>•</span>
          <span>RESPONSIVE PARTICIPANT GRID</span>
          <span>•</span>
          <span>EDITORIAL MOTION PRECISION</span>
          <span>•</span>
          <span>DIRECT PEER COMMUNICATION</span>
        </div>
      </div>

      {/* ── INTRODUCTION SECTION (SECTION 6) ────────────────────────── */}
      <section id="intro" className="bg-[#F2F0EA] text-[#0B0B0B] py-32 px-6 sm:px-16 border-b border-[#0B0B0B]">
        <div className="max-w-7xl mx-auto space-y-16">
          <LineDrawSectionHeader
            number="01 / THE CONVERSATION"
            subtitle="HUMAN CENTERED DESIGN"
            isLight={true}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-baseline">
            <div className="lg:col-span-7">
              <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tighter leading-[0.95] text-[#0B0B0B]">
                <div className="overflow-hidden">
                  <span ref={introLine1Ref} className="block velocity-text">
                    THE CONVERSATION
                  </span>
                </div>
                <div className="overflow-hidden">
                  <span ref={introLine2Ref} className="block velocity-text">
                    COMES FIRST.
                  </span>
                </div>
              </h2>
            </div>
            <div className="lg:col-span-5 space-y-6" ref={introParaRef}>
              <p className="text-base sm:text-lg text-[#4A4A46] font-medium leading-relaxed">
                Most communication platforms make the infrastructure impossible to ignore. Servers. Routing. Accounts. Layers of software between one person and another. PulseChat takes a different approach. The technology should disappear into the experience.
              </p>
              <div className="font-mono text-xs font-bold text-[#0B0B0B] uppercase tracking-widest pt-4">
                VOICE. VIDEO. MESSAGING. ONE CONVERSATION.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DISTANCE SECTION (SECTION 7) ─────────────────────────────── */}
      <section className="py-32 px-6 sm:px-16 bg-[#0B0B0B] border-b border-[rgba(255,255,255,0.12)]">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <span className="text-xs font-mono text-[#C4F135] uppercase tracking-widest block">
            EDITORIAL MOMENT
          </span>
          <h2 className="text-5xl sm:text-7xl font-black uppercase text-white tracking-tighter leading-tight">
            DISTANCE IS ALREADY ENOUGH.
          </h2>
          <p className="text-base sm:text-lg text-[#8B8B86] font-mono max-w-xl mx-auto">
            Your conversation shouldn't feel further away because of the technology carrying it.
          </p>
        </div>
      </section>

      {/* ── TECHNOLOGY & SYSTEM NARRATIVE SECTION (SECTION 8, 10, 11, 12) ── */}
      <section id="system" className="py-32 px-6 sm:px-12 border-b border-[rgba(255,255,255,0.12)] bg-[#0B0B0B]">
        <div className="max-w-7xl mx-auto space-y-20">
          <LineDrawSectionHeader
            number="02 / THE SYSTEM"
            subtitle="HOW IT WORKS"
            isLight={false}
          />

          <div className="space-y-6">
            <h2 className="text-4xl sm:text-6xl font-black uppercase text-white tracking-tight">
              THE SYSTEM STAYS QUIET.
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
            {/* Left Narrative Chapters */}
            <div className="lg:col-span-6 space-y-12">
              <div className="editorial-reveal space-y-2 border-l-2 border-[#C4F135] pl-6">
                <span className="text-xs font-mono text-[#8B8B86]">01 FIND</span>
                <h3 className="text-2xl font-black uppercase text-white">DISCOVERY</h3>
                <p className="text-sm text-[#8B8B86] leading-relaxed">
                  The connection begins by discovering a direct path between participants.
                </p>
                <span className="text-[10px] font-mono text-[#C4F135] block pt-1">
                  WEBRTC / ICE / SDP
                </span>
              </div>

              <div className="editorial-reveal space-y-2 border-l-2 border-[rgba(255,255,255,0.15)] pl-6">
                <span className="text-xs font-mono text-[#8B8B86]">02 CONNECT</span>
                <h3 className="text-2xl font-black uppercase text-white">MEDIA STREAMS</h3>
                <p className="text-sm text-[#8B8B86] leading-relaxed">
                  Once a path is available, real-time media can move between peers.
                </p>
                <span className="text-[10px] font-mono text-[#8B8B86] block pt-1">
                  REAL-TIME MEDIA STREAMS
                </span>
              </div>

              <div className="editorial-reveal space-y-2 border-l-2 border-[rgba(255,255,255,0.15)] pl-6">
                <span className="text-xs font-mono text-[#8B8B86]">03 PROTECT</span>
                <h3 className="text-2xl font-black uppercase text-white">ENCRYPTION</h3>
                <p className="text-sm text-[#8B8B86] leading-relaxed">
                  Communication is protected before it leaves the client.
                </p>
                <span className="text-[10px] font-mono text-[#8B8B86] block pt-1">
                  WEB CRYPTO / AES-GCM
                </span>
              </div>

              <div className="editorial-reveal space-y-2 border-l-2 border-[rgba(255,255,255,0.15)] pl-6">
                <span className="text-xs font-mono text-[#8B8B86]">04 ADAPT</span>
                <h3 className="text-2xl font-black uppercase text-white">ADAPTATION</h3>
                <p className="text-sm text-[#8B8B86] leading-relaxed">
                  The experience adjusts as the conversation changes.
                </p>
                <span className="text-[10px] font-mono text-[#8B8B86] block pt-1">
                  RESPONSIVE PARTICIPANT GRID
                </span>
              </div>
            </div>

            {/* Right Interactive Visual Stories */}
            <div className="lg:col-span-6 space-y-8">
              <PeerToPeerVisual />
              <EncryptionVisual />
            </div>
          </div>
        </div>
      </section>

      {/* ── THE TECHNOLOGY DISAPPEARS MOMENT (SECTION 14) ─────────────── */}
      <TechnologyDisappearsSection />

      {/* ── ANATOMY SECTION: HORIZONTAL EXHIBITION (SECTION 13) ────────── */}
      <section
        id="anatomy"
        ref={horizontalSectionRef}
        className="relative min-h-screen bg-[#0B0B0B] border-b border-[rgba(255,255,255,0.12)] flex flex-col justify-center py-20 overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-12 mb-12 w-full">
          <LineDrawSectionHeader
            number="03 / INSIDE THE CONNECTION"
            subtitle="HORIZONTAL EXHIBITION"
            isLight={false}
          />
        </div>

        <div className="w-full overflow-hidden">
          <div
            ref={horizontalTrackRef}
            className="flex space-x-16 px-6 sm:px-16 w-max transition-transform"
          >
            {/* Step 01 */}
            <div className="w-[85vw] sm:w-[500px] flex flex-col justify-between space-y-8 py-6">
              <div>
                <span className="text-7xl font-black font-mono text-[#C4F135] block mb-4">
                  01
                </span>
                <h3 className="text-4xl font-black uppercase text-white mb-4">DISCOVER</h3>
                <p className="text-base text-[#8B8B86] leading-relaxed">
                  The connection begins before the first hello.
                </p>
              </div>
              <div className="font-mono text-xs text-[#8B8B86] border-t border-[rgba(255,255,255,0.1)] pt-4">
                WEBRTC ICE DISCOVERY
              </div>
            </div>

            {/* Step 02 */}
            <div className="w-[85vw] sm:w-[500px] flex flex-col justify-between space-y-8 py-6">
              <div>
                <span className="text-7xl font-black font-mono text-[#C4F135] block mb-4">
                  02
                </span>
                <h3 className="text-4xl font-black uppercase text-white mb-4">CONNECT</h3>
                <p className="text-base text-[#8B8B86] leading-relaxed">
                  Participants establish a path for real-time communication.
                </p>
              </div>
              <div className="font-mono text-xs text-[#8B8B86] border-t border-[rgba(255,255,255,0.1)] pt-4">
                MEDIA STREAM INITIALIZATION
              </div>
            </div>

            {/* Step 03 */}
            <div className="w-[85vw] sm:w-[500px] flex flex-col justify-between space-y-8 py-6">
              <div>
                <span className="text-7xl font-black font-mono text-[#C4F135] block mb-4">
                  03
                </span>
                <h3 className="text-4xl font-black uppercase text-white mb-4">PROTECT</h3>
                <p className="text-base text-[#8B8B86] leading-relaxed">
                  Data is protected before it leaves the client.
                </p>
              </div>
              <div className="font-mono text-xs text-[#8B8B86] border-t border-[rgba(255,255,255,0.1)] pt-4">
                AES-256 CLIENT CIPHER
              </div>
            </div>

            {/* Step 04 */}
            <div className="w-[85vw] sm:w-[500px] flex flex-col justify-between space-y-8 py-6">
              <div>
                <span className="text-7xl font-black font-mono text-[#C4F135] block mb-4">
                  04
                </span>
                <h3 className="text-4xl font-black uppercase text-white mb-4">COMMUNICATE</h3>
                <p className="text-base text-[#8B8B86] leading-relaxed">
                  Then the technology disappears.
                </p>
              </div>
              <div className="font-mono text-xs text-[#8B8B86] border-t border-[rgba(255,255,255,0.1)] pt-4">
                ADAPTIVE LAYOUT MESH
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE DEMO SIMULATOR (SECTION 15 & 16) ────────────────── */}
      <section id="session" className="py-32 px-6 sm:px-12 border-b border-[rgba(255,255,255,0.12)] bg-[#0B0B0B]">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-[rgba(255,255,255,0.12)] pb-6 gap-4">
            <div>
              <span className="text-xs font-mono text-[#C4F135] font-bold uppercase tracking-widest">
                04 / THE SESSION
              </span>
              <h2 className="text-3xl sm:text-5xl font-black uppercase text-white tracking-tight mt-2">
                SEE IT IN MOTION.
              </h2>
              <p className="text-xs text-[#8B8B86] font-mono mt-1">
                A small demonstration of what happens when the infrastructure gets out of the way.
              </p>
            </div>
            <div className="flex space-x-4 font-mono text-xs">
              <button
                onClick={() => setActiveTab('video')}
                className={`px-5 py-2.5 uppercase font-bold transition-all cursor-pointer ${activeTab === 'video'
                  ? 'bg-[#F2F0EA] text-[#0B0B0B]'
                  : 'text-[#8B8B86] hover:text-white border border-[rgba(255,255,255,0.14)]'
                  }`}
                data-cursor="SWITCH"
              >
                Media Viewport
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`px-5 py-2.5 uppercase font-bold transition-all cursor-pointer ${activeTab === 'security'
                  ? 'bg-[#F2F0EA] text-[#0B0B0B]'
                  : 'text-[#8B8B86] hover:text-white border border-[rgba(255,255,255,0.14)]'
                  }`}
                data-cursor="SWITCH"
              >
                Diagnostic Mode
              </button>
            </div>
          </div>

          <div className="bg-[#151515] border border-[rgba(255,255,255,0.14)] p-6 sm:p-10 shadow-2xl">
            {activeTab === 'video' ? (
              <div className="space-y-6 font-mono">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-[#0B0B0B] border border-[rgba(255,255,255,0.1)] p-4 gap-4">
                  <div className="flex items-center space-x-3 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#C4F135] animate-ping" />
                    <span className="text-white font-bold uppercase">
                      STATUS: {demoConnecting ? 'CONNECTING...' : demoActive ? 'LIVE' : 'STANDBY IDLE'}
                    </span>
                    <span className="text-[#8B8B86] hidden sm:inline">| ROOM: {demoRoomCode}</span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs">
                    <button
                      onClick={handleCopyCode}
                      className="px-4 py-2 border border-[rgba(255,255,255,0.15)] text-[#F2F0EA] hover:border-[#C4F135] transition-colors cursor-pointer flex items-center space-x-2"
                      data-cursor="COPY"
                    >
                      {demoCopied ? <Check className="w-3.5 h-3.5 text-[#C4F135]" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{demoCopied ? 'COPIED' : 'COPY ROOM'}</span>
                    </button>

                    <button
                      onClick={handleStartDemoToggle}
                      className={`px-6 py-2 font-bold uppercase transition-all cursor-pointer ${demoActive
                        ? 'bg-rose-600 text-white'
                        : 'bg-[#C4F135] text-[#0B0B0B] hover:opacity-90'
                        }`}
                      data-cursor="TOGGLE"
                    >
                      {demoConnecting ? 'CONNECTING...' : demoActive ? 'END SESSION' : 'START SESSION'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-80 sm:h-[420px] bg-[#0B0B0B] border border-[rgba(255,255,255,0.1)] p-4 relative overflow-hidden">
                  {demoActive ? (
                    <>
                      <div className="bg-[#151515] border border-[rgba(255,255,255,0.15)] p-6 flex flex-col justify-between animate-fade-in">
                        <div className="flex justify-between items-center text-xs text-[#C4F135]">
                          <span>LOCAL / YOU</span>
                          <span>CONNECTED</span>
                        </div>
                        <div className="text-center my-auto">
                          <div className="w-24 h-24 rounded-full bg-[#0B0B0B] border border-[#C4F135] flex items-center justify-center text-2xl font-bold text-white mx-auto mb-2">
                            YOU
                          </div>
                          <span className="text-xs text-[#8B8B86]">AUDIO STREAM LIVE</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-[#8B8B86]">
                          <span>FPS: 60</span>
                          <span>RTT: 8ms</span>
                        </div>
                      </div>

                      <div className="bg-[#151515] border border-[rgba(255,255,255,0.15)] p-6 flex flex-col justify-between animate-fade-in">
                        <div className="flex justify-between items-center text-xs text-[#F2F0EA]">
                          <span>REMOTE / @PEER_ALEX</span>
                          <span>CONNECTED</span>
                        </div>
                        <div className="text-center my-auto">
                          <div className="w-24 h-24 rounded-full bg-[#0B0B0B] border border-[rgba(255,255,255,0.2)] flex items-center justify-center text-2xl font-bold text-white mx-auto mb-2">
                            ALEX
                          </div>
                          <span className="text-xs text-[#C4F135]">SPEAKING...</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-[#8B8B86]">
                          <span>BITRATE: 2.4 Mbps</span>
                          <span>LOSS: 0.0%</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2 flex flex-col items-center justify-center text-center p-8 space-y-4">
                      <Video className="w-10 h-10 text-[#C4F135] animate-pulse" />
                      <h3 className="text-2xl font-black uppercase text-white">
                        YOUR CONVERSATION STARTS HERE.
                      </h3>
                      <p className="text-xs text-[#8B8B86] max-w-md font-mono">
                        Start the session to see the PulseChat experience.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="font-mono text-xs space-y-4 bg-[#0B0B0B] border border-[rgba(255,255,255,0.1)] p-8">
                <div className="flex justify-between border-b border-[rgba(255,255,255,0.1)] pb-4">
                  <span className="text-[#C4F135] font-bold">SECURITY DIAGNOSTICS</span>
                  <span className="text-[#8B8B86]">CLIENT ENCRYPTED</span>
                </div>
                <div className="space-y-3 text-[#8B8B86]">
                  <p>&gt; CIPHER SUITE: AES-256-GCM (Web Crypto API)</p>
                  <p>&gt; SIGNALING: TLS 1.3 Transport Channel</p>
                  <p>&gt; MEDIA TRANSPORT: Direct WebRTC SRTP Mesh</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── SECURITY SECTION (SECTION 17) ────────────────────────────── */}
      <section className="py-32 px-6 sm:px-12 border-b border-[rgba(255,255,255,0.12)] bg-[#0B0B0B]">
        <div className="max-w-7xl mx-auto space-y-16">
          <LineDrawSectionHeader
            number="05 / THE PROTOCOL"
            subtitle="PRIVACY ARCHITECTURE"
            isLight={false}
          />

          <div className="max-w-4xl space-y-8">
            <h2 className="text-5xl sm:text-7xl lg:text-8xl font-black uppercase tracking-tighter text-white leading-none">
              <div className="overflow-hidden">
                <span ref={protocolText1Ref} className="block velocity-text">
                  YOUR
                </span>
              </div>
              <div className="overflow-hidden">
                <span ref={protocolText2Ref} className="block velocity-text">
                  CONVERSATION
                </span>
              </div>
              <div className="overflow-hidden">
                <span
                  ref={protocolText3Ref}
                  className="block text-[#8B8B86] font-serif italic font-normal lowercase velocity-text"
                >
                  stays yours.
                </span>
              </div>
            </h2>

            <p className="text-base sm:text-lg text-[#8B8B86] font-mono max-w-xl">
              Privacy shouldn't require a technical manual. PulseChat is designed so protection happens quietly in the background.
            </p>

            <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-6 font-mono text-xs">
              <div className="editorial-reveal p-6 bg-[#151515] border border-[rgba(255,255,255,0.14)] text-center space-y-2">
                <span className="text-[#C4F135] font-bold block">01</span>
                <span className="text-white font-bold block">SOURCE</span>
              </div>
              <div className="editorial-reveal p-6 bg-[#151515] border border-[rgba(255,255,255,0.14)] text-center space-y-2">
                <span className="text-[#C4F135] font-bold block">02</span>
                <span className="text-white font-bold block">ENCRYPT</span>
              </div>
              <div className="editorial-reveal p-6 bg-[#151515] border border-[rgba(255,255,255,0.14)] text-center space-y-2">
                <span className="text-[#C4F135] font-bold block">03</span>
                <span className="text-white font-bold block">CONNECT</span>
              </div>
              <div className="editorial-reveal p-6 bg-[#151515] border border-[rgba(255,255,255,0.14)] text-center space-y-2">
                <span className="text-[#C4F135] font-bold block">04</span>
                <span className="text-white font-bold block">RECEIVE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA REVEAL SEQUENCE (SECTION 34) ────────────────────── */}
      <FinalCTASequence onLaunch={handleLaunch} />

      {/* ── FOOTER: INTENTIONALLY CALM EDITORIAL (SECTION 35) ──────────── */}
      <footer className="bg-[#0B0B0B] py-16 px-6 sm:px-12 font-mono text-xs text-[#8B8B86]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-12">
          <div ref={footerTitleRef} className="space-y-4">
            <span className="text-2xl font-black text-[#F2F0EA] uppercase tracking-tighter block">
              PULSE<span className="text-[#C4F135]">CHAT</span>
            </span>
            <span className="block text-[11px]">PRIVATE COMMUNICATION / 2026</span>
          </div>

          <div ref={footerNavRef} className="flex space-x-12 uppercase tracking-widest text-[11px]">
            <a href="#intro" className="hover:text-white transition-colors">
              Product
            </a>
            <a href="#system" className="hover:text-white transition-colors">
              Technology
            </a>
            <a href="#session" className="hover:text-white transition-colors">
              Security
            </a>
          </div>

          <div ref={footerMetaRef} className="text-[11px]">
            <span>© 2026 PULSECHAT</span>
          </div>
        </div>
      </footer>
    </div>
  );
}