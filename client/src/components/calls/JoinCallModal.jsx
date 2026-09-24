import React, { useState } from 'react';
import { X, Video, AtSign, Key, Sparkles, PhoneCall } from 'lucide-react';
import { useCall } from '../../context/CallContext';

export default function JoinCallModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('username'); // 'username' | 'code' | 'instant'
  const [usernameInput, setUsernameInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const { startCallByUsername, joinRoomCall } = useCall();

  if (!isOpen) return null;

  const handleCallUsername = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!usernameInput.trim()) return;

    setLoading(true);
    try {
      await startCallByUsername(usernameInput);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to initiate video call to user.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinByCode = (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!codeInput.trim()) return;

    try {
      joinRoomCall(codeInput);
      onClose();
    } catch {
      setErrorMsg('Failed to join video call with this code.');
    }
  };

  const handleCreateInstantMeeting = () => {
    const randomCode = 'PULSE-' + Math.floor(1000 + Math.random() * 9000);
    joinRoomCall(randomCode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl pulse-gradient-bg flex items-center justify-center text-white shadow-md shadow-emerald-500/30">
              <Video className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                PulseChat Video Calls
              </h2>
              <p className="text-xs font-medium text-slate-500">
                Call by @username or join using a Meeting Code
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-xs font-semibold text-center">
            {errorMsg}
          </div>
        )}

        {/* Tab Switcher */}
        <div className="p-1 bg-slate-100 rounded-2xl flex items-center space-x-1 mb-5">
          <button
            type="button"
            onClick={() => { setActiveTab('username'); setErrorMsg(''); }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-1 transition-all ${
              activeTab === 'username'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <AtSign className="w-3.5 h-3.5 text-emerald-600" />
            <span>By Username</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('code'); setErrorMsg(''); }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-1 transition-all ${
              activeTab === 'code'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-emerald-600" />
            <span>Join by Code</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('instant'); setErrorMsg(''); }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-1 transition-all ${
              activeTab === 'instant'
                ? 'pulse-gradient-bg text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>New Meeting</span>
          </button>
        </div>

        {/* Tab 1: Call by Username */}
        {activeTab === 'username' && (
          <form onSubmit={handleCallUsername} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Target @username
              </label>
              <div className="relative">
                <AtSign className="w-5 h-5 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="samuel or alex_rivera"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                />
              </div>
              <p className="text-[11px] font-medium text-slate-500 mt-1.5">
                Initiate a direct 1:1 video call with any PulseChat handle.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !usernameInput.trim()}
              className="w-full py-3.5 rounded-2xl pulse-gradient-bg text-white font-bold text-sm shadow-lg shadow-emerald-500/30 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <PhoneCall className="w-4 h-4" />
              <span>{loading ? 'Calling User...' : 'Start Video Call'}</span>
            </button>
          </form>
        )}

        {/* Tab 2: Join by Meeting Code */}
        {activeTab === 'code' && (
          <form onSubmit={handleJoinByCode} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Meeting Code
              </label>
              <div className="relative">
                <Key className="w-5 h-5 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="e.g. PULSE-8294"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-extrabold uppercase text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all tracking-wider"
                />
              </div>
              <p className="text-[11px] font-medium text-slate-500 mt-1.5">
                Anyone with this code can join the video call room.
              </p>
            </div>

            <button
              type="submit"
              disabled={!codeInput.trim()}
              className="w-full py-3.5 rounded-2xl pulse-gradient-bg text-white font-bold text-sm shadow-lg shadow-emerald-500/30 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Video className="w-4 h-4 fill-white" />
              <span>Join Call with Code</span>
            </button>
          </form>
        )}

        {/* Tab 3: Create Instant Meeting */}
        {activeTab === 'instant' && (
          <div className="space-y-4 text-center py-2">
            <div className="w-14 h-14 rounded-3xl pulse-gradient-bg mx-auto flex items-center justify-center text-white shadow-xl shadow-emerald-500/30">
              <Sparkles className="w-7 h-7 animate-spin-slow" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-slate-900">
                Instant Video Room
              </h4>
              <p className="text-xs font-medium text-slate-500 max-w-xs mx-auto mt-1">
                Generates a unique 6-character room code that you can copy and share with anyone to join!
              </p>
            </div>

            <button
              type="button"
              onClick={handleCreateInstantMeeting}
              className="w-full py-3.5 rounded-2xl pulse-gradient-bg text-white font-bold text-sm shadow-lg shadow-emerald-500/30 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center space-x-2"
            >
              <Video className="w-4 h-4 fill-white" />
              <span>Generate Meeting & Start Call</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
