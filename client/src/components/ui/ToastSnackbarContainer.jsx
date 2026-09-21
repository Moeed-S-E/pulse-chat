import React, { useContext } from 'react';
import { useToast } from '../../context/ToastContext';
import { CallContext } from '../../context/CallContext';
import Avatar from './Avatar';

const ToastSnackbarContainer = () => {
  const { toasts, removeToast } = useToast();
  const callContext = useContext(CallContext);
  const { callState, callInfo, acceptCall, declineCall, endCall, setIsFullScreen } = callContext || {};

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {/* --- OUTGOING CALL RINGING SNACKBAR --- */}
      {callState === 'outgoing' && callInfo && (
        <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-xl border border-cyan-500/50 shadow-2xl shadow-cyan-500/20 rounded-2xl p-4 flex flex-col gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar
                name={callInfo.calleeInfo?.name || 'User'}
                initial={callInfo.calleeInfo?.avatarInitial}
                color={callInfo.calleeInfo?.avatarColor}
                size="md"
              />
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500"></span>
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="font-semibold text-slate-100 text-sm truncate">
                  {callInfo.calleeInfo?.name || 'User'}
                </h4>
                {callInfo.calleeInfo?.username && (
                  <span className="text-xs text-cyan-400 font-mono">
                    @{callInfo.calleeInfo.username}
                  </span>
                )}
              </div>
              <p className="text-xs text-cyan-300 flex items-center gap-1 mt-0.5 animate-pulse">
                Ringing recipient...
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
            <button
              onClick={() => setIsFullScreen(true)}
              className="flex-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/40 text-xs font-semibold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              Full Screen
            </button>
            <button
              onClick={endCall}
              className="bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {/* --- INCOMING CALL SNACKBAR --- */}
      {callState === 'incoming' && callInfo && (
        <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-xl border border-cyan-500/50 shadow-2xl shadow-cyan-500/20 rounded-2xl p-4 animate-bounce-short flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar
                name={callInfo.callerInfo?.name || 'User'}
                initial={callInfo.callerInfo?.avatarInitial}
                color={callInfo.callerInfo?.avatarColor}
                size="md"
              />
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="font-semibold text-slate-100 text-sm truncate">
                  {callInfo.callerInfo?.name || 'Caller'}
                </h4>
                {callInfo.callerInfo?.username && (
                  <span className="text-xs text-cyan-400 font-mono">
                    @{callInfo.callerInfo.username}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <svg className="w-3.5 h-3.5 text-emerald-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Incoming Video Call...
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
            <button
              onClick={acceptCall}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2 px-3 rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Accept Call
            </button>
            <button
              onClick={declineCall}
              className="bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-medium py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* --- GENERAL TOAST SNACKBARS --- */}
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-xs font-medium shadow-xl backdrop-blur-md transition-all animate-fade-in ${isSuccess
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
              : isError
                ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
                : 'bg-slate-900/90 border-cyan-500/40 text-slate-200'
              }`}
          >
            <div className="flex items-center gap-2.5">
              {isSuccess && (
                <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {isError && (
                <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {!isSuccess && !isError && (
                <svg className="w-4 h-4 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
            >
              &times;
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ToastSnackbarContainer;
