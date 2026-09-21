import React, { useState, useEffect, useRef } from 'react';
import { useCall } from '../../context/CallContext';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import Avatar from '../ui/Avatar';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import {
  UserPlus, Copy, Check, Mic, MicOff, Video, VideoOff, PhoneOff,
  Maximize2, Minimize2, Users, Search, AtSign, CheckCircle2, X
} from 'lucide-react';

// Individual Video Tile component for attached MediaStream
const VideoTile = ({ stream, isLocal, name, username, isMuted, isCameraOff }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
    }
  }, [stream, isCameraOff]);

  const setVideoRef = (node) => {
    videoRef.current = node;
    if (node && stream && node.srcObject !== stream) {
      node.srcObject = stream;
    }
  };

  const hasVideo = stream && !isCameraOff;

  return (
    <div className="relative bg-slate-900 rounded-3xl overflow-hidden border border-slate-800/80 w-full h-full min-h-[300px] aspect-video shadow-2xl flex items-center justify-center group">
      {hasVideo ? (
        <video
          ref={setVideoRef}
          autoPlay
          playsInline
          muted={isLocal}
          style={{ transform: isLocal ? 'scaleX(-1)' : 'none' }}
          className="absolute inset-0 w-full h-full object-cover rounded-3xl"
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-6 text-center z-10">
          <Avatar name={name || 'Participant'} size="xl" />
          <p className="mt-3 font-bold text-base text-slate-100">{name}</p>
          {username && <p className="text-xs text-indigo-400 font-mono">@{username}</p>}
        </div>
      )}

      {/* Overlay Badge */}
      <div className="absolute bottom-4 left-4 z-20 bg-slate-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-2xl text-xs text-slate-200 border border-slate-800 flex items-center gap-2 shadow-lg">
        <span className="font-bold truncate max-w-32">{isLocal ? 'You' : name}</span>
        {username && <span className="text-[11px] text-indigo-400 font-mono">@{username}</span>}
        {isMuted ? (
          <span className="px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-400 text-[10px] font-bold">Muted</span>
        ) : (
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse ml-0.5"></span>
        )}
      </div>
    </div>
  );
};

