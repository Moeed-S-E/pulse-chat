import React from 'react';
import { Video, PhoneOff, ShieldCheck, Activity } from 'lucide-react';
import { useCall } from '../../context/CallContext';

export default function IncomingCallOverlay() {
  const { callState, callInfo, acceptCall, declineCall } = useCall();

  if (callState !== 'incoming') return null;

  const callerName = callInfo?.callerInfo?.name || callInfo?.callerInfo?.username || 'Someone';
  const callerUsername = callInfo?.callerInfo?.username || '';
  const initial = callInfo?.callerInfo?.avatarInitial || callerName.charAt(0);

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
          <span>Encrypted 1:1 Call</span>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center my-auto">
        <div className="relative mb-6">
          <div className="w-32 h-32 rounded-full pulse-gradient-bg flex items-center justify-center text-white font-extrabold text-4xl shadow-2xl animate-ring-pulse">
            {initial}
          </div>
        </div>

        <h2 className="text-2xl font-extrabold tracking-tight text-white mb-1">
          {callerName}
        </h2>
        {callerUsername && (
          <p className="text-sm font-medium text-slate-400 mb-3">
            @{callerUsername}
          </p>
        )}
        <p className="text-xs font-semibold text-emerald-400 tracking-wider uppercase animate-pulse">
          Incoming video call...
        </p>
      </div>

      <div className="flex items-center justify-center space-x-8 pb-8">
        <button
          onClick={declineCall}
          className="flex flex-col items-center space-y-2 group"
        >
          <div className="w-16 h-16 rounded-full bg-[#E63946] hover:bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/40 group-active:scale-95 transition-all">
            <PhoneOff className="w-7 h-7" />
          </div>
          <span className="text-xs font-bold text-slate-300">Decline</span>
        </button>

        <button
          onClick={acceptCall}
          className="flex flex-col items-center space-y-2 group"
        >
          <div className="w-16 h-16 rounded-full bg-[#1E8E3E] hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/40 group-active:scale-95 transition-all animate-bounce">
            <Video className="w-7 h-7 fill-white" />
          </div>
          <span className="text-xs font-bold text-emerald-400">Accept</span>
        </button>
      </div>
    </div>
  );
}
