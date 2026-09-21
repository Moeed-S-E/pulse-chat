import React, { useState, useRef } from 'react';
import { Send, Paperclip, Image as ImageIcon } from 'lucide-react';

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

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setToastNotice('Only image files can be shared. Documents & other files are disabled.');
      setTimeout(() => setToastNotice(''), 4000);
      e.target.value = '';
      return;
    }

    // Limit image file size strictly to 15 MB (15 * 1024 * 1024 bytes)
    const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setToastNotice('File size exceeds 15 MB limit. Please select a smaller file.');
      setTimeout(() => setToastNotice(''), 4000);
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result;
      if (onSendImage) {
        onSendImage(base64Data);
      }
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-2.5 sm:p-4 bg-white dark:bg-[#111827] border-t border-slate-200/80 dark:border-slate-800 shrink-0 relative transition-colors">
      {/* Hidden File Input strictly for images */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/jpg, image/gif, image/webp, image/svg+xml"
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
          title="Share an Image (Max 15 MB)"
          className="p-2 text-slate-500 dark:text-slate-400 hover:text-pulse-blue rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative cursor-pointer"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={onInputChange}
          placeholder="Type a message..."
          className="flex-1 py-3 px-4 bg-slate-100 dark:bg-pulse-dark-bg border border-transparent dark:border-slate-800 rounded-full text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-pulse-blue"
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="w-10 h-10 rounded-full pulse-gradient-bg text-white flex items-center justify-center shadow-md shadow-pulse-blue/30 hover:opacity-95 active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