export default function ActiveCallOverlay() {
  const {
    callState,
    callInfo,
    localStream,
    remoteStreams,
    isMuted,
    isCameraOff,
    isFullScreen,
    setIsFullScreen,
    callDuration,
    endCall,
    toggleMic,
    toggleCamera,
    start1toMCall,
  } = useCall();

  const { token } = useAuth();
  const { socket } = useSocket();
  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState('auto'); // 'auto' | 'voice' | 'video'
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteQuery, setInviteQuery] = useState('');
  const [searchUsers, setSearchUsers] = useState([]);
  const [searching, setSearching] = useState(false);
  const [invitedUserIds, setInvitedUserIds] = useState(new Set());
  const [copiedCode, setCopiedCode] = useState(false);

  if (callState !== 'active') return null;

  const isAudioCall = callInfo?.callType === 'audio' || isCameraOff;
  const isVoiceView = viewMode === 'voice' || (viewMode === 'auto' && isAudioCall);
  const totalCount = 1 + (remoteStreams?.length || 0);
  const mainPeer = remoteStreams[0];
  const calleeName = callInfo?.calleeInfo?.name || mainPeer?.username || 'Peer';
  const calleeUsername = callInfo?.calleeInfo?.username || mainPeer?.username;

  // Search users for invite modal
  useEffect(() => {
    if (!isInviteModalOpen) return;
    const search = async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(inviteQuery)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSearchUsers(data.users || []);
        }
      } catch (err) {
        console.error('Error searching users for call invite:', err);
      } finally {
        setSearching(false);
      }
    };
    const t = setTimeout(search, 250);
    return () => clearTimeout(t);
  }, [inviteQuery, isInviteModalOpen, token]);

  const handleCopyCode = () => {
    const code = callInfo?.roomCode || 'PULSE-8821';
    navigator.clipboard?.writeText(code);
    setCopiedCode(true);
    showToast(`Copied room code ${code} to clipboard!`, 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleInviteUser = (u) => {
    setInvitedUserIds((prev) => new Set(prev).add(u._id));
    const roomCode = callInfo?.roomCode || 'PULSE-8821';

    // Emit socket invite event if available
    if (socket) {
      socket.emit('call:invite:room', {
        targetUserId: u._id,
        roomCode,
      });
    }

    showToast(`Invited @${u.username} to join room ${roomCode}!`, 'success');
  };

  // Dynamic responsive grid styles based on participant count
  const getGridColsClass = () => {
    if (totalCount === 1) return 'grid-cols-1 max-w-2xl mx-auto';
    if (totalCount === 2) return 'grid-cols-1 md:grid-cols-2';
    if (totalCount <= 4) return 'grid-cols-2';
    return 'grid-cols-2 md:grid-cols-3';
  };

  /* ── 1. Floating Minimized Picture-in-Picture Bar (when !isFullScreen) ── */
  if (!isFullScreen) {
    return (
      <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-3 shadow-2xl flex items-center space-x-3.5 animate-fade-in text-slate-100 max-w-md">
        <div className="relative shrink-0">
          <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold truncate text-slate-100">{calleeName}</div>
          <div className="text-[11px] font-mono text-cyan-400 font-semibold">{callDuration}</div>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            type="button"
            onClick={toggleMic}
            title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
            className={`p-2 rounded-xl text-xs transition-colors cursor-pointer ${
              isMuted ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={toggleCamera}
            title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
            className={`p-2 rounded-xl text-xs transition-colors cursor-pointer ${
              isCameraOff ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            {isCameraOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setIsFullScreen(true)}
            title="Expand Full Screen"
            className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center space-x-1 cursor-pointer transition-colors shadow-md"
          >
            <Maximize2 className="w-4 h-4" />
            <span className="hidden sm:inline">Expand</span>
          </button>

          <button
            type="button"
            onClick={endCall}
            title="End Call"
            className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white cursor-pointer transition-colors shadow-md"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  /* ── 2. Full-Screen Active Call Overlay ───────────────────────────────── */
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex flex-col p-4 md:p-6 animate-fade-in">
      {/* Invite Participants Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Add Participants to Call"
        subtitle="Search users by @username or share the meeting room code"
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Meeting Room Code</div>
              <div className="text-sm font-mono font-bold text-cyan-400">{callInfo?.roomCode || 'PULSE-8821'}</div>
            </div>
            <Button onClick={handleCopyCode} variant="secondary" size="sm" className="rounded-xl">
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
            </Button>
          </div>

          <div>
            <Input
              icon={AtSign}
              placeholder="Search user by @username..."
              value={inviteQuery}
              onChange={(e) => setInviteQuery(e.target.value)}
              autoFocus
            />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {searching ? (
              <div className="py-6 text-center text-xs font-semibold text-slate-400">Searching users...</div>
            ) : searchUsers.length === 0 ? (
              <div className="py-6 text-center text-xs font-medium text-slate-400">
                {inviteQuery ? `No user found for "@${inviteQuery}"` : 'Type a username above to invite friends'}
              </div>
            ) : (
              searchUsers.map((u) => {
                const isInvited = invitedUserIds.has(u._id);
                return (
                  <div key={u._id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                    <div className="flex items-center space-x-3">
                      <Avatar initial={u.avatarInitial} name={u.name} size="md" />
                      <div>
                        <h4 className="text-sm font-bold text-slate-100">{u.name}</h4>
                        <p className="text-xs font-medium text-slate-400">@{u.username}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleInviteUser(u)}
                      disabled={isInvited}
                      variant={isInvited ? 'secondary' : 'primary'}
                      size="sm"
                      className="px-4 rounded-xl"
                    >
                      {isInvited ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <UserPlus className="w-3.5 h-3.5" />}
                      <span>{isInvited ? 'Invited' : 'Invite'}</span>
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>

      {/* --- Top Header Bar --- */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
          <div>
            <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
              {callInfo?.isRoomCall
                ? `1:M Meeting Room (${callInfo.roomCode})`
                : `${isVoiceView ? 'Voice Call' : 'Video Call'} · ${calleeName}`}
            </h3>
            <p className="text-xs text-slate-400">
              {totalCount} Active Participant{totalCount > 1 ? 's' : ''} · {callDuration}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Add Participant Button */}
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            title="Invite People to Call"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Participant</span>
          </button>

          {/* View Mode Switcher */}
          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewMode('voice')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                isVoiceView ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Voice Screen
            </button>
            <button
              onClick={() => setViewMode('video')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                !isVoiceView ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Video Grid
            </button>
          </div>

          {/* Minimize Button */}
          <button
            onClick={() => setIsFullScreen(false)}
            className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            title="Minimize to Floating Bar"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Minimize</span>
          </button>
        </div>
      </div>

      {/* --- Main Call Preview Content --- */}
      <div className="flex-1 my-4 overflow-y-auto min-h-0 flex items-center justify-center">
        {isVoiceView ? (
          /* FULL SCREEN VOICE CALL PREVIEW */
          <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-900/60 rounded-3xl border border-slate-800/80 max-w-lg w-full shadow-2xl relative overflow-hidden">
            <div className="absolute w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none animate-pulse"></div>

            <div className="relative mb-6">
              <div className="w-36 h-36 md:w-44 md:h-44 rounded-full pulse-gradient-bg flex items-center justify-center text-white text-5xl font-black shadow-2xl shadow-cyan-500/20 border-4 border-slate-800">
                {calleeName.charAt(0).toUpperCase()}
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-cyan-400/50 animate-ping opacity-60"></div>
            </div>

            <h3 className="font-extrabold text-2xl text-slate-100">{calleeName}</h3>
            {calleeUsername && (
              <p className="text-sm text-cyan-400 font-mono mt-1">@{calleeUsername}</p>
            )}

            <div className="flex items-center gap-1.5 my-5">
              <span className="w-1.5 h-6 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-9 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-12 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              <span className="w-1.5 h-8 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '450ms' }}></span>
              <span className="w-1.5 h-5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '600ms' }}></span>
            </div>

            <p className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
              Voice Call Live · {callDuration}
            </p>
          </div>
        ) : (
          /* 1:M RESPONSIVE VIDEO GRID */
          <div className={`grid gap-4 w-full h-full max-h-[75vh] ${getGridColsClass()}`}>
            {/* Local Stream Tile */}
            <VideoTile
              stream={localStream}
              isLocal={true}
              name="You"
              isMuted={isMuted}
              isCameraOff={isCameraOff}
            />

            {/* Remote Participants Stream Tiles */}
            {remoteStreams.map((peer) => (
              <VideoTile
                key={peer.peerId}
                stream={peer.stream}
                isLocal={false}
                name={peer.username || 'Participant'}
                username={peer.username}
                isMuted={false}
                isCameraOff={false}
              />
            ))}

            {/* Waiting for peers message if only local stream in room */}
            {remoteStreams.length === 0 && callInfo?.isRoomCall && (
              <div className="bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 flex flex-col items-center justify-center p-6 text-center">
                <Users className="w-10 h-10 text-cyan-400/60 mb-2 animate-bounce" />
                <p className="text-sm font-semibold text-slate-300">Waiting for participants to join...</p>
                <p className="text-xs text-slate-500 mt-1">Share code <span className="font-mono text-cyan-400">{callInfo.roomCode}</span> to invite others.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- Floating Bottom Control Toolbar --- */}
      <div className="pt-4 border-t border-slate-800 flex items-center justify-center gap-3">
        {/* Toggle Mic */}
        <button
          onClick={toggleMic}
          className={`p-3.5 rounded-2xl transition-all cursor-pointer shadow-lg ${
            isMuted
              ? 'bg-rose-600/90 text-white shadow-rose-600/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
          title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Toggle Camera */}
        <button
          onClick={() => {
            toggleCamera();
            if (isCameraOff) setViewMode('video');
          }}
          className={`p-3.5 rounded-2xl transition-all cursor-pointer shadow-lg ${
            isCameraOff
              ? 'bg-rose-600/90 text-white shadow-rose-600/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
          title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
        >
          {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>

        {/* Add Participant Button */}
        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="p-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/40 transition-all cursor-pointer shadow-lg flex items-center gap-2"
          title="Add Participant"
        >
          <UserPlus className="w-5 h-5" />
          <span className="hidden sm:inline text-xs font-bold">Add Participant</span>
        </button>

        {/* End Call Button */}
        <button
          onClick={endCall}
          className="bg-rose-600 hover:bg-rose-500 text-white font-semibold py-3.5 px-6 rounded-2xl shadow-xl shadow-rose-600/40 transition-all flex items-center gap-2 cursor-pointer"
        >
          <PhoneOff className="w-5 h-5" />
          <span>End Call</span>
        </button>
      </div>
    </div>
  );
}
