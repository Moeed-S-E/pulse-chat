import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { apiFetch } from '../config/api';
import {
  playIncomingRingtone,
  stopIncomingRingtone,
  playOutgoingRingback,
  stopOutgoingRingback,
  playCallConnectedSound,
  playCallEndedSound,
  showDesktopNotification,
} from '../utils/soundEffects';

export const CallContext = createContext(null);

const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
if (import.meta.env.VITE_TURN_URL) {
  iceServers.push({
    urls: import.meta.env.VITE_TURN_URL.split(','),
    username: import.meta.env.VITE_TURN_USERNAME,
    credential: import.meta.env.VITE_TURN_CREDENTIAL,
  });
}
const STUN_SERVERS = { iceServers };

export const CallProvider = ({ children }) => {
  const { socket } = useSocket();
  const { user, token } = useAuth();
  const { showToast } = useToast();

  // Call states: 'idle' | 'outgoing' | 'incoming' | 'active' | 'ended'
  const [callState, setCallState] = useState('idle');
  const [callInfo, setCallInfo] = useState(null); // { targetUserId, channelId, callerInfo, calleeInfo, isRoomCall, roomCode, callType }
  const [localStream, setLocalStream] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // 1:M Multi-Participant remote streams map: [{ peerId, username, stream }]
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);

  // Synchronous State Refs to prevent stale closure bugs
  const callStateRef = useRef('idle');
  const callInfoRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamsRef = useRef([]);
  const callSecondsRef = useRef(0);
  const endCallRef = useRef(null);
  const mediaPromiseRef = useRef(null);
  const pendingIceRef = useRef(new Map());
  const peerConnectionsRef = useRef(new Map());
  const timerRef = useRef(null);
  const ringingTimeoutRef = useRef(null);

  const updateCallState = (s) => {
    callStateRef.current = s;
    setCallState(s);
  };
  const updateCallInfo = (i) => {
    callInfoRef.current = i;
    setCallInfo(i);
  };
  const updateRemoteStreams = (fn) =>
    setRemoteStreams((prev) => {
      const next = typeof fn === 'function' ? fn(prev) : fn;
      remoteStreamsRef.current = next;
      return next;
    });

  // Format duration mm:ss
  const formatDuration = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Sound effects controller based on call state
  useEffect(() => {
    if (callState === 'incoming') {
      playIncomingRingtone();
    } else if (callState === 'outgoing') {
      playOutgoingRingback();
    } else if (callState === 'active') {
      stopIncomingRingtone();
      stopOutgoingRingback();
      playCallConnectedSound();
    } else if (callState === 'ended') {
      stopIncomingRingtone();
      stopOutgoingRingback();
      playCallEndedSound();
    } else if (callState === 'idle') {
      stopIncomingRingtone();
      stopOutgoingRingback();
    }
  }, [callState]);

  // Timer effect for active call
  useEffect(() => {
    if (callState === 'active') {
      callSecondsRef.current = 0;
      setCallSeconds(0);
      timerRef.current = setInterval(() => {
        callSecondsRef.current += 1;
        setCallSeconds(callSecondsRef.current);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  // Clean up all streams, timers, and multi-peer connections
  const cleanupCall = () => {
    stopIncomingRingtone();
    stopOutgoingRingback();
    if (ringingTimeoutRef.current) clearTimeout(ringingTimeoutRef.current);

    peerConnectionsRef.current.forEach((pc) => {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.close();
    });
    peerConnectionsRef.current.clear();
    pendingIceRef.current.clear();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    setLocalStream(null);
    updateRemoteStreams([]);
    setIsMuted(false);
    setIsCameraOff(false);
    setIsFullScreen(false);
  };

  // Get user media stream with deduping promise & audio fallback
  const getMedia = (audioOnly = false) => {
    if (localStreamRef.current) return Promise.resolve(localStreamRef.current);
    if (mediaPromiseRef.current) return mediaPromiseRef.current;
    if (!navigator.mediaDevices?.getUserMedia) {
      showToast('Calls need HTTPS and a supported browser.', 'error');
      return Promise.resolve(null);
    }

    mediaPromiseRef.current = (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: !audioOnly, audio: true });
        localStreamRef.current = s;
        setLocalStream(s);
        return s;
      } catch {
        if (!audioOnly) {
          try {
            const s = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            localStreamRef.current = s;
            setLocalStream(s);
            setIsCameraOff(true);
            showToast('Camera unavailable — continuing with audio only.', 'info');
            return s;
          } catch {
            /* fall through */
          }
        }
        return null;
      } finally {
        mediaPromiseRef.current = null;
      }
    })();

    return mediaPromiseRef.current;
  };

  // Safe ICE Candidate queuing
  const addIceSafely = async (peerId, candidate) => {
    if (!candidate) return;
    const pc = peerConnectionsRef.current.get(peerId);
    if (!pc || !pc.remoteDescription) {
      const q = pendingIceRef.current.get(peerId) || [];
      q.push(candidate);
      pendingIceRef.current.set(peerId, q);
      return;
    }
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.error('[WebRTC] ICE candidate error:', e);
    }
  };

  // Safe Remote Description & queued ICE candidate flush
  const setRemoteDesc = async (peerId, pc, desc) => {
    await pc.setRemoteDescription(new RTCSessionDescription(desc));
    const q = pendingIceRef.current.get(peerId) || [];
    pendingIceRef.current.delete(peerId);
    for (const c of q) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch {
        /* ignore */
      }
    }
  };

  // Create or get RTCPeerConnection for a specific peer ID
  const createPeerConnection = (peerId, peerUsername = 'Participant', isMeeting = false, roomCode = '') => {
    if (peerConnectionsRef.current.has(peerId)) {
      return peerConnectionsRef.current.get(peerId);
    }

    const pc = new RTCPeerConnection(STUN_SERVERS);

    // Attach local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        if (isMeeting || roomCode) {
          socket.emit('meeting:webrtc:ice-candidate', {
            roomCode,
            targetUserId: peerId,
            candidate: event.candidate,
          });
        } else {
          socket.emit('webrtc:ice-candidate', {
            targetUserId: peerId,
            candidate: event.candidate,
          });
        }
      }
    };

    pc.ontrack = (event) => {
      updateRemoteStreams((prev) => {
        const existing = prev.find((p) => p.peerId === peerId);
        let stream;

        if (event.streams && event.streams[0]) {
          stream = event.streams[0];
        } else if (existing && existing.stream) {
          stream = existing.stream;
          stream.addTrack(event.track);
        } else {
          stream = new MediaStream([event.track]);
        }

        const filtered = prev.filter((p) => p.peerId !== peerId);
        return [...filtered, { peerId, username: peerUsername, stream }];
      });
    };

    peerConnectionsRef.current.set(peerId, pc);
    return pc;
  };

  // Actions
  const startCall = (targetUserId, channelId, targetUserObj, callType = 'video') => {
    if (!socket || !targetUserId || callStateRef.current !== 'idle') return;

    if (ringingTimeoutRef.current) clearTimeout(ringingTimeoutRef.current);

    const isAudioOnly = callType === 'audio';
    setIsCameraOff(isAudioOnly);
    setIsFullScreen(true);

    updateCallInfo({
      targetUserId,
      channelId,
      calleeInfo: targetUserObj,
      callType,
    });
    updateCallState('outgoing');

    ringingTimeoutRef.current = setTimeout(() => {
      showToast(`@${targetUserObj?.username || 'User'} did not answer.`, 'info');
      endCallRef.current?.('timeout');
    }, 30000);

    socket.emit('call:invite', {
      targetUserId,
      channelId,
      callType,
      callerInfo: {
        id: user?._id,
        name: user?.name,
        username: user?.username,
        avatarInitial: user?.avatarInitial,
      },
    });
  };

  const startCallByUsername = async (targetUsername) => {
    if (!targetUsername || !token) return;
    const clean = targetUsername.toLowerCase().trim().replace(/^@/, '');

    const res = await apiFetch(`/api/users/search?q=${encodeURIComponent(clean)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error('Could not look up that user. Try again.');
    const { users = [] } = await res.json();
    const target = users.find((u) => u.username.toLowerCase() === clean);

    if (!target) throw new Error(`User "@${clean}" not found.`);
    startCall(target._id, null, target);
    return target;
  };

  const joinRoomCall = async (code) => {
    if (!socket || !code) return;
    const cleanCode = code.toUpperCase().trim();

    setIsFullScreen(true);
    updateCallInfo({
      isRoomCall: true,
      roomCode: cleanCode,
      calleeInfo: { name: `Room ${cleanCode}`, username: cleanCode },
    });

    const stream = await getMedia(false);
    if (!stream) {
      showToast('Could not access camera/microphone.', 'error');
      updateCallState('idle');
      updateCallInfo(null);
      return;
    }

    updateCallState('active');
    socket.emit('meeting:join', { roomCode: cleanCode });
  };

  const acceptCall = async () => {
    stopIncomingRingtone();
    const info = callInfoRef.current;
    if (!socket || !info) return;

    if (info.isRoomCall) {
      await joinRoomCall(info.roomCode);
      return;
    }

    const audioOnly = info.callType === 'audio';
    const stream = await getMedia(audioOnly);
    if (!stream) {
      showToast('Could not access camera/microphone.', 'error');
      declineCall();
      return;
    }

    setIsFullScreen(true);
    setIsCameraOff(audioOnly);
    updateCallState('active');
    socket.emit('call:accept', {
      callerUserId: info.targetUserId || info.callerInfo?.id,
      channelId: info.channelId,
    });
  };

  const declineCall = () => {
    stopIncomingRingtone();
    const info = callInfoRef.current;
    if (socket && info && !info.isRoomCall) {
      socket.emit('call:decline', {
        callerUserId: info.targetUserId || info.callerInfo?.id,
        channelId: info.channelId,
      });
    }
    updateCallState('idle');
    updateCallInfo(null);
  };

  const endCall = (reason) => {
    const info = callInfoRef.current;
    const state = callStateRef.current;

    if (socket && info) {
      if (info.isRoomCall) {
        socket.emit('meeting:leave', { roomCode: info.roomCode });
      } else if (state === 'outgoing') {
        socket.emit('call:cancel', {
          targetUserId: info.targetUserId,
          channelId: info.channelId,
          callType: info.callType,
          reason: reason === 'timeout' ? 'timeout' : 'cancelled',
        });
      } else {
        socket.emit('call:end', {
          targetUserId: info.targetUserId,
          channelId: info.channelId,
          callType: info.callType,
          duration: formatDuration(callSecondsRef.current),
        });
      }
    }

    cleanupCall();
    updateCallState('ended');
    setTimeout(() => {
      updateCallState('idle');
      updateCallInfo(null);
    }, 1500);
  };

  endCallRef.current = endCall;

  // Socket signaling event listeners
  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = ({ callerUserId, callerInfo, channelId, callType }) => {
      if (callStateRef.current !== 'idle') {
        socket.emit('call:decline', { callerUserId, channelId, reason: 'User is busy on another call.' });
        return;
      }
      updateCallInfo({ targetUserId: callerUserId, callerInfo, channelId, callType: callType || 'video' });
      updateCallState('incoming');
      showDesktopNotification('Incoming call', {
        body: `@${callerInfo?.username || 'User'} is calling`,
      });
    };

    const handleCallCancelled = ({ fromUserId }) => {
      if (callStateRef.current === 'incoming' && callInfoRef.current?.targetUserId === fromUserId) {
        stopIncomingRingtone();
        showToast(`Missed call from @${callInfoRef.current?.callerInfo?.username || 'user'}`, 'info');
        updateCallState('idle');
        updateCallInfo(null);
      }
    };

    const handleCallAccepted = async ({ acceptorUserId }) => {
      if (callStateRef.current !== 'outgoing') return;
      if (ringingTimeoutRef.current) clearTimeout(ringingTimeoutRef.current);
      const info = callInfoRef.current;
      const stream = await getMedia(info?.callType === 'audio');
      if (!stream) {
        showToast('Could not access microphone/camera.', 'error');
        endCallRef.current?.();
        return;
      }
      updateCallState('active');
      const pc = createPeerConnection(
        acceptorUserId,
        info?.calleeInfo?.name || info?.calleeInfo?.username || 'User'
      );
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc:offer', { targetUserId: acceptorUserId, offer });
    };

    const handleCallDeclined = ({ reason }) => {
      if (ringingTimeoutRef.current) clearTimeout(ringingTimeoutRef.current);
      showToast(reason || 'Call was declined', 'error');
      updateCallState('ended');
      setTimeout(() => {
        updateCallState('idle');
        updateCallInfo(null);
      }, 1500);
    };

    const handleWebRTCOffer = async ({ fromUserId, offer }) => {
      const info = callInfoRef.current;
      const peerName = info?.callerInfo?.name || info?.callerInfo?.username || 'Caller';
      updateCallState('active');
      await getMedia(info?.callType === 'audio');
      const pc = createPeerConnection(fromUserId, peerName);

      await setRemoteDesc(fromUserId, pc, offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('webrtc:answer', { targetUserId: fromUserId, answer });
    };

    const handleWebRTCAnswer = async ({ fromUserId, answer }) => {
      const pc = peerConnectionsRef.current.get(fromUserId);
      if (pc) {
        await setRemoteDesc(fromUserId, pc, answer);
      }
    };

    const handleICECandidate = async ({ fromUserId, candidate }) => {
      await addIceSafely(fromUserId, candidate);
    };

    const handleCallEnded = ({ endedByUserId } = {}) => {
      if (endedByUserId && peerConnectionsRef.current.has(endedByUserId) && remoteStreamsRef.current.length > 1) {
        const pc = peerConnectionsRef.current.get(endedByUserId);
        if (pc) {
          pc.close();
          peerConnectionsRef.current.delete(endedByUserId);
        }
        updateRemoteStreams((prev) => prev.filter((p) => p.peerId !== endedByUserId));
        showToast('A participant left the video call', 'info');
        return;
      }

      cleanupCall();
      updateCallState('ended');
      showToast('Call ended', 'info');
      setTimeout(() => {
        updateCallState('idle');
        updateCallInfo(null);
      }, 1500);
    };

    const handleMeetingIncomingInvite = ({ roomCode, inviterInfo }) => {
      showToast(`@${inviterInfo?.username || 'User'} invited you to join call room ${roomCode}`, 'info');
      if (callStateRef.current === 'idle') {
        updateCallInfo({
          isRoomCall: true,
          roomCode,
          callerInfo: inviterInfo,
          calleeInfo: { name: `Room ${roomCode}`, username: roomCode },
        });
        updateCallState('incoming');
      }
    };

    const handleMeetingExistingPeers = async ({ roomCode, existingPeers }) => {
      updateCallState('active');
      await getMedia();

      for (const peer of existingPeers) {
        const pc = createPeerConnection(peer.userId, peer.username, true, roomCode);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit('meeting:webrtc:offer', {
          roomCode,
          targetUserId: peer.userId,
          offer,
        });
      }
    };

    const handleMeetingPeerJoined = async ({ userId: peerId, username: peerName, roomCode }) => {
      showToast(`@${peerName || 'User'} joined the video call`, 'info');
      updateCallState('active');
      await getMedia();
      createPeerConnection(peerId, peerName, true, roomCode);
    };

    const handleMeetingWebRTCOffer = async ({ fromUserId, fromUsername, offer }) => {
      const roomCode = callInfoRef.current?.roomCode || '';
      updateCallState('active');
      await getMedia();

      const pc = createPeerConnection(fromUserId, fromUsername, true, roomCode);
      await setRemoteDesc(fromUserId, pc, offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('meeting:webrtc:answer', {
        roomCode,
        targetUserId: fromUserId,
        answer,
      });
    };

    const handleMeetingWebRTCAnswer = async ({ fromUserId, answer }) => {
      const pc = peerConnectionsRef.current.get(fromUserId);
      if (pc) {
        await setRemoteDesc(fromUserId, pc, answer);
      }
    };

    const handleMeetingICECandidate = async ({ fromUserId, candidate }) => {
      await addIceSafely(fromUserId, candidate);
    };

    const handleMeetingPeerLeft = ({ userId: peerId, username: peerName }) => {
      showToast(`@${peerName || 'Participant'} left the video call`, 'info');

      const pc = peerConnectionsRef.current.get(peerId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(peerId);
      }

      updateRemoteStreams((prev) => prev.filter((p) => p.peerId !== peerId));
    };

    socket.on('call:incoming', handleIncomingCall);
    socket.on('call:cancelled', handleCallCancelled);
    socket.on('call:accepted', handleCallAccepted);
    socket.on('call:declined', handleCallDeclined);
    socket.on('webrtc:offer', handleWebRTCOffer);
    socket.on('webrtc:answer', handleWebRTCAnswer);
    socket.on('webrtc:ice-candidate', handleICECandidate);
    socket.on('call:ended', handleCallEnded);

    socket.on('meeting:incoming_invite', handleMeetingIncomingInvite);
    socket.on('meeting:existing_peers', handleMeetingExistingPeers);
    socket.on('meeting:peer_joined', handleMeetingPeerJoined);
    socket.on('meeting:webrtc:offer', handleMeetingWebRTCOffer);
    socket.on('meeting:webrtc:answer', handleMeetingWebRTCAnswer);
    socket.on('meeting:webrtc:ice-candidate', handleMeetingICECandidate);
    socket.on('meeting:peer_left', handleMeetingPeerLeft);

    return () => {
      socket.off('call:incoming', handleIncomingCall);
      socket.off('call:cancelled', handleCallCancelled);
      socket.off('call:accepted', handleCallAccepted);
      socket.off('call:declined', handleCallDeclined);
      socket.off('webrtc:offer', handleWebRTCOffer);
      socket.off('webrtc:answer', handleWebRTCAnswer);
      socket.off('webrtc:ice-candidate', handleICECandidate);
      socket.off('call:ended', handleCallEnded);

      socket.off('meeting:incoming_invite', handleMeetingIncomingInvite);
      socket.off('meeting:existing_peers', handleMeetingExistingPeers);
      socket.off('meeting:peer_joined', handleMeetingPeerJoined);
      socket.off('meeting:webrtc:offer', handleMeetingWebRTCOffer);
      socket.off('meeting:webrtc:answer', handleMeetingWebRTCAnswer);
      socket.off('meeting:webrtc:ice-candidate', handleMeetingICECandidate);
      socket.off('meeting:peer_left', handleMeetingPeerLeft);
    };
  }, [socket]);

  // Toggle Mic
  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!audioTracks[0]?.enabled);
    }
  };

  // Toggle Camera
  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsCameraOff(!videoTracks[0]?.enabled);
    }
  };

  return (
    <CallContext.Provider
      value={{
        callState,
        callInfo,
        localStream,
        remoteStreams,
        isMuted,
        isCameraOff,
        isFullScreen,
        setIsFullScreen,
        callDuration: formatDuration(callSeconds),
        startCall,
        startCallByUsername,
        joinRoomCall,
        acceptCall,
        declineCall,
        endCall,
        toggleMic,
        toggleCamera,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
