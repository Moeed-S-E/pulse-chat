import React from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, ShieldCheck, Activity } from 'lucide-react';
import { useCall } from '../../context/CallContext';

export default function OutgoingCallOverlay() {
  const { callState, callInfo, endCall, isMuted, isCameraOff, toggleMic, toggleCamera } = useCall();

  if (callState !== 'outgoing') return null;

  const targetName = callInfo?.calleeInfo?.name || 'User';
  const targetUsername = callInfo?.calleeInfo?.username || '';
  const initial = callInfo?.calleeInfo?.avatarInitial || targetName.charAt(0);

  return (
    <div className="fixed inset-0 z-50 bg-[#1A1A1E] text-white flex flex-col justify-between p-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400">
          <div className="w-7 h-7 rounded-lg pulse-gradient-bg flex items-center justify-center text-white">
            <Activity className="w-4 h-4" />
          </div>
          <span>PulseChat Video Call</span>
        </div>
        <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-emerald-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>End-to-end encrypted</span>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center my-auto">
        <div className="relative mb-6">
          <div className="w-32 h-32 rounded-full pulse-gradient-bg flex items-center justify-center text-white font-extrabold text-4xl shadow-2xl animate-ring-pulse">
            {initial}
          </div>
        </div>

        <h2 className="text-2xl font-extrabold tracking-tight text-white mb-1">
          {targetName}
        </h2>
        {targetUsername && (
          <p className="text-sm font-medium text-slate-400 mb-3">
            @{targetUsername}
          </p>
        )}
        <p className="text-xs font-semibold text-pulse-blue tracking-wider uppercase animate-pulse">
          Calling...
        </p>
      </div>

      <div className="flex items-center justify-center pb-6">
        <div className="call-glass-bar px-6 py-4 rounded-full flex items-center space-x-6 shadow-2xl">
          <button
            onClick={toggleMic}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isMuted ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleCamera}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isCameraOff ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          <button
            onClick={endCall}
            title="End Call"
            className="w-14 h-14 rounded-full bg-[#E63946] hover:bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/40 active:scale-95 transition-all"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
