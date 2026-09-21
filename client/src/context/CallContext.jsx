import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const CallContext = createContext(null);

const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const CallProvider = ({ children }) => {
  const { socket } = useSocket();
  const { user, token } = useAuth();
  const { showToast } = useToast();

  // Call states: 'idle' | 'outgoing' | 'incoming' | 'active' | 'ended'
  const [callState, setCallState] = useState('idle');
  const [callInfo, setCallInfo] = useState(null); // { targetUserId, channelId, callerInfo, calleeInfo, isRoomCall, roomCode }
  const [localStream, setLocalStream] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // 1:M Multi-Participant remote streams map: [{ peerId, username, stream }]
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);

  // PeerConnections map: peerId -> RTCPeerConnection
  const peerConnectionsRef = useRef(new Map());
  const localStreamRef = useRef(null);
  const timerRef = useRef(null);
  const ringingTimeoutRef = useRef(null);

  // Format duration mm:ss
  const formatDuration = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Timer effect for active call
  useEffect(() => {
    if (callState === 'active') {
      setCallSeconds(0);
      timerRef.current = setInterval(() => {
        setCallSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  // Clean up all streams and multi-peer connections
  const cleanupCall = () => {
    if (ringingTimeoutRef.current) clearTimeout(ringingTimeoutRef.current);

    peerConnectionsRef.current.forEach((pc) => {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.close();
    });
    peerConnectionsRef.current.clear();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    setLocalStream(null);
    setRemoteStreams([]);
    setIsMuted(false);
    setIsCameraOff(false);
    setIsFullScreen(false);
  };

  // Get user media stream
  const getMedia = async (audioOnly = false) => {
    if (localStreamRef.current) return localStreamRef.current;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: !audioOnly,
        audio: true,
      });
      setLocalStream(stream);
      localStreamRef.current = stream;
      return stream;
    } catch (err) {
      console.error('[WebRTC] Error accessing camera/microphone:', err);
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        setLocalStream(audioStream);
        localStreamRef.current = audioStream;
        return audioStream;
      } catch (e) {
        console.error('[WebRTC] Audio access failed:', e);
        return null;
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
      console.log(`[WebRTC 1:M] Received remote track from ${peerUsername} (${peerId}):`, event.streams[0]);
      if (event.streams && event.streams[0]) {
        const stream = event.streams[0];
        setRemoteStreams((prev) => {
          const filtered = prev.filter((p) => p.peerId !== peerId);
          return [...filtered, { peerId, username: peerUsername, stream }];
        });
      }
    };

    peerConnectionsRef.current.set(peerId, pc);
    return pc;
  };

  // Socket signaling event listeners
  useEffect(() => {
    if (!socket) return;

    // Incoming 1:1 call invite -> Snackbar will trigger
    const handleIncomingCall = ({ callerUserId, callerInfo, channelId }) => {
      console.log('[Call] Incoming 1:M call from:', callerInfo);
      setCallInfo({ targetUserId: callerUserId, callerInfo, channelId });
      setCallState('incoming');
    };

    // Caller receives acceptance -> send offer
    const handleCallAccepted = async ({ acceptorUserId, _channelId }) => {
      console.log('[Call] Accepted by acceptor:', acceptorUserId);
      if (ringingTimeoutRef.current) clearTimeout(ringingTimeoutRef.current);
      setCallState('active');

      await getMedia();
      const pc = createPeerConnection(acceptorUserId, callInfo?.calleeInfo?.username || 'User');

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('webrtc:offer', {
        targetUserId: acceptorUserId,
        offer,
      });
    };

    // Caller receives decline
    const handleCallDeclined = ({ reason }) => {
      if (ringingTimeoutRef.current) clearTimeout(ringingTimeoutRef.current);
      showToast(reason || 'Call was declined', 'error');
      setCallState('ended');
      setTimeout(() => {
        setCallState('idle');
        setCallInfo(null);
      }, 1500);
    };

    // 1:1 WebRTC offer
    const handleWebRTCOffer = async ({ fromUserId, offer }) => {
      setCallState('active');
      await getMedia();
      const pc = createPeerConnection(fromUserId, 'Caller');

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('webrtc:answer', {
        targetUserId: fromUserId,
        answer,
      });
    };

    // 1:1 WebRTC answer
    const handleWebRTCAnswer = async ({ fromUserId, answer }) => {
      const pc = peerConnectionsRef.current.get(fromUserId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    };

    // 1:1 ICE Candidate
    const handleICECandidate = async ({ fromUserId, candidate }) => {
      const pc = peerConnectionsRef.current.get(fromUserId);
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('[WebRTC] ICE candidate error:', e);
        }
      }
    };

    // Call ended by remote user
    const handleCallEnded = () => {
      cleanupCall();
      setCallState('ended');
      showToast('Video call ended', 'info');
      setTimeout(() => {
        setCallState('idle');
        setCallInfo(null);
      }, 1500);
    };

    // --- 1:M Meeting Room Mesh Event Handlers ---

    // Receiving existing room peers list when joining
    const handleMeetingExistingPeers = async ({ roomCode, existingPeers }) => {
      console.log(`[Meeting 1:M] Room ${roomCode} has existing peers:`, existingPeers);
      setCallState('active');
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

    // New peer joined meeting room
    const handleMeetingPeerJoined = async ({ userId: peerId, username: peerName, roomCode }) => {
      console.log(`[Meeting 1:M] ${peerName} joined room ${roomCode}`);
      showToast(`@${peerName} joined the video call`, 'info');
      setCallState('active');
      await getMedia();
      createPeerConnection(peerId, peerName, true, roomCode);
    };

    // Receiving 1:M WebRTC Offer
    const handleMeetingWebRTCOffer = async ({ fromUserId, fromUsername, offer }) => {
      const roomCode = callInfo?.roomCode || '';
      setCallState('active');
      await getMedia();

      const pc = createPeerConnection(fromUserId, fromUsername, true, roomCode);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('meeting:webrtc:answer', {
        roomCode,
        targetUserId: fromUserId,
        answer,
      });
    };

    // Receiving 1:M WebRTC Answer
    const handleMeetingWebRTCAnswer = async ({ fromUserId, answer }) => {
      const pc = peerConnectionsRef.current.get(fromUserId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    };

    // Receiving 1:M ICE Candidate
    const handleMeetingICECandidate = async ({ fromUserId, candidate }) => {
      const pc = peerConnectionsRef.current.get(fromUserId);
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('[WebRTC 1:M] ICE error:', e);
        }
      }
    };

    // Participant left meeting room
    const handleMeetingPeerLeft = ({ userId: peerId, username: peerName }) => {
      console.log(`[Meeting 1:M] Peer left ${peerName}`);
      showToast(`@${peerName} left the video call`, 'info');

      const pc = peerConnectionsRef.current.get(peerId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(peerId);
      }

      setRemoteStreams((prev) => prev.filter((p) => p.peerId !== peerId));
    };

    socket.on('call:incoming', handleIncomingCall);
    socket.on('call:accepted', handleCallAccepted);
    socket.on('call:declined', handleCallDeclined);
    socket.on('webrtc:offer', handleWebRTCOffer);
    socket.on('webrtc:answer', handleWebRTCAnswer);
    socket.on('webrtc:ice-candidate', handleICECandidate);
    socket.on('call:ended', handleCallEnded);

    socket.on('meeting:existing_peers', handleMeetingExistingPeers);
    socket.on('meeting:peer_joined', handleMeetingPeerJoined);
    socket.on('meeting:webrtc:offer', handleMeetingWebRTCOffer);
    socket.on('meeting:webrtc:answer', handleMeetingWebRTCAnswer);
    socket.on('meeting:webrtc:ice-candidate', handleMeetingICECandidate);
    socket.on('meeting:peer_left', handleMeetingPeerLeft);

    return () => {
      socket.off('call:incoming', handleIncomingCall);
      socket.off('call:accepted', handleCallAccepted);
      socket.off('call:declined', handleCallDeclined);
      socket.off('webrtc:offer', handleWebRTCOffer);
      socket.off('webrtc:answer', handleWebRTCAnswer);
      socket.off('webrtc:ice-candidate', handleICECandidate);
      socket.off('call:ended', handleCallEnded);

      socket.off('meeting:existing_peers', handleMeetingExistingPeers);
      socket.off('meeting:peer_joined', handleMeetingPeerJoined);
      socket.off('meeting:webrtc:offer', handleMeetingWebRTCOffer);
      socket.off('meeting:webrtc:answer', handleMeetingWebRTCAnswer);
      socket.off('meeting:webrtc:ice-candidate', handleMeetingICECandidate);
      socket.off('meeting:peer_left', handleMeetingPeerLeft);
    };
  }, [socket, user, callInfo]);

  // Start outgoing call (video or audio) by User ID
  const startCall = (targetUserId, channelId, targetUserObj, callType = 'video') => {
    if (!socket || !targetUserId) return;

    if (ringingTimeoutRef.current) clearTimeout(ringingTimeoutRef.current);

    const isAudioOnly = callType === 'audio';
    setIsCameraOff(isAudioOnly);

    setCallInfo({
      targetUserId,
      channelId,
      calleeInfo: targetUserObj,
      callType,
    });
    setCallState('outgoing');

    // Automatically stop ringing after 30 seconds if recipient does not answer
    ringingTimeoutRef.current = setTimeout(() => {
      showToast(`@${targetUserObj?.username || 'User'} did not answer.`, 'info');
      endCall();
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

  // Start direct call by @username handle
  const startCallByUsername = async (targetUsername) => {
    if (!targetUsername || !token) return;
    const cleanUsername = targetUsername.toLowerCase().trim().replace(/^@/, '');

    const res = await fetch(`/api/users/search?q=${encodeURIComponent(cleanUsername)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const data = await res.json();
      const targetUser = data.users?.find(
        (u) => u.username.toLowerCase() === cleanUsername
      ) || data.users?.[0];

      if (targetUser) {
        startCall(targetUser._id, null, targetUser);
        return targetUser;
      } else {
        throw new Error(`User "@${cleanUsername}" not found.`);
      }
    }
  };

  // Join or Create a 1:M Video Call Room by Code
  const joinRoomCall = async (code) => {
    if (!socket || !code) return;
    const cleanCode = code.toUpperCase().trim();

    setCallInfo({
      isRoomCall: true,
      roomCode: cleanCode,
      calleeInfo: { name: `Room ${cleanCode}`, username: cleanCode },
    });
    setCallState('active');

    await getMedia();
    socket.emit('meeting:join', { roomCode: cleanCode });
  };

  // Accept incoming call
  const acceptCall = async () => {
    if (!socket || !callInfo) return;
    try {
      setCallState('active');
      await getMedia(callInfo.callType === 'audio');
      socket.emit('call:accept', {
        callerUserId: callInfo.targetUserId || callInfo.callerUserId,
        channelId: callInfo.channelId,
      });
    } catch (err) {
      console.error('[Call] Error accepting call:', err);
      showToast('Failed to access camera/microphone for video call.', 'error');
    }
  };

  // Decline incoming call from Snackbar
  const declineCall = () => {
    if (!socket || !callInfo) return;
    socket.emit('call:decline', {
      callerUserId: callInfo.targetUserId,
      channelId: callInfo.channelId,
    });
    setCallState('idle');
    setCallInfo(null);
  };

  // End active call
  const endCall = () => {
    const durationStr = formatDuration(callSeconds);

    if (socket && callInfo) {
      if (callInfo.isRoomCall) {
        socket.emit('meeting:leave', { roomCode: callInfo.roomCode });
      } else {
        socket.emit('call:end', {
          targetUserId: callInfo.targetUserId,
          channelId: callInfo.channelId,
          duration: durationStr,
        });
      }
    }

    cleanupCall();
    setCallState('ended');
    setTimeout(() => {
      setCallState('idle');
      setCallInfo(null);
    }, 1500);
  };

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
