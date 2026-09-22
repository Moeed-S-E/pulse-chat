import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Phone,
  Video,
  Link,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  KeyRound,
  ShieldCheck,
  Plus,
  MessageSquare,
  Settings,
  Copy,
  Check,
  Trash2,
} from 'lucide-react';
import Avatar from '../ui/Avatar';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import { useSocket } from '../../context/SocketContext';

export default function CallsView({
  channels,
  activeView,
  onSelectView,
  onOpenJoinCall,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [createdCallLink, setCreatedCallLink] = useState(null); // { code, fullUrl }
  const [copiedLink, setCopiedLink] = useState(false);
  const [dbCallLogs, setDbCallLogs] = useState([]);

  const { user, token } = useAuth();
  const { startCall, joinRoomCall } = useCall();
  const { onlineUsers } = useSocket();
  const navigate = useNavigate();

  // Fetch backend call logs from /api/calls
  React.useEffect(() => {
    if (!token) return;
    fetch('/api/calls', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.calls) {
          setDbCallLogs(data.calls);
        }
      })
      .catch((err) => console.error('Error fetching DB call logs:', err));
  }, [token]);

  const handleClearAllCalls = async () => {
    if (!token) return;
    if (!window.confirm('Are you sure you want to clear your entire call history?')) return;
    try {
      const res = await fetch('/api/calls', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setDbCallLogs([]);
      }
    } catch (err) {
      console.error('Error clearing call logs:', err);
    }
  };

  const handleDeleteCallLog = async (callId) => {
    if (!token || !callId) return;
    try {
      const res = await fetch(`/api/calls/${callId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setDbCallLogs((prev) => prev.filter((log) => log._id !== callId));
      }
    } catch (err) {
      console.error('Error deleting call log:', err);
    }
  };

  // Extract all call logs from backend DB and channel messages
  const recentCalls = [];
  const logIds = new Set();

  dbCallLogs.forEach((log) => {
    const isCaller = log.callerId?._id === user?._id || log.callerId === user?._id;
    const otherMember = isCaller ? log.receiverId : log.callerId;
    logIds.add(log._id);
    recentCalls.push({
      id: log._id,
      channel: log.channelId,
      otherMember,
      isDM: Boolean(otherMember),
      name: otherMember?.name || (log.roomCode ? `Meeting: ${log.roomCode}` : 'Call Log'),
      avatarInitial: otherMember?.avatarInitial,
      avatarColor: otherMember?.avatarColor,
      isOutgoing: isCaller,
      duration: log.duration || '00:00',
      timestamp: log.createdAt || log.startedAt,
      status: log.status,
      isDbLog: true,
    });
  });

  channels.forEach((c) => {
    const isDM = c.isDM;
    const otherMember = isDM
      ? c.memberIds?.find((m) => m._id !== user?._id)
      : null;

    if (c.lastMessage && c.lastMessage.messageType === 'system_call') {
      const msgId = c.lastMessage._id || c._id;
      if (!logIds.has(msgId)) {
        const isOutgoing =
          c.lastMessage.senderId?._id === user?._id ||
          c.lastMessage.senderId === user?._id;

        recentCalls.push({
          id: msgId,
          channel: c,
          otherMember,
          isDM,
          name: isDM ? otherMember?.name || 'User' : `#${c.name}`,
          avatarInitial: otherMember?.avatarInitial,
          avatarColor: otherMember?.avatarColor,
          isOutgoing,
          duration: c.lastMessage.callDuration || '00:00',
          timestamp: c.lastMessage.createdAt || c.updatedAt,
          isDbLog: false,
        });
      }
    }
  });

  // Extract all contacts for starting new call
  const contactsMap = new Map();
  channels.forEach((c) => {
    if (c.isDM && c.memberIds) {
      const other = c.memberIds.find((m) => m._id !== user?._id);
      if (other && !contactsMap.has(other._id)) {
        contactsMap.set(other._id, { userObj: other, channelId: c._id });
      }
    }
  });
  const contactsList = Array.from(contactsMap.values());

  // Filter recent calls and contacts
  const filteredCalls = recentCalls.filter((call) =>
    call.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContacts = contactsList.filter(({ userObj }) =>
    userObj.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    userObj.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateCallLink = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const fullUrl = `${window.location.origin}/app?call=${code}`;
    setCreatedCallLink({ code, fullUrl });
    setCopiedLink(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAFC] dark:bg-pulse-dark-bg transition-colors select-none overflow-hidden relative">
      {/* Created Call Link Modal */}
      <Modal
        isOpen={Boolean(createdCallLink)}
        onClose={() => setCreatedCallLink(null)}
        title="Call Link Created"
        subtitle="Anyone with PulseChat can use this room code or link to join your encrypted meeting."
      >
        <div className="space-y-4">
          <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-center">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Meeting Room Code
            </div>
            <div className="text-2xl font-mono font-black text-pulse-blue tracking-wide">
              {createdCallLink?.code}
            </div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate px-2">
              {createdCallLink?.fullUrl}
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Button
              onClick={() => {
                navigator.clipboard?.writeText(createdCallLink?.fullUrl || '');
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2000);
              }}
              variant="secondary"
              className="flex-1 rounded-2xl py-2.5"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
            </Button>

            <Button
              onClick={() => {
                const code = createdCallLink?.code;
                setCreatedCallLink(null);
                if (code) joinRoomCall(code);
              }}
              variant="primary"
              className="flex-1 rounded-2xl py-2.5"
            >
              <Video className="w-4 h-4" />
              <span>Start Call Now</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* 1. Header (Clean & Un-cramped) */}
      <div className="p-4 sm:p-5 bg-white dark:bg-pulse-panel-bg border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-xs shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Calls & Meetings
          </h1>
          <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Encrypted HD voice & video calls
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenJoinCall}
            title="Join with Room Code"
            className="w-9 h-9 sm:w-auto sm:px-3 sm:py-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900/90 text-pulse-blue font-bold text-xs flex items-center justify-center space-x-1.5 transition-all border border-indigo-200/50 dark:border-indigo-800/50 cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
            <span className="hidden sm:inline">Join Code</span>
          </button>
          <button
            onClick={handleCreateCallLink}
            title="Create New Call Link"
            className="px-3.5 py-2 rounded-2xl pulse-gradient-bg hover:opacity-95 text-white font-bold text-xs flex items-center space-x-1.5 transition-all shadow-md shadow-pulse-blue/20 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Link</span>
          </button>
        </div>
      </div>

      {/* 2. Main Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-5 pb-20 md:pb-6">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recent calls or contacts..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-pulse-panel-bg border border-slate-200/80 dark:border-slate-800 rounded-2xl text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-pulse-blue shadow-xs transition-all"
          />
        </div>

        {/* "Create a Call Link" Banner (WhatsApp Style) */}
        <div
          onClick={handleCreateCallLink}
          className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-white dark:bg-pulse-panel-bg border border-slate-200/80 dark:border-slate-800 flex items-center space-x-3.5 cursor-pointer hover:border-pulse-blue/50 transition-all shadow-xs group"
        >
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl pulse-gradient-bg flex items-center justify-center text-white shadow-md shadow-pulse-blue/30 shrink-0 group-hover:scale-105 transition-transform">
            <Link className="w-5.5 h-5.5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-pulse-blue transition-colors">
              Create a Call Link
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Share a code or link for your video call
            </p>
          </div>
        </div>

        {/* Recent Calls Section */}
        <div>
          <div className="flex items-center justify-between mb-2.5 px-1">
            <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              Recent Calls Log
            </h2>
            {filteredCalls.length > 0 && (
              <button
                onClick={handleClearAllCalls}
                className="text-[11px] font-bold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 flex items-center space-x-1 cursor-pointer"
                title="Clear Call History"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}
          </div>

          {filteredCalls.length === 0 ? (
            <div className="p-6 text-center rounded-2xl sm:rounded-3xl bg-white dark:bg-pulse-panel-bg border border-slate-200/80 dark:border-slate-800 text-slate-400 text-xs font-medium">
              No recent call history found. Start a call with a contact below!
            </div>
          ) : (
            <div className="bg-white dark:bg-pulse-panel-bg rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/60 shadow-xs overflow-hidden">
              {filteredCalls.map((call) => {
                const isOnline = call.otherMember
                  ? call.otherMember.isOnline || onlineUsers.has(call.otherMember._id)
                  : false;

                return (
                  <div
                    key={call.id}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <Avatar
                        initial={call.avatarInitial}
                        name={call.name}
                        avatarColor={call.avatarColor}
                        isOnline={isOnline}
                        size="md"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {call.name}
                        </h4>
                        <div className="flex items-center space-x-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                          {call.isOutgoing ? (
                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <ArrowDownLeft className="w-3.5 h-3.5 text-pulse-blue shrink-0" />
                          )}
                          <Video className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>Video ({call.duration})</span>
                          <span>·</span>
                          <span>
                            {new Date(call.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                      {call.otherMember && (
                        <>
                          <button
                            onClick={() =>
                              startCall(
                                call.otherMember._id,
                                call.channel._id,
                                call.otherMember,
                                'audio'
                              )
                            }
                            title="Voice Call"
                            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-slate-700 dark:text-slate-300 hover:text-emerald-500 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Phone className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              startCall(
                                call.otherMember._id,
                                call.channel._id,
                                call.otherMember,
                                'video'
                              )
                            }
                            title="Video Call"
                            className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 text-pulse-blue flex items-center justify-center transition-colors cursor-pointer border border-indigo-200/40 dark:border-indigo-800/40"
                          >
                            <Video className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {call.isDbLog && (
                        <button
                          onClick={() => handleDeleteCallLog(call.id)}
                          title="Delete Call Log"
                          className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-500 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Start New Call / Contacts Section */}
        <div>
          <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2.5 px-1">
            Start a Call with Contacts
          </h2>

          <div className="bg-white dark:bg-pulse-panel-bg rounded-2xl sm:rounded-3xl    -slate-200/80 dark: -slate-800 divide-y divide-slate-100 dark:divide-slate-800/60 shadow-xs overflow-hidden">
            {filteredContacts.length === 0 ? (
              <div className="p-6 text-center text-xs font-medium text-slate-400">
                No direct message contacts available. Use Connect @username to start messaging!
              </div>
            ) : (
              filteredContacts.map(({ userObj, channelId }) => {
                const isOnline = userObj.isOnline || onlineUsers.has(userObj._id);

                return (
                  <div
                    key={userObj._id}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <Avatar
                        initial={userObj.avatarInitial}
                        name={userObj.name}
                        avatarColor={userObj.avatarColor}
                        isOnline={isOnline}
                        size="md"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {userObj.name}
                        </h4>
                        <p className="text-[10px] font-semibold text-slate-400 truncate">
                          @{userObj.username} · {isOnline ? 'Online' : 'Offline'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                      <button
                        onClick={() => startCall(userObj._id, channelId, userObj, 'audio')}
                        title="Voice Call"
                        className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-slate-700 dark:text-slate-300 hover:text-emerald-500 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => startCall(userObj._id, channelId, userObj, 'video')}
                        title="Video Call"
                        className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 text-pulse-blue flex items-center justify-center transition-colors cursor-pointer    -indigo-200/40 dark: -indigo-800/40"
                      >
                        <Video className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Security Footer */}
      </div>

      {/* 3. Mobile WhatsApp-Style Bottom Navigation Bar (< md) ALWAYS VISIBLE */}
      <div className="flex md:hidden items-center justify-around py-2 px-3 bg-slate-50 dark:bg-[#0B0F19]  -t  -slate-200/80 dark: -slate-800 shrink-0 z-20">
        {/* Chats Tab */}
        <button
          onClick={() => onSelectView && onSelectView('chats')}
          className={`flex flex-col items-center space-y-0.5 py-1 px-4 rounded-2xl transition-all cursor-pointer ${activeView === 'chats'
            ? 'bg-indigo-50 dark:bg-indigo-950/80 text-pulse-blue font-bold'
            : 'text-slate-500 dark:text-slate-400'
            }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px]">Chats</span>
        </button>

        {/* Calls Tab */}
        <button
          onClick={() => onSelectView && onSelectView('calls')}
          className={`flex flex-col items-center space-y-0.5 py-1 px-4 rounded-2xl transition-all cursor-pointer ${activeView === 'calls'
            ? 'bg-indigo-50 dark:bg-indigo-950/80 text-pulse-blue font-bold'
            : 'text-slate-500 dark:text-slate-400'
            }`}
        >
          <Phone className="w-5 h-5" />
          <span className="text-[10px]">Calls</span>
        </button>

        {/* Settings Tab */}
        <button
          onClick={() => navigate('/settings')}
          className="flex flex-col items-center space-y-0.5 py-1 px-4 rounded-2xl text-slate-500 dark:text-slate-400 transition-all cursor-pointer"
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px]">Settings</span>
        </button>
      </div>
    </div>
  );
}
