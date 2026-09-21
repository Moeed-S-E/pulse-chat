import React, { useState, useEffect, useRef } from 'react';
import { useCall } from '../../context/CallContext';
import { useToast } from '../../context/ToastContext';
import Avatar from '../ui/Avatar';

// Individual Video Tile component for attached MediaStream
const VideoTile = ({ stream, isLocal, name, username, isMuted, isCameraOff }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative bg-slate-950/80 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center min-h-55 shadow-lg group">
      {stream && !isCameraOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover rounded-2xl ${isLocal ? '-scale-x-1' : ''}`}
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <Avatar name={name || 'Participant'} size="xl" />
          <p className="mt-3 font-semibold text-sm text-slate-200">{name}</p>
          {username && <p className="text-xs text-cyan-400 font-mono">@{username}</p>}
        </div>
      )}

      {/* Overlay Badge */}
      <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-xl text-xs text-slate-200 border border-slate-700/60 flex items-center gap-1.5 shadow-md">
        <span className="font-medium truncate max-w-30">{isLocal ? 'You' : name}</span>
        {username && <span className="text-[10px] text-cyan-400 font-mono">@{username}</span>}
        {isMuted ? (
          <svg className="w-3.5 h-3.5 text-rose-400 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        ) : (
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1"></span>
        )}
      </div>
    </div>
  );
};

const ActiveCallOverlay = () => {
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
  } = useCall();
  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState('auto'); // 'auto' | 'voice' | 'video'

  if (callState !== 'active' && !isFullScreen) return null;

  const isAudioCall = callInfo?.callType === 'audio' || isCameraOff;
  const isVoiceView = viewMode === 'voice' || (viewMode === 'auto' && isAudioCall);
  const totalCount = 1 + (remoteStreams?.length || 0);
  const mainPeer = remoteStreams[0];
  const calleeName = callInfo?.calleeInfo?.name || mainPeer?.username || 'Peer';
  const calleeUsername = callInfo?.calleeInfo?.username || mainPeer?.username;

  // Dynamic responsive grid styles based on participant count
  const getGridColsClass = () => {
    if (totalCount === 1) return 'grid-cols-1 max-w-2xl mx-auto';
    if (totalCount === 2) return 'grid-cols-1 md:grid-cols-2';
    if (totalCount <= 4) return 'grid-cols-2';
    return 'grid-cols-2 md:grid-cols-3';
  };

  const handleCopyCode = () => {
    if (callInfo?.roomCode) {
      navigator.clipboard?.writeText(callInfo.roomCode);
      showToast(`Copied meeting code ${callInfo.roomCode} to clipboard!`, 'success');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex flex-col p-4 md:p-6 animate-fade-in">
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

          {/* Minimize to Snackbar button */}
          <button
            onClick={() => setIsFullScreen(false)}
            className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            title="Minimize to Floating Snackbar"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            Minimize
          </button>

          {/* Room Code Badge */}
          {callInfo?.roomCode && (
            <button
              onClick={handleCopyCode}
              className="bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-300 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {callInfo.roomCode}
            </button>
          )}
        </div>
      </div>

      {/* --- Main Call Preview Content --- */}
      <div className="flex-1 my-4 overflow-y-auto min-h-0 flex items-center justify-center">
        {isVoiceView ? (
          /* FULL SCREEN VOICE CALL PREVIEW */
          <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-900/60 rounded-3xl border border-slate-800/80 max-w-lg w-full shadow-2xl relative overflow-hidden">
            {/* Glowing Ambient Light Rings */}
            <div className="absolute w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none animate-pulse"></div>

            {/* Avatar with Pulsing Aura */}
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

            {/* Live Audio Waveform Animation */}
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
                <svg className="w-10 h-10 text-cyan-400/60 mb-2 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-sm font-semibold text-slate-300">Waiting for participants to join...</p>
                <p className="text-xs text-slate-500 mt-1">Share code <span className="font-mono text-cyan-400">{callInfo.roomCode}</span> to invite others.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- Floating Bottom Control Toolbar --- */}
      <div className="pt-4 border-t border-slate-800 flex items-center justify-center gap-4">
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
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </button>

        {/* Toggle Camera (Switch from Voice Call to Video Call) */}
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
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>

        {/* Copy Meeting Code */}
        {callInfo?.roomCode && (
          <button
            onClick={handleCopyCode}
            className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 transition-all cursor-pointer shadow-lg"
            title="Copy Meeting Room Code"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        )}

        {/* End Call Button */}
        <button
          onClick={endCall}
          className="bg-rose-600 hover:bg-rose-500 text-white font-semibold py-3.5 px-6 rounded-2xl shadow-xl shadow-rose-600/40 transition-all flex items-center gap-2 cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.684A1 1 0 008.279 3H5z" />
          </svg>
          End Call
        </button>
      </div>
    </div>
  );
};

export default ActiveCallOverlay;
