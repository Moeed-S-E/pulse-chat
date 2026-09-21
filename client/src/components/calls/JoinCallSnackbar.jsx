import React, { useState } from 'react';
import { useCall } from '../../context/CallContext';
import { useToast } from '../../context/ToastContext';

const JoinCallSnackbar = ({ isOpen, onClose }) => {
  const { startCallByUsername, joinRoomCall } = useCall();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('username'); // 'username' | 'code'
  const [usernameInput, setUsernameInput] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleCallUsername = async (e) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;

    setLoading(true);
    try {
      const cleanName = usernameInput.trim().replace(/^@/, '');
      await startCallByUsername(cleanName);
      showToast(`Initiating video call to @${cleanName}...`, 'info');
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to start call.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinByCode = (e) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return;

    const cleanCode = roomCodeInput.toUpperCase().trim();
    joinRoomCall(cleanCode);
    showToast(`Joined 1:M Video Room ${cleanCode}`, 'success');
    onClose();
  };

  const handleInstantMeeting = () => {
    const randomCode = `PULSE-${Math.floor(1000 + Math.random() * 9000)}`;
    joinRoomCall(randomCode);
    navigator.clipboard?.writeText(randomCode);
    showToast(`Started instant meeting! Code ${randomCode} copied to clipboard`, 'success');
    onClose();
  };

  return (
    <div className="fixed top-16 right-6 z-40 w-84 bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/60 shadow-xl rounded-3xl p-5 text-slate-900 dark:text-slate-100 animate-fade-in">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <h3 className="font-extrabold text-sm text-pulse-blue flex items-center gap-2">
          <svg className="w-4 h-4 text-pulse-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Quick Video Call
        </h3>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
        >
          &times;
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 dark:bg-pulse-dark-bg p-1 rounded-2xl my-3 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('username')}
          className={`flex-1 py-1.5 rounded-xl transition-all ${
            activeTab === 'username'
              ? 'bg-white dark:bg-[#1E293B] text-pulse-blue dark:text-[#7C8BFF] shadow-sm font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Call @Username
        </button>
        <button
          onClick={() => setActiveTab('code')}
          className={`flex-1 py-1.5 rounded-xl transition-all ${
            activeTab === 'code'
              ? 'bg-white dark:bg-[#1E293B] text-pulse-blue dark:text-[#7C8BFF] shadow-sm font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Join Code
        </button>
      </div>

      {/* Tab 1: Username Call */}
      {activeTab === 'username' && (
        <form onSubmit={handleCallUsername} className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Recipient Handle
            </label>
            <input
              type="text"
              placeholder="e.g. samuel"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              className="w-full bg-slate-50 dark:bg-pulse-dark-bg border border-slate-200 dark:border-slate-800 focus:border-pulse-blue focus:ring-4 focus:ring-pulse-blue/10 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 outline-none transition-all placeholder:text-slate-400 font-medium"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !usernameInput.trim()}
            className="w-full bg-pulse-blue hover:bg-[#4B5CEE] disabled:opacity-50 text-white font-bold py-2.5 rounded-2xl text-xs shadow-md shadow-pulse-blue/20 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            {loading ? 'Resolving User...' : 'Start Direct Video Call'}
          </button>
        </form>
      )}

      {/* Tab 2: Join by Room Code */}
      {activeTab === 'code' && (
        <form onSubmit={handleJoinByCode} className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Meeting Room Code
            </label>
            <input
              type="text"
              placeholder="e.g. PULSE-8821"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value)}
              className="w-full bg-slate-50 dark:bg-pulse-dark-bg border border-slate-200 dark:border-slate-800 focus:border-pulse-blue focus:ring-4 focus:ring-pulse-blue/10 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 font-mono outline-none transition-all placeholder:text-slate-400 uppercase"
            />
          </div>
          <button
            type="submit"
            disabled={!roomCodeInput.trim()}
            className="w-full bg-pulse-blue hover:bg-[#4B5CEE] disabled:opacity-50 text-white font-bold py-2.5 rounded-2xl text-xs shadow-md shadow-pulse-blue/20 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            Join 1:M Meeting Room
          </button>
        </form>
      )}

      {/* Instant Meeting Action */}
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={handleInstantMeeting}
          className="w-full bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 py-2.5 rounded-2xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          Create Instant Meeting Room
        </button>
      </div>
    </div>
  );
};

export default JoinCallSnackbar;
