import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, UserPlus, Plus, Search, Settings, LogOut, Video, Edit3 } from 'lucide-react';
import ChannelItem from './ChannelItem';
import Avatar from '../ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

export default function Sidebar({
  channels,
  selectedChannel,
  onSelectChannel,
  onOpenConnect,
  onOpenCreateChannel,
  onOpenJoinCall,
  loading,
}) {
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'dms' | 'channels'
  const [searchQuery, setSearchQuery] = useState('');

  const { user, logout } = useAuth();
  const { onlineUsers } = useSocket();
  const navigate = useNavigate();

  const filteredChannels = channels.filter((c) => {
    if (filterTab === 'dms' && !c.isDM) return false;
    if (filterTab === 'channels' && c.isDM) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (c.isDM) {
        const other = c.memberIds.find((m) => m._id !== user?._id);
        return (
          other?.name?.toLowerCase().includes(q) ||
          other?.username?.toLowerCase().includes(q)
        );
      }
      return c.name.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="w-full h-full bg-white dark:bg-[#111827] border-r border-slate-200/80 dark:border-slate-800 flex flex-col shrink-0 transition-colors">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-2xl pulse-gradient-bg flex items-center justify-center text-white shadow-md shadow-pulse-blue/30">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              PulseChat
            </h1>
            <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              Active Session
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1">

          <button
            onClick={onOpenConnect}
            title="Connect @username"
            className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenCreateChannel}
            title="Create Group / Channel"
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats & channels..."
            className="w-full pl-9 pr-4 py-2 bg-slate-100/80 dark:bg-pulse-dark-bg border border-transparent dark:border-slate-800 rounded-2xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-pulse-blue transition-all"
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="px-4 py-2 flex items-center space-x-1.5 border-b border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setFilterTab('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${filterTab === 'all'
            ? 'pulse-gradient-bg text-white shadow-sm'
            : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
        >
          All
        </button>
        <button
          onClick={() => setFilterTab('dms')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${filterTab === 'dms'
            ? 'pulse-gradient-bg text-white shadow-sm'
            : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
        >
          Direct Messages
        </button>
        <button
          onClick={() => setFilterTab('channels')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${filterTab === 'channels'
            ? 'pulse-gradient-bg text-white shadow-sm'
            : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
        >
          Channels
        </button>
      </div>

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="py-8 text-center text-xs font-semibold text-slate-400">
            Loading conversations...
          </div>
        ) : filteredChannels.length === 0 ? (
          <div className="py-8 text-center text-xs font-medium text-slate-400">
            No conversations found. Use <span className="font-bold text-pulse-blue">+</span> or{' '}
            <span className="font-bold text-pulse-blue">User Icon</span> to connect!
          </div>
        ) : (
          filteredChannels.map((c) => {
            const isSelected = selectedChannel?._id === c._id;
            const other = c.isDM
              ? c.memberIds.find((m) => m._id !== user?._id)
              : null;
            const isOnline = other
              ? other.isOnline || onlineUsers.has(other._id)
              : false;

            return (
              <ChannelItem
                key={c._id}
                channel={c}
                isSelected={isSelected}
                currentUser={user}
                isOnline={isOnline}
                onClick={() => onSelectChannel(c)}
              />
            );
          })
        )}
      </div>

      {/* User Footer Bar — Interactive Profile Avatar & Settings Access */}
      <div className="p-3 bg-slate-50 dark:bg-pulse-dark-bg border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
        <div
          onClick={() => navigate('/settings')}
          title="Click to Edit Profile"
          className="flex items-center space-x-2.5 cursor-pointer p-1.5 rounded-2xl hover:bg-slate-200/50 dark:hover:bg-slate-800/60 transition-all group shrink min-w-0"
        >
          <div className="relative">
            <Avatar
              initial={user?.avatarInitial}
              name={user?.name}
              avatarColor={user?.avatarColor}
              isOnline={true}
              size="sm"
            />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-pulse-blue text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
              <Edit3 className="w-2.5 h-2.5" />
            </div>
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-pulse-blue transition-colors">{user?.name}</h4>
            <p className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 truncate">Edit Profile (@{user?.username})</p>
          </div>
        </div>

        <div className="flex items-center space-x-1 shrink-0">


          <button
            onClick={() => navigate('/settings')}
            title="Settings"
            className="w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>

        </div>
      </div>
    </div>
  );
}
