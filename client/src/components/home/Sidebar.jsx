import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  MessageSquare,
  Phone,
  Settings,
  LogOut,
  UserPlus,
  Plus,
  Search,
} from 'lucide-react';
import ChannelItem from './ChannelItem';
import Avatar from '../ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

export default function Sidebar({
  channels,
  selectedChannel,
  onSelectChannel,
  activeView,
  onSelectView,
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
    <div className="w-full h-full flex flex-col md:flex-row bg-white dark:bg-[#111827] border-r border-slate-200/80 dark:border-slate-800 shrink-0 select-none overflow-hidden transition-colors relative">
      {/* 1. Desktop Vertical Navigation Dock Rail (~60px) - Hidden on Mobile */}
      <div className="hidden md:flex w-16 h-full bg-slate-50 dark:bg-[#0B0F19] border-r border-slate-200/80 dark:border-slate-800 flex-col items-center justify-between py-4 shrink-0 transition-colors">
        {/* Top Navigation Icons */}
        <div className="flex flex-col items-center space-y-3.5 w-full px-2">
          {/* Logo Badge */}
          <div className="w-10 h-10 rounded-2xl pulse-gradient-bg flex items-center justify-center text-white shadow-md shadow-emerald-500/30 mb-2">
            <Activity className="w-5 h-5" />
          </div>

          {/* Active Chats Tab */}
          <button
            onClick={() => onSelectView('chats')}
            title="Chats & Messages"
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              activeView === 'chats'
                ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 font-bold shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          {/* Call & Call History Tab (WhatsApp Style) */}
          <button
            onClick={() => onSelectView('calls')}
            title="Calls & Meeting History"
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              activeView === 'calls'
                ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 font-bold shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Phone className="w-5 h-5" />
          </button>
        </div>

        {/* Bottom Actions: Settings, Avatar, Logout */}
        <div className="flex flex-col items-center space-y-3 w-full px-2">
          <button
            onClick={() => navigate('/settings')}
            title="Settings"
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100 transition-all cursor-pointer"
          >
            <Settings className="w-5 h-5" />
          </button>

          <div
            onClick={() => navigate('/settings')}
            title={`Edit Profile (@${user?.username})`}
            className="cursor-pointer hover:scale-105 transition-transform"
          >
            <Avatar
              initial={user?.avatarInitial}
              name={user?.name}
              avatarColor={user?.avatarColor}
              isOnline={true}
              size="sm"
            />
          </div>

          <button
            onClick={logout}
            title="Log Out"
            className="w-9 h-9 rounded-2xl flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Main Right Panel (Chats & Channels List) */}
      <div className="flex-1 h-full bg-white dark:bg-[#111827] flex flex-col min-w-0 transition-colors">
        {/* Header Bar */}
        <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="md:hidden w-8 h-8 rounded-xl pulse-gradient-bg flex items-center justify-center text-white shadow-xs">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                PulseChat
              </h1>
              <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                Active Session
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={onOpenConnect}
              title="Connect @username / New Direct Message"
              className="w-8 h-8 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenCreateChannel}
              title="Create Channel / Group"
              className="w-8 h-8 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-3 py-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats & channels..."
              className="w-full pl-9 pr-4 py-2 bg-slate-100/80 dark:bg-[#0B0F19] border border-transparent dark:border-slate-800 rounded-2xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>
        </div>

        {/* Filter Chips */}
        <div className="px-3 py-1.5 flex items-center space-x-1.5 overflow-x-auto no-scrollbar border-b border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              filterTab === 'all'
                ? 'pulse-gradient-bg text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterTab('dms')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              filterTab === 'dms'
                ? 'pulse-gradient-bg text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            Direct Messages
          </button>
          <button
            onClick={() => setFilterTab('channels')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              filterTab === 'channels'
                ? 'pulse-gradient-bg text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            Channels
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="py-8 text-center text-xs font-semibold text-slate-400">
              Loading conversations...
            </div>
          ) : filteredChannels.length === 0 ? (
            <div className="py-8 text-center text-xs font-medium text-slate-400">
              No conversations found. Use <span className="font-bold text-emerald-600">+</span> or{' '}
              <span className="font-bold text-emerald-600">User Icon</span> to connect!
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

        {/* 3. Mobile WhatsApp-Style Bottom Navigation Bar (< md) */}
        <div className="flex md:hidden items-center justify-around py-2 px-3 bg-slate-50 dark:bg-[#0B0F19] border-t border-slate-200/80 dark:border-slate-800 shrink-0">
          {/* Chats Tab */}
          <button
            onClick={() => onSelectView('chats')}
            className={`flex flex-col items-center space-y-0.5 py-1 px-4 rounded-2xl transition-all cursor-pointer ${
              activeView === 'chats'
                ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px]">Chats</span>
          </button>

          {/* Calls Tab */}
          <button
            onClick={() => onSelectView('calls')}
            className={`flex flex-col items-center space-y-0.5 py-1 px-4 rounded-2xl transition-all cursor-pointer ${
              activeView === 'calls'
                ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 font-bold'
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
    </div>
  );
}
