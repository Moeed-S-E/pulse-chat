import React, { useState, useEffect, useRef } from 'react';
import { Activity } from 'lucide-react';
import ChatHeader from './ChatHeader';
import MessageThread from './MessageThread';
import MessageInput from './MessageInput';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useCall } from '../../context/CallContext';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../config/api';

import { encryptMessage } from '../../utils/crypto';

export default function ChatView({ channel, channels = [], onBack }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const { user, token } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const { startCall } = useCall();
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const isDM = channel?.isDM;
  const otherMember = isDM
    ? channel.memberIds.find((m) => m._id !== user?._id)
    : null;

  const isOtherOnline = otherMember
    ? otherMember.isOnline || onlineUsers.has(otherMember._id)
    : false;

  useEffect(() => {
    if (!channel?._id || !token) return;
    let cancelled = false;

    const fetchMessages = async () => {
      setLoading(true);
      setMessages([]);
      setTypingUsers(new Set());

      try {
        const res = await apiFetch(`/api/channels/${channel._id}/messages?limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        
        setMessages((live) => {
          const ids = new Set(data.messages.map((m) => m._id));
          return [...data.messages, ...live.filter((m) => !ids.has(m._id))];
        });
      } catch (err) {
        console.error('Error fetching messages:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchMessages();
    return () => { cancelled = true; };
  }, [channel?._id, token]);

  useEffect(() => {
    if (!socket || !channel?._id) return;

    socket.emit('channel:join', { channelId: channel._id });

    const handleNewMessage = (msg) => {
      if (msg.channelId === channel._id) {
        setMessages((prev) => prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]);
      }
    };

    const handleUpdateMessage = (updatedMsg) => {
      if (updatedMsg.channelId === channel._id) {
        setMessages((prev) =>
          prev.map((m) => (m._id === updatedMsg._id ? updatedMsg : m))
        );
      }
    };

    const handleDeleteMessageEvent = ({ messageId, channelId: cId }) => {
      if (cId === channel._id) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === messageId
              ? { ...m, isDeleted: true, content: 'This message was deleted', mediaUrl: '' }
              : m
          )
        );
      }
    };

    const handleTypingUpdate = ({ channelId, username, isTyping }) => {
      if (channelId === channel._id) {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          if (isTyping) {
            next.add(username);
          } else {
            next.delete(username);
          }
          return next;
        });
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:update', handleUpdateMessage);
    socket.on('message:delete', handleDeleteMessageEvent);
    socket.on('typing:update', handleTypingUpdate);
    socket.on('error', (err) => showToast(err.message || 'Socket error', 'error'));
    socket.on('connect_error', (err) => showToast('Connection error: ' + err.message, 'error'));

    return () => {
      socket.emit('channel:leave', { channelId: channel._id });
      socket.off('message:new', handleNewMessage);
      socket.off('message:update', handleUpdateMessage);
      socket.off('message:delete', handleDeleteMessageEvent);
      socket.off('typing:update', handleTypingUpdate);
    };
  }, [socket, channel?._id]);

  useEffect(() => {
    if (messagesEndRef.current) {
      const el = messagesEndRef.current.parentElement;
      if (!el) return;
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      const lastMsgIsMine = messages[messages.length - 1]?.senderId?._id === user?._id || messages[messages.length - 1]?.senderId === user?._id;
      if (nearBottom || lastMsgIsMine) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages, typingUsers, user?._id]);

  const isTypingRef = useRef(false);

  const handleInputChange = (e) => {
    setInputText(e.target.value);

    if (socket && channel?._id) {
      if (!isTypingRef.current) {
        socket.emit('typing:start', { channelId: channel._id });
        isTypingRef.current = true;
      }

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false;
        socket.emit('typing:stop', { channelId: channel._id });
      }, 1500);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !socket || !channel?._id) return;

    const rawText = inputText.trim();
    setInputText('');

    const encryptedText = await encryptMessage(rawText, channel._id);

    socket.emit('message:send', {
      channelId: channel._id,
      content: encryptedText,
      messageType: 'text',
    });

    socket.emit('typing:stop', { channelId: channel._id });
    isTypingRef.current = false;
  };

  const handleSendImage = async (base64Data) => {
    if (!socket || !channel?._id || !base64Data) return;

    const encryptedContent = await encryptMessage('Image attachment', channel._id);
    const encryptedMediaUrl = await encryptMessage(base64Data, channel._id);

    socket.emit('message:send', {
      channelId: channel._id,
      content: encryptedContent,
      messageType: 'image',
      mediaUrl: encryptedMediaUrl,
    });
  };

  const handleEditMessage = async (messageId, newRawContent) => {
    if (!token || !channel?._id) return;
    try {
      const encryptedContent = await encryptMessage(newRawContent, channel._id);
      const res = await apiFetch(`/api/messages/${messageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: encryptedContent }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m._id === messageId ? data.message : m))
        );
      }
    } catch (err) {
      console.error('Error editing message:', err);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!token) return;
    try {
      const res = await apiFetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === messageId
              ? { ...m, isDeleted: true, content: 'This message was deleted', mediaUrl: '' }
              : m
          )
        );
      }
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  const handleForwardMessage = async (messageId, targetChannelId, decryptedText, decryptedImage) => {
    if (!token) return;
    try {
      const encryptedContent = await encryptMessage(decryptedText || '📷 Image', targetChannelId);
      const encryptedMediaUrl = decryptedImage ? await encryptMessage(decryptedImage, targetChannelId) : '';
      const res = await apiFetch(`/api/messages/${messageId}/forward`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetChannelId,
          encryptedContent,
          encryptedMediaUrl,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Forward failed');
      }
    } catch (err) {
      console.error('Error forwarding message:', err);
      throw err;
    }
  };

  const handleStartVideoCall = () => {
    if (otherMember) {
      startCall(otherMember._id, channel._id, otherMember, 'video');
    }
  };

  const handleStartVoiceCall = () => {
    if (otherMember) {
      startCall(otherMember._id, channel._id, otherMember, 'audio');
    }
  };

  if (!channel) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#F7F8FA] dark:bg-pulse-dark-bg p-8 text-center transition-colors">
        <div className="w-16 h-16 rounded-3xl pulse-gradient-bg flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 mb-4 animate-pulse">
          <Activity className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Select a Conversation</h3>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 max-w-sm mt-1">
          Choose a channel or search a username to start messaging & calling.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F7F8FA] dark:bg-pulse-dark-bg relative transition-colors">
      <ChatHeader
        channel={channel}
        currentUser={user}
        isOtherOnline={isOtherOnline}
        onStartVideoCall={handleStartVideoCall}
        onStartVoiceCall={handleStartVoiceCall}
        onBack={onBack}
      />
      <MessageThread
        channel={channel}
        messages={messages}
        currentUser={user}
        channels={channels}
        isDM={isDM}
        loading={loading}
        typingUsers={typingUsers}
        messagesEndRef={messagesEndRef}
        onStartVideoCall={handleStartVideoCall}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        onForwardMessage={handleForwardMessage}
      />
      <MessageInput
        inputText={inputText}
        onInputChange={handleInputChange}
        onSendMessage={handleSendMessage}
        onSendImage={handleSendImage}
      />
    </div>
  );
}
