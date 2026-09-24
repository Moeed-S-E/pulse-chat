// Sound Effects & Real Call Ringtone Audio Controller

let incomingAudio = null;
let outgoingAudio = null;

// 1. Play Real Incoming Call Ringtone (/sounds/ringtone.wav)
export function playIncomingRingtone() {
  stopIncomingRingtone();
  stopOutgoingRingback();

  try {
    incomingAudio = new Audio('/sounds/ringtone.wav');
    incomingAudio.loop = true;
    incomingAudio.volume = 0.85;
    const playPromise = incomingAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('[Audio] Autoplay restricted for incoming ringtone:', err);
      });
    }
  } catch (err) {
    console.error('[Audio] Error playing incoming ringtone:', err);
  }
}

export function stopIncomingRingtone() {
  if (incomingAudio) {
    try {
      incomingAudio.pause();
      incomingAudio.currentTime = 0;
    } catch (e) {}
    incomingAudio = null;
  }
}

// 2. Play Real Outgoing Ringback Tone (/sounds/outgoing.wav)
export function playOutgoingRingback() {
  stopOutgoingRingback();
  stopIncomingRingtone();

  try {
    outgoingAudio = new Audio('/sounds/outgoing.wav');
    outgoingAudio.loop = true;
    outgoingAudio.volume = 0.65;
    const playPromise = outgoingAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('[Audio] Autoplay restricted for outgoing ringback:', err);
      });
    }
  } catch (err) {
    console.error('[Audio] Error playing outgoing ringback tone:', err);
  }
}

export function stopOutgoingRingback() {
  if (outgoingAudio) {
    try {
      outgoingAudio.pause();
      outgoingAudio.currentTime = 0;
    } catch (e) {}
    outgoingAudio = null;
  }
}

let sharedAudioCtx = null;

function getAudioContext() {
  if (!sharedAudioCtx) {
    const AudioCtx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (AudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
  }
  if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

// 3. Play Call Connected Tone
export function playCallConnectedSound() {
  stopIncomingRingtone();
  stopOutgoingRingback();

  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(880, now + 0.1); // A5

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  } catch (e) {
    console.error('[Audio] Error playing call connected sound:', e);
  }
}

// 4. Play Call Ended / Declined Tone
export function playCallEndedSound() {
  stopIncomingRingtone();
  stopOutgoingRingback();

  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now); // A4
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.35); // Down to A3

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  } catch (e) {
    console.error('[Audio] Error playing call ended sound:', e);
  }
}

// 5. Play Real Chat Message Notification Chime (/sounds/notification.wav)
export function playMessageNotificationSound() {
  try {
    const notifAudio = new Audio('/sounds/notification.wav');
    notifAudio.volume = 0.75;
    const playPromise = notifAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('[Audio] Notification sound blocked:', err);
      });
    }
  } catch (err) {
    console.error('[Audio] Error playing notification sound:', err);
  }
}

// 6. Request & Display Desktop Notifications
export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
}

export function showDesktopNotification(title, options = {}) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      const n = new Notification(title, {
        body: options.body || '',
        icon: options.icon || undefined,
        ...options,
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
    } catch (e) {
      console.error('[Notification] Desktop notification error:', e);
    }
  }
}
