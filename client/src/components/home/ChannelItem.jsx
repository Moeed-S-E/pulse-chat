import React, { useState, useEffect } from 'react';
import Avatar from '../ui/Avatar';
import { Hash, CheckCheck, Camera } from 'lucide-react';
import { decryptMessage } from '../../utils/crypto';

export default function ChannelItem({
  channel,
  isSelected,
  currentUser,
  isOnline,
  onClick,
}) {
  const isDM = channel.isDM;
  const other = isDM
    ? channel.memberIds?.find((m) => m._id !== currentUser?._id)
    : null;

  const memberCount = channel.memberIds?.length || 0;

  const [lastMsgPreview, setLastMsgPreview] = useState('');

  useEffect(() => {
    let isMounted = true;
    const processLastMessage = async () => {
      if (!channel.lastMessage) {
        if (isMounted) setLastMsgPreview('');
        return;
      }

      if (channel.lastMessage.messageType === 'image') {
        if (isMounted) setLastMsgPreview('Photo');
        return;
      }

      if (channel.lastMessage.messageType === 'system_call') {
        if (isMounted) setLastMsgPreview(`Call (${channel.lastMessage.callDuration || '00:00'})`);
        return;
      }

      const raw = channel.lastMessage.content || '';
      if (raw.startsWith('ENC:v1:')) {
        try {
          const decrypted = await decryptMessage(raw, channel._id);
          if (isMounted) setLastMsgPreview(decrypted || 'Encrypted message');
        } catch {
          if (isMounted) setLastMsgPreview('Encrypted message');
        }
      } else {
        if (isMounted) setLastMsgPreview(raw);
      }
    };

    processLastMessage();
    return () => {
      isMounted = false;
    };
  }, [channel.lastMessage?.content, channel.lastMessage?.messageType, channel._id]);

  const senderId = typeof channel.lastMessage?.senderId === 'object'
    ? channel.lastMessage?.senderId?._id
    : channel.lastMessage?.senderId;
  const isSentByMe = senderId === currentUser?._id;
  const senderName = isDM ? '' : (channel.lastMessage?.senderId?.name?.split(' ')[0] || '');

  const timeStr = channel.lastMessage?.createdAt
    ? new Date(channel.lastMessage.createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
    : '';

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-2xl cursor-pointer transition-all flex items-center space-x-3 group ${isSelected
        ? 'bg-indigo-50/90 dark:bg-indigo-950/80 shadow-sm'
        : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
        }`}
    >
      {/* Icon / Avatar */}
      <div className="relative shrink-0">
        {isDM ? (
          <Avatar
            initial={other?.avatarInitial}
            name={other?.name}
            avatarColor={other?.avatarColor}
            isOnline={isOnline}
            size="md"
          />
        ) : (
          <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-pulse-blue font-bold text-sm shrink-0">
            <Hash className="w-5 h-5" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-0.5">
          <h4 className="text-xs font-bold truncate text-slate-900 dark:text-slate-100">
            {isDM ? other?.name || 'User' : `#${channel.name}`}
          </h4>
          {timeStr && (
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 shrink-0 ml-1.5">
              {timeStr}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate flex items-center space-x-1">
            {isSentByMe && (
              <CheckCheck className="w-3.5 h-3.5 text-pulse-blue shrink-0 inline mr-1" />
            )}
            {channel.lastMessage?.messageType === 'image' && (
              <Camera className="w-3.5 h-3.5 text-slate-400 inline mr-1 shrink-0" />
            )}
            <span className="truncate">
              {channel.lastMessage
                ? `${senderName ? `${senderName}: ` : ''}${lastMsgPreview}`
                : isDM
                  ? `@${other?.username || 'user'}`
                  : channel.description || `${memberCount > 0 ? `${memberCount} members` : 'Topic channel'}`}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
