import React, { useState, useEffect } from 'react';
import Avatar from '../ui/Avatar';
import { Hash } from 'lucide-react';
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
      if (!channel.lastMessage?.content) {
        setLastMsgPreview('');
        return;
      }
      const raw = channel.lastMessage.content;
      if (raw.startsWith('ENC:v1:')) {
        try {
          const decrypted = await decryptMessage(raw);
          if (isMounted) setLastMsgPreview(decrypted);
        } catch {
          if (isMounted) setLastMsgPreview('Encrypted Message');
        }
      } else {
        if (isMounted) setLastMsgPreview(raw);
      }
    };

    processLastMessage();
    return () => {
      isMounted = false;
    };
  }, [channel.lastMessage?.content]);

  const senderName = channel.lastMessage?.senderId?.name?.split(' ')[0] || '';

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-2xl cursor-pointer transition-all flex items-center space-x-3 ${
        isSelected
          ? 'bg-indigo-50/90 dark:bg-indigo-950/80 shadow-sm'
          : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
      }`}
    >
      {/* Icon / Avatar */}
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

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline">
          <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate flex items-center space-x-1">
            <span>{isDM ? other?.name || 'User' : `#${channel.name}`}</span>
          </h4>
          {channel.lastMessage && (
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-400 shrink-0 ml-1">
              {new Date(channel.lastMessage.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-300 truncate mt-0.5">
          {channel.lastMessage
            ? `${senderName ? `${senderName}: ` : ''}${lastMsgPreview}`
            : isDM
            ? `@${other?.username}`
            : channel.description || `${memberCount > 0 ? `${memberCount} members` : 'Topic Channel'}`}
        </p>
      </div>
    </div>
  );
}

