import React, { useState, useEffect } from 'react';
import { UserPlus, CheckCircle, AtSign } from 'lucide-react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { apiFetch } from '../../config/api';

export default function ConnectModal({ isOpen, onClose, onSelectChannel }) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const { token } = useAuth();
  const { onlineUsers } = useSocket();

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setUsers([]);
      setToastMessage('');
      return;
    }

    const searchUsers = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/api/users/search?q=${encodeURIComponent(query)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users);
        }
      } catch (err) {
        console.error('Error searching users:', err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(searchUsers, 250);
    return () => clearTimeout(timer);
  }, [query, isOpen, token]);

  const handleConnect = async (targetUser) => {
    try {
      const res = await apiFetch(`/api/channels/dm/${targetUser._id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setToastMessage(`Connected with @${targetUser.username}! Opening chat...`);
        setTimeout(() => {
          onSelectChannel(data.channel);
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error('Error connecting to user:', err);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Find & Connect by Username"
      subtitle="Type another person's @username to start chatting & calling"
    >
      <div className="mb-4">
        <Input
          icon={AtSign}
          placeholder="Type username (e.g. samuel)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      {toastMessage && (
        <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-2xl flex items-center space-x-2 animate-bounce">
          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
        {loading ? (
          <div className="py-8 text-center text-xs font-semibold text-slate-400">
            Searching users...
          </div>
        ) : users.length === 0 ? (
          <div className="py-8 text-center text-xs font-medium text-slate-400">
            {query ? `No user found for "@${query}"` : 'Type a username above to discover friends'}
          </div>
        ) : (
          users.map((u) => {
            const isUserOnline = u.isOnline || onlineUsers.has(u._id);
            return (
              <div
                key={u._id}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/60 transition-all"
              >
                <div className="flex items-center space-x-3">
                  <Avatar
                    initial={u.avatarInitial}
                    name={u.name}
                    isOnline={isUserOnline}
                    size="md"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{u.name}</h4>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">@{u.username}</p>
                  </div>
                </div>

                <Button
                  onClick={() => handleConnect(u)}
                  variant="success"
                  size="sm"
                  className="px-4 rounded-xl"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Connect</span>
                </Button>
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
}
