import React, { useState, useRef, useEffect } from 'react';
import { Video, Phone, MoreVertical, Hash, Copy, Check, BellOff, ArrowLeft, Trash2 } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export default function ChatHeader({
  channel,
  currentUser,
  isOtherOnline,
  onStartVideoCall,
  onStartVoiceCall,
  onBack,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef(null);
  const { showToast } = useToast();
  const { token } = useAuth();

  const isDM = channel?.isDM;
  const otherMember = isDM
    ? channel.memberIds?.find((m) => m._id !== currentUser?._id)
    : null;

  const memberCount = channel?.memberIds?.length || 0;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyHandle = () => {
    const textToCopy = isDM ? `@${otherMember?.username}` : `#${channel.name}`;
    navigator.clipboard?.writeText(textToCopy);
    setCopied(true);
    showToast(`Copied ${textToCopy} to clipboard`, 'success');
    setTimeout(() => setCopied(false), 2000);
    setMenuOpen(false);
  };

  const handleMuteToggle = () => {
    showToast(`Notifications muted for ${isDM ? otherMember?.name : channel.name}`, 'info');
    setMenuOpen(false);
  };

  const handleDeleteChat = async () => {
    if (!channel?._id || !token) return;
    const name = isDM ? (otherMember?.name || 'User') : `#${channel.name}`;
    if (!window.confirm(`Are you sure you want to delete the chat "${name}"? All messages will be permanently deleted.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/channels/${channel._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast('Chat deleted successfully', 'success');
        setMenuOpen(false);
        if (onBack) onBack();
      } else {
        const err = await res.json();
        showToast(err.message || 'Failed to delete chat', 'error');
      }
    } catch (e) {
      console.error('Error deleting chat:', e);
      showToast('Failed to delete chat', 'error');
    }
  };

  return (
    <div className="h-16 px-4 sm:px-6 bg-white/85 dark:bg-[#111827]/85 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between shrink-0 shadow-xs z-20 transition-colors relative">
      <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="md:hidden w-9 h-9 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
            title="Back to Channels"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}

        {isDM ? (
          <Avatar
            initial={otherMember?.avatarInitial}
            name={otherMember?.name}
            avatarColor={otherMember?.avatarColor}
            isOnline={isOtherOnline}
            size="md"
          />
        ) : (
          <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-pulse-blue">
            <Hash className="w-5 h-5" />
          </div>
        )}

        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              {isDM ? otherMember?.name : `#${channel.name}`}
            </h3>
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
            <span>
              {isDM
                ? `@${otherMember?.username}`
                : channel.description || `Public group · ${memberCount} members`}
            </span>
            {isDM && (
              <>
                <span>•</span>
                <span className={isOtherOnline ? 'text-[#1E8E3E] font-semibold' : 'text-slate-400 dark:text-slate-500'}>
                  {isOtherOnline ? 'Active now' : 'Offline'}
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Prominent Call Actions & 3-Dots Dropdown Menu */}
      <div className="flex items-center space-x-3 relative" ref={menuRef}>
        {isDM && (
          <>
            <button
              onClick={onStartVoiceCall}
              title="Start Voice Call"
              className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-pulse-blue/10 dark:hover:bg-pulse-blue/20 hover:text-pulse-blue flex items-center justify-center text-slate-600 dark:text-slate-200 transition-colors cursor-pointer"
            >
              <Phone className="w-4 h-4 fill-current" />
            </button>

            <button
              onClick={onStartVideoCall}
              title="Start Video Call"
              className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-pulse-blue/10 dark:hover:bg-pulse-blue/20 hover:text-pulse-blue flex items-center justify-center text-slate-600 dark:text-slate-200 transition-colors cursor-pointer"
            >
              <Video className="w-4 h-4" />
            </button>
          </>
        )}

        {/* 3 Dots Menu Button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          title="More Options"
          className={`w-9 h-9 rounded-full transition-colors flex items-center justify-center cursor-pointer ${menuOpen
            ? 'bg-[#5B6CFF] text-white shadow-md'
            : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {/* Dropdown Popover */}
        {menuOpen && (
          <div className="absolute right-0 top-12 w-64 bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-700/60 shadow-2xl rounded-2xl p-2 text-slate-900 dark:text-slate-100 z-50 animate-fade-in space-y-1">
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {isDM ? otherMember?.name : `#${channel.name}`}
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {isDM ? `@${otherMember?.username}` : `${memberCount} active members`}
              </p>
            </div>

            {isDM && (
              <>
                <button
                  onClick={() => {
                    onStartVoiceCall();
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2.5 transition-colors cursor-pointer"
                >
                  <Phone className="w-4 h-4 text-[#5B6CFF]" />
                  <span>Start Voice Call</span>
                </button>
                <button
                  onClick={() => {
                    onStartVideoCall();
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2.5 transition-colors cursor-pointer"
                >
                  <Video className="w-4 h-4 text-[#5B6CFF]" />
                  <span>Start Video Call</span>
                </button>
              </>
            )}

            <button
              onClick={handleCopyHandle}
              className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
              <span>{copied ? 'Copied to Clipboard!' : `Copy ${isDM ? 'Handle' : 'Channel Name'}`}</span>
            </button>

            <button
              onClick={handleMuteToggle}
              className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2.5 transition-colors cursor-pointer text-slate-700 dark:text-slate-300"
            >
              <BellOff className="w-4 h-4 text-amber-500" />
              <span>Mute Notifications</span>
            </button>

            <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleDeleteChat}
                className="w-full text-left px-3 py-2 text-xs font-bold rounded-xl hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center space-x-2.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Chat History</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
