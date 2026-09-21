import React, { useState, useEffect } from 'react';
import { Video, X, ExternalLink, Lock } from 'lucide-react';
import { decryptMessage } from '../../utils/crypto';

function MessageItem({ msg, currentUser, isDM, onStartVideoCall, setActiveLightboxImg }) {
  const [decryptedText, setDecryptedText] = useState(msg.content);
  const [decryptedImage, setDecryptedImage] = useState(msg.mediaUrl || msg.content);

  useEffect(() => {
    let isMounted = true;
    const decrypt = async () => {
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
  }, [msg.content, msg.mediaUrl, msg.channelId]);

  const isMe = msg.senderId?._id === currentUser?._id || msg.senderId === currentUser?._id;
  const isSystemCall = msg.messageType === 'system_call';
  const isImage = msg.messageType === 'image';

  if (isSystemCall) {
    return (
      <div className="flex justify-center my-3">
        <div className="px-4 py-2 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-700 shadow-sm flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-200">
          <Video className="w-4 h-4 text-[#5B6CFF]" />
          <span>{decryptedText}</span>
          <button
            onClick={onStartVideoCall}
            className="ml-2 text-[#5B6CFF] hover:underline font-extrabold cursor-pointer"
          >
            Call back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-end space-x-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
      {!isMe && (
        <div className="w-7 h-7 rounded-full pulse-gradient-bg flex items-center justify-center text-white font-bold text-xs shrink-0 mb-1">
          {msg.senderId?.avatarInitial || msg.senderId?.name?.charAt(0) || 'U'}
        </div>
      )}
      <div
        className={`max-w-md p-3 rounded-2xl text-sm leading-relaxed shadow-sm select-text cursor-text ${isMe
            ? 'pulse-gradient-bg text-white rounded-br-none'
            : 'bg-[#EFF0F3] dark:bg-[#1E293B] text-slate-900 dark:text-slate-100 border border-slate-200/60 dark:border-slate-800 rounded-bl-none font-medium'
          }`}
      >
        {!isMe && !isDM && (
          <div className="text-[10px] font-bold text-[#5B6CFF] mb-1.5 px-1 select-text">
            {msg.senderId?.name || 'User'}
          </div>
        )}

        {/* Render Image or Text */}
        {isImage && decryptedImage ? (
          <div className="space-y-1.5">
            <div
              className="relative cursor-pointer group rounded-xl overflow-hidden max-w-xs bg-slate-950/10 dark:bg-slate-950/40 border border-black/5 dark:border-slate-700/50"
              onClick={() => setActiveLightboxImg(decryptedImage)}
            >
              <img
                src={decryptedImage}
                alt="Shared image attachment"
                className="w-full h-auto max-h-72 object-cover rounded-xl group-hover:scale-[1.02] transition-transform duration-200"
              />
              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
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

        <div
          className={`text-[10px] mt-1 text-right opacity-70 px-1 ${isMe ? 'text-white' : 'text-slate-500 dark:text-slate-400'
            }`}
        >
          {new Date(msg.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}

export default function MessageThread({
  messages,
  currentUser,
  isDM,
  loading,
  typingUsers,
  messagesEndRef,
  onStartVideoCall,
}) {
  const [activeLightboxImg, setActiveLightboxImg] = useState(null);

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4">
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

      {/* End-to-End Encryption Security Banner */}
      <div className="flex justify-center my-2">
        <div className="px-3.5 py-1.5 rounded-full bg-indigo-50/80 dark:bg-indigo-950/40 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 flex items-center space-x-1.5 shadow-xs">
          <Lock className="w-3.5 h-3.5 text-[#5B6CFF] shrink-0" />
          <span>Messages & calls are end-to-end encrypted.</span>
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
            setActiveLightboxImg={setActiveLightboxImg}
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
