import React, { useState, useEffect, useRef } from 'react';
import {
  Video, Phone, X, ExternalLink, Lock, Pencil, Trash2, CornerUpRight, Copy, Check, MoreHorizontal
} from 'lucide-react';
import { decryptMessage } from '../../utils/crypto';
import { useToast } from '../../context/ToastContext';

function MessageItem({
  msg,
  currentUser,
  isDM,
  onStartVideoCall,
  onStartVoiceCall,
  setActiveLightboxImg,
  onEditMessage,
  onDeleteMessage,
  onOpenForwardModal,
}) {
  const [decryptedText, setDecryptedText] = useState(msg.content?.startsWith('ENC:') ? 'Decrypting...' : msg.content);
  const [decryptedImage, setDecryptedImage] = useState((msg.mediaUrl || msg.content)?.startsWith('ENC:') ? '' : (msg.mediaUrl || msg.content));
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();
  const itemRef = useRef(null);

  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e) => {
      if (itemRef.current && !itemRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [showMenu]);

  useEffect(() => {
    let isMounted = true;
    const decrypt = async () => {
      if (msg.isDeleted) {
        if (isMounted) setDecryptedText('This message was deleted');
        return;
      }

      if (msg.content && msg.content.startsWith('ENC:v1:')) {
        const text = await decryptMessage(msg.content, msg.channelId);
        if (isMounted) setDecryptedText(text);
      } else {
        if (isMounted) setDecryptedText(msg.content);
      }

      if (msg.mediaUrl && msg.mediaUrl.startsWith('ENC:v1:')) {
        const img = await decryptMessage(msg.mediaUrl, msg.channelId);
        if (isMounted) setDecryptedImage(img);
      } else {
        if (isMounted) setDecryptedImage(msg.mediaUrl || msg.content);
      }
    };
    decrypt();
    return () => {
      isMounted = false;
    };
  }, [msg.content, msg.mediaUrl, msg.channelId, msg.isDeleted]);

  const isMe = msg.senderId?._id === currentUser?._id || msg.senderId === currentUser?._id;
  const isSystemCall = msg.messageType === 'system_call';
  const isImage = msg.messageType === 'image';

  const handleCopy = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(decryptedText).then(() => {
        setCopied(true);
        showToast('Message text copied to clipboard', 'success');
        setShowMenu(false);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        showToast('Clipboard access denied', 'error');
      });
    } else {
      showToast('Clipboard not supported', 'error');
    }
  };

  const handleStartEdit = () => {
    setEditText(decryptedText);
    setIsEditing(true);
    setShowMenu(false);
  };

  const handleSaveEdit = () => {
    if (!editText.trim()) return;
    onEditMessage(msg._id, editText.trim());
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      onDeleteMessage(msg._id);
      setShowMenu(false);
    }
  };

  if (isSystemCall) {
    const isAudio = msg.content?.includes('voice');
    return (
      <div className="flex justify-center my-3">
        <div className="px-4 py-2 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-200">
          {isAudio ? <Phone className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> : <Video className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />}
          <span>{decryptedText}</span>
          <button
            onClick={isAudio ? onStartVoiceCall : onStartVideoCall}
            className="ml-2 text-emerald-600 dark:text-emerald-400 hover:underline font-extrabold cursor-pointer"
          >
            Call back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={itemRef} className={`flex items-end space-x-2 group relative ${isMe ? 'justify-end' : 'justify-start'}`}>
      {!isMe && (
        <div className="w-7 h-7 rounded-full pulse-gradient-bg flex items-center justify-center text-white font-bold text-xs shrink-0 mb-1">
          {msg.senderId?.avatarInitial || msg.senderId?.name?.charAt(0) || 'U'}
        </div>
      )}

      <div className="relative max-w-md">
        {/* Forwarded Badge */}
        {msg.isForwarded && !msg.isDeleted && (
          <div className="text-[10px] font-bold text-slate-400 flex items-center space-x-1 mb-1 px-1">
            <CornerUpRight className="w-3 h-3 text-emerald-400" />
            <span>Forwarded</span>
          </div>
        )}

        <div
          className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm select-text cursor-text relative group ${
            msg.isDeleted
              ? 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 italic font-normal border border-slate-200/40 dark:border-slate-800'
              : isMe
              ? 'wa-outgoing-bubble rounded-br-none font-medium shadow-xs border border-emerald-200/40 dark:border-emerald-900/40'
              : 'wa-incoming-bubble rounded-bl-none font-medium border border-slate-200/50 dark:border-[#2D353B]'
          }`}
        >
          {!isMe && !isDM && (
            <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 mb-1.5 px-1 select-text">
              {msg.senderId?.name || 'User'}
            </div>
          )}

          {/* Inline Edit Input Mode */}
          {isEditing ? (
            <div className="space-y-2 text-slate-900">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full p-2 rounded-xl text-xs bg-white dark:bg-[#1E2429] border border-emerald-300 dark:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-[#EEF2F5] resize-none"
                rows={2}
                autoFocus
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-2.5 py-1 text-[11px] font-bold text-slate-200 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            /* Message Content */
            <>
              {isImage && decryptedImage && !msg.isDeleted ? (
                <div className="space-y-1.5">
                  <div
                    className="relative cursor-pointer group/img rounded-xl overflow-hidden max-w-xs bg-slate-950/10 dark:bg-slate-950/40 border border-black/5 dark:border-slate-700/50"
                    onClick={() => setActiveLightboxImg(decryptedImage)}
                  >
                    <img
                      src={decryptedImage}
                      alt="Shared image attachment"
                      className="w-full h-auto max-h-72 object-cover rounded-xl group-hover/img:scale-[1.02] transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="px-3 py-1 bg-black text-white rounded-full text-[11px] font-bold flex items-center space-x-1">
                        <ExternalLink className="w-3 h-3" />
                        <span>View Image</span>
                      </span>
                    </div>
                  </div>
                  {decryptedText && decryptedText !== 'Image attachment' && decryptedText !== 'Image' && (
                    <p className="px-1 text-xs select-text">{decryptedText}</p>
                  )}
                </div>
              ) : (
                <p className="px-1 select-text">{decryptedText}</p>
              )}

              {/* Timestamp & Badges */}
              <div
                className={`text-[10px] mt-1 text-right opacity-70 px-1 flex items-center justify-end space-x-1 ${
                  isMe ? 'text-slate-600 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {msg.isEdited && !msg.isDeleted && <span className="italic">(edited)</span>}
                <span>
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Touch & Hover Message Actions Menu Toggle */}
        {!msg.isDeleted && !isEditing && (
          <button
            type="button"
            onClick={() => setShowMenu((v) => !v)}
            aria-label="Message actions"
            className="absolute -top-2 right-1 z-10 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Dropdown Actions Menu */}
        {showMenu && !msg.isDeleted && !isEditing && (
          <div
            className={`absolute z-30 top-full mt-1 ${
              isMe ? 'right-0' : 'left-0'
            } flex items-center space-x-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-lg`}
          >
            <button
              onClick={handleCopy}
              title="Copy text"
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => {
                setShowMenu(false);
                onOpenForwardModal(msg, decryptedText, decryptedImage);
              }}
              title="Forward message"
              className="p-1 rounded-lg text-slate-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors"
            >
              <CornerUpRight className="w-3.5 h-3.5" />
            </button>
            {isMe && !isImage && (
              <button
                onClick={handleStartEdit}
                title="Edit message"
                className="p-1 rounded-lg text-slate-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-slate-700 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {isMe && (
              <button
                onClick={handleDelete}
                title="Delete message"
                className="p-1 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MessageThread({
  messages,
  currentUser,
  channels = [],
  isDM,
  loading,
  typingUsers,
  messagesEndRef,
  onStartVideoCall,
  onStartVoiceCall,
  onEditMessage,
  onDeleteMessage,
  onForwardMessage,
}) {
  const [activeLightboxImg, setActiveLightboxImg] = useState(null);
  const [forwardModalMsg, setForwardModalMsg] = useState(null);
  const [forwardText, setForwardText] = useState('');
  const [forwardImage, setForwardImage] = useState('');
  const [selectedTargetChannelId, setSelectedTargetChannelId] = useState('');
  const { showToast } = useToast();

  const handleOpenForwardModal = (msg, decryptedText, decryptedImage) => {
    setForwardModalMsg(msg);
    setForwardText(decryptedText || '');
    setForwardImage(decryptedImage || '');
    setSelectedTargetChannelId('');
  };

  const handleSendForward = async () => {
    if (!forwardModalMsg || !selectedTargetChannelId) return;
    try {
      await onForwardMessage(forwardModalMsg._id, selectedTargetChannelId, forwardText, forwardImage);
      showToast('Message forwarded successfully!', 'success');
      setForwardModalMsg(null);
    } catch (e) {
      showToast(e.message || 'Failed to forward message', 'error');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 wa-chat-bg">
      {/* Forward Message Modal */}
      {forwardModalMsg && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#262C31] rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-[#2D353B] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 dark:text-[#EEF2F5] text-base flex items-center space-x-2">
                <CornerUpRight className="w-5 h-5 text-emerald-500" />
                <span>Forward Message</span>
              </h3>
              <button
                onClick={() => setForwardModalMsg(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-[#1E2429] rounded-2xl border border-slate-200 dark:border-[#2D353B] text-xs text-slate-700 dark:text-slate-300 italic max-h-24 overflow-y-auto">
              "{forwardText}"
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">
                Select Destination Chat:
              </label>
              <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                {channels.map((c) => {
                  const isDMChannel = c.isDM;
                  const otherMember = isDMChannel
                    ? c.memberIds?.find((m) => m._id !== currentUser?._id)
                    : null;
                  const name = isDMChannel ? (otherMember?.name || 'User') : `#${c.name}`;
                  const isSelected = selectedTargetChannelId === c._id;

                  return (
                    <div
                      key={c._id}
                      onClick={() => setSelectedTargetChannelId(c._id)}
                      className={`p-3 rounded-2xl cursor-pointer flex items-center justify-between border transition-all ${
                        isSelected
                          ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-500 text-emerald-900 dark:text-emerald-100 font-bold'
                          : 'bg-white dark:bg-[#1E2429] border-slate-200 dark:border-[#2D353B] text-slate-800 dark:text-[#EEF2F5] hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-xs">{name}</span>
                      {isSelected && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setForwardModalMsg(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                disabled={!selectedTargetChannelId}
                onClick={handleSendForward}
                className="px-5 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl shadow-md cursor-pointer"
              >
                Forward
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {activeLightboxImg && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setActiveLightboxImg(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-slate-950 rounded-3xl p-2 shadow-2xl overflow-hidden flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveLightboxImg(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white flex items-center justify-center transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={activeLightboxImg}
              alt="Shared image"
              className="max-h-[80vh] w-auto max-w-full object-contain rounded-2xl"
            />
          </div>
        </div>
      )}

      {/* Encryption Security Banner */}
      <div className="flex justify-center my-2">
        <div className="px-3.5 py-1.5 rounded-full bg-emerald-50/80 dark:bg-emerald-950/60 border border-emerald-200/40 dark:border-emerald-800/40 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 flex items-center space-x-1.5 shadow-xs">
          <Lock className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
          <span>Messages are encrypted in transit.</span>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs font-semibold text-slate-400">
          Loading messages...
        </div>
      ) : messages.length === 0 ? (
        <div className="py-12 text-center text-xs font-medium text-slate-400">
          No messages yet. Send a message, share an image, or hop on a video call!
        </div>
      ) : (
        messages.map((msg) => (
          <MessageItem
            key={msg._id}
            msg={msg}
            currentUser={currentUser}
            isDM={isDM}
            onStartVideoCall={onStartVideoCall}
            onStartVoiceCall={onStartVoiceCall}
            setActiveLightboxImg={setActiveLightboxImg}
            onEditMessage={onEditMessage}
            onDeleteMessage={onDeleteMessage}
            onOpenForwardModal={handleOpenForwardModal}
          />
        ))
      )}

      {/* Typing Indicator */}
      {typingUsers.size > 0 && (
        <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 font-medium pl-2">
          <div className="px-3 py-2 rounded-2xl bg-[#EFF0F3] dark:bg-[#1E293B] border border-slate-200/60 dark:border-slate-800 flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150" />
            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-300" />
          </div>
          <span className="text-xs italic">
            {Array.from(typingUsers).join(', ')} is typing...
          </span>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
