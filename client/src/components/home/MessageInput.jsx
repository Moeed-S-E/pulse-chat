import React, { useState, useRef } from 'react';
import { Send, Paperclip, Image as ImageIcon } from 'lucide-react';
import { prepareImage } from '../../utils/image';

export default function MessageInput({
  inputText,
  onInputChange,
  onSendMessage,
  onSendImage,
}) {
  const [toastNotice, setToastNotice] = useState('');
  const fileInputRef = useRef(null);

  const handlePaperclipClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setToastNotice('Only image files can be shared. Documents & other files are disabled.');
      setTimeout(() => setToastNotice(''), 4000);
      e.target.value = '';
      return;
    }

    // Limit image file size strictly to 10 MB (GIF 4 MB)
    const MAX_FILE_SIZE_BYTES = file.type === 'image/gif' ? 4 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setToastNotice(`File size exceeds limit (${file.type === 'image/gif' ? '4 MB for GIF' : '10 MB'}).`);
      setTimeout(() => setToastNotice(''), 4000);
      e.target.value = '';
      return;
    }

    try {
      const base64Data = await prepareImage(file);
      if (onSendImage) {
        onSendImage(base64Data);
      }
    } catch {
      setToastNotice('Failed to process image.');
      setTimeout(() => setToastNotice(''), 4000);
    }
    e.target.value = '';
  };

  return (
    <div className="p-2.5 sm:p-4 bg-white dark:bg-[#262C31] border-t border-slate-200 dark:border-[#2D353B] shrink-0 relative transition-colors">
      {/* Hidden File Input strictly for images */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/jpg, image/gif, image/webp"
        className="hidden"
      />

      {/* Toast Notice Banner for file restriction or errors */}
      {toastNotice && (
        <div className="absolute -top-11 left-3 right-3 sm:left-6 sm:right-6 mx-auto max-w-md px-3 sm:px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl text-center shadow-xl border border-slate-800 animate-fade-in z-30 flex items-center justify-center space-x-2">
          <ImageIcon className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastNotice}</span>
        </div>
      )}

      <form onSubmit={onSendMessage} className="flex items-center space-x-2 sm:space-x-3">
        {/* Paperclip Button for Image Sharing (Max 15 MB) */}
        <button
          type="button"
          onClick={handlePaperclipClick}
          title="Share an Image (Max 10 MB)"
          className="p-2 text-slate-500 dark:text-[#B0BEC5] hover:text-emerald-600 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative cursor-pointer"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={onInputChange}
          placeholder="Type a message..."
          className="flex-1 py-3 px-4 bg-slate-100 dark:bg-[#1E2429] border border-slate-200 dark:border-[#2D353B] rounded-full text-sm font-medium text-slate-900 dark:text-[#EEF2F5] placeholder:text-slate-400 dark:placeholder:text-[#9AA8B2] focus:outline-none focus:border-emerald-500"
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="w-10 h-10 rounded-full pulse-gradient-bg text-white flex items-center justify-center shadow-md shadow-emerald-500/30 hover:opacity-95 active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
