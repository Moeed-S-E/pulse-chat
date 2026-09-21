import React from 'react';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 animate-fade-in">
      <div
        className={`w-full ${maxWidth} bg-white dark:bg-[#1E293B] text-slate-900 dark:text-slate-100 rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-700/60 relative overflow-hidden`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{title}</h3>}
            {subtitle && <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {children}
      </div>
    </div>
  );
}
