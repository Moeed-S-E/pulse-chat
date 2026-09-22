import React, { useState, useEffect } from 'react';
import Sidebar from '../components/home/Sidebar';
import ChatView from '../components/home/ChatView';
import CallsView from '../components/calls/CallsView';
import ConnectModal from '../components/home/ConnectModal';
import JoinCallSnackbar from '../components/calls/JoinCallSnackbar';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { Hash, Search, Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  playMessageNotificationSound,
  showDesktopNotification,
  requestNotificationPermission,
} from '../utils/soundEffects';

export default function HomePage() {
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [activeView, setActiveView] = useState('chats'); // 'chats' | 'calls'
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [isJoinCallOpen, setIsJoinCallOpen] = useState(false);

  // Form state for Group / Channel creation
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const [loading, setLoading] = useState(false);

  const { token, user: currentUser } = useAuth();
  const { socket } = useSocket();

  const handleSelectChannel = (channel) => {
    setSelectedChannel(channel);
    setActiveView('chats');
    setMobileShowChat(true);
  };

  const handleSelectView = (view) => {
    setActiveView(view);
    setMobileShowChat(false);
  };

  const fetchChannels = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/channels', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.channels && data.channels.length > 0) {
          setChannels(data.channels);
          setSelectedChannel((prev) => {
            if (!prev) return data.channels[0];
            const found = data.channels.find((c) => c._id === prev._id);
            return found || data.channels[0];
          });
        } else {
          setChannels([]);
        }
      }
    } catch (err) {
      console.error('Error fetching channels:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, [token]);

  // In HomePage component:
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Real-time lastMessage & channel list update via socket
  useEffect(() => {
    if (!socket) return;

    const handleLastMessageUpdate = ({ channelId, lastMessage }) => {
      const senderId = lastMessage?.senderId?._id || lastMessage?.senderId;
      const isFromMe = senderId === currentUser?._id;

      if (!isFromMe && lastMessage?.messageType !== 'system_call') {
        playMessageNotificationSound();

        const senderName =
          lastMessage?.senderId?.name ||
          (lastMessage?.senderId?.username ? `@${lastMessage.senderId.username}` : 'PulseChat');
        const previewText =
          lastMessage?.messageType === 'image'
            ? '📷 Sent an image'
            : lastMessage?.content || 'Sent you a message';

        showDesktopNotification(`Message from ${senderName}`, {
          body: previewText,
        });
      }

      setChannels((prevChannels) => {
        const targetIndex = prevChannels.findIndex((c) => c._id === channelId);
        if (targetIndex === -1) {
          fetchChannels();
          return prevChannels;
        }

        const updatedChannel = {
          ...prevChannels[targetIndex],
          lastMessage,
          updatedAt: new Date().toISOString(),
        };

        const remaining = prevChannels.filter((c) => c._id !== channelId);
        return [updatedChannel, ...remaining];
      });
    };

    const handleChannelCreated = (newChannel) => {
      fetchChannels();
    };

    const handleChannelDeleted = ({ channelId }) => {
      setChannels((prev) => prev.filter((c) => c._id !== channelId));
      setSelectedChannel((prev) => (prev?._id === channelId ? null : prev));
    };

    socket.on('channel:last_message', handleLastMessageUpdate);
    socket.on('channel:created', handleChannelCreated);
    socket.on('channel:deleted', handleChannelDeleted);

    return () => {
      socket.off('channel:last_message', handleLastMessageUpdate);
      socket.off('channel:created', handleChannelCreated);
      socket.off('channel:deleted', handleChannelDeleted);
    };
  }, [socket, token, currentUser]);

  // Live member search when creating group / broadcast
  useEffect(() => {
    if (!isCreateChannelOpen || !token) return;

    const searchMembers = async () => {
      setSearchingUsers(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(memberSearchQuery)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSearchedUsers(data.users || []);
        }
      } catch (err) {
        console.error('Error searching members for group:', err);
      } finally {
        setSearchingUsers(false);
      }
    };

    const timer = setTimeout(searchMembers, 200);
    return () => clearTimeout(timer);
  }, [memberSearchQuery, isCreateChannelOpen, token]);

  const toggleMemberSelection = (userObj) => {
    setSelectedMembers((prev) => {
      const exists = prev.some((u) => u._id === userObj._id);
      if (exists) {
        return prev.filter((u) => u._id !== userObj._id);
      } else {
        return [...prev, userObj];
      }
    });
  };

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    const normalizedName = newChannelName.trim().toLowerCase().replace(/\s+/g, '-');
    const memberIds = selectedMembers.map((m) => m._id);

    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: normalizedName,
          description: newChannelDesc,
          isBroadcast: false,
          memberIds,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setChannels((prev) => [data.channel, ...prev]);
        setSelectedChannel(data.channel);
        setActiveView('chats');
        resetCreateModal();
        return;
      }
    } catch (err) {
      console.warn('Offline channel creation fallback');
    }

    const newChan = {
      _id: `chan-custom-${Date.now()}`,
      name: normalizedName,
      description: newChannelDesc || 'Topic channel',
      isDM: false,
      isBroadcast: false,
      memberIds: [currentUser?._id, ...memberIds].filter(Boolean),
      lastMessage: null,
    };

    setChannels((prev) => [newChan, ...prev]);
    setSelectedChannel(newChan);
    setActiveView('chats');
    resetCreateModal();
  };

  const resetCreateModal = () => {
    setIsCreateChannelOpen(false);
    setNewChannelName('');
    setNewChannelDesc('');
    setSelectedMembers([]);
    setMemberSearchQuery('');
  };

  return (
    <div className="flex h-screen bg-[#F7F8FA] dark:bg-pulse-dark-bg overflow-hidden relative">
      {/* Sidebar List Column (Mobile List View or Desktop Left Column) */}
      <div className={`w-full md:w-80 lg:w-96 h-full shrink-0 ${mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
        <div className={`w-full h-full ${activeView === 'calls' ? 'flex md:hidden' : 'hidden'}`}>
          <CallsView
            channels={channels}
            activeView={activeView}
            onSelectView={handleSelectView}
            onOpenJoinCall={() => setIsJoinCallOpen(true)}
          />
        </div>
        <div className={`w-full h-full ${activeView === 'calls' ? 'hidden md:flex' : 'flex'}`}>
          <Sidebar
            channels={channels}
            selectedChannel={selectedChannel}
            onSelectChannel={handleSelectChannel}
            activeView={activeView}
            onSelectView={handleSelectView}
            onOpenConnect={() => setIsConnectOpen(true)}
            onOpenCreateChannel={() => setIsCreateChannelOpen(true)}
            onOpenJoinCall={() => setIsJoinCallOpen(true)}
            loading={loading}
          />
        </div>
      </div>

      {/* Main View Area: ChatView on Desktop or CallsView when activeView === 'calls' */}
      <div className={`w-full flex-1 h-full min-w-0 ${mobileShowChat ? 'flex' : 'hidden md:flex'}`}>
        {activeView === 'calls' ? (
          <CallsView
            channels={channels}
            activeView={activeView}
            onSelectView={handleSelectView}
            onOpenJoinCall={() => setIsJoinCallOpen(true)}
          />
        ) : (
          <ChatView
            channel={selectedChannel}
            channels={channels}
            onBack={() => setMobileShowChat(false)}
          />
        )}
      </div>

      <ConnectModal
        isOpen={isConnectOpen}
        onClose={() => setIsConnectOpen(false)}
        onSelectChannel={(c) => {
          setChannels((prev) => [c, ...prev.filter((item) => item._id !== c._id)]);
          setSelectedChannel(c);
          setActiveView('chats');
        }}
      />

      <JoinCallSnackbar
        isOpen={isJoinCallOpen}
        onClose={() => setIsJoinCallOpen(false)}
      />

      {/* Channel / Group Creation Modal */}
      <Modal
        isOpen={isCreateChannelOpen}
        onClose={resetCreateModal}
        title="Create Channel / Group"
        subtitle="Channels are spaces for team discussions, topic threads, and broadcasting updates."
      >
        <form onSubmit={handleCreateChannel} className="space-y-4">
          <Input
            label="Channel Name"
            icon={Hash}
            placeholder="e.g. general, design-team, announcements"
            required
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
          />

          <Input
            label="Description (Optional)"
            placeholder="Topic overview & team discussion rules"
            value={newChannelDesc}
            onChange={(e) => setNewChannelDesc(e.target.value)}
          />

          {/* Member Selection for Group / Broadcast List */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Select Group Members ({selectedMembers.length} selected)
            </label>

            {/* Selected Badges */}
            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {selectedMembers.map((m) => (
                  <span
                    key={m._id}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-indigo-950/60 border border-indigo-800 text-indigo-300 text-xs font-bold"
                  >
                    <span>@{m.username}</span>
                    <button
                      type="button"
                      onClick={() => toggleMemberSelection(m)}
                      className="hover:text-red-400 p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="relative mb-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                placeholder="Search users by @username to add..."
                className="w-full pl-9 pr-4 py-2 bg-[#0B0F19] border border-slate-800 rounded-2xl text-xs font-semibold text-slate-100 placeholder:text-slate-500 focus:outline-none focus:bg-[#111827] focus:border-pulse-blue"
              />
            </div>

            {/* User Search Results */}
            <div className="max-h-36 overflow-y-auto space-y-1 pr-1 border border-slate-800 rounded-2xl p-1 bg-[#0B0F19]/50">
              {searchingUsers ? (
                <div className="py-4 text-center text-xs font-medium text-slate-400">
                  Searching users...
                </div>
              ) : searchedUsers.length === 0 ? (
                <div className="py-4 text-center text-xs font-medium text-slate-400">
                  {memberSearchQuery ? 'No user found' : 'Type a username to discover & add members'}
                </div>
              ) : (
                searchedUsers.map((u) => {
                  const isSelected = selectedMembers.some((m) => m._id === u._id);
                  return (
                    <div
                      key={u._id}
                      onClick={() => toggleMemberSelection(u)}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-indigo-950/80' : 'hover:bg-slate-800/50'
                        }`}
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-full pulse-gradient-bg flex items-center justify-center text-white font-bold text-xs">
                          {u.avatarInitial || u.name.charAt(0)}
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-slate-100">{u.name}</h5>
                          <p className="text-[10px] text-slate-400">@{u.username}</p>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border ${isSelected
                          ? 'bg-pulse-blue border-pulse-blue text-white'
                          : 'border-slate-700 text-transparent'
                          }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-800">
            <Button variant="ghost" size="sm" type="button" onClick={resetCreateModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Create Channel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
