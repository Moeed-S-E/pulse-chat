import React from 'react';

export default function Avatar({
  initial = 'P',
  name = '',
  avatarColor,
  isOnline = false,
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  showStatus = true,
  className = '',
}) {
  const sizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-24 h-24 text-3xl',
  };

  const statusDotSizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
    xl: 'w-5 h-5',
  };

  const colorMap = {
    emerald: 'bg-emerald-600',
    rose: 'bg-rose-600',
    amber: 'bg-amber-500',
    teal: 'bg-teal-600',
    green: 'bg-green-600',
  };

  const bgClass = colorMap[avatarColor] || 'bg-emerald-600';
  const displayInitial = initial || (name ? name.charAt(0).toUpperCase() : 'P');

  return (
    <div className={`relative shrink-0 ${className}`}>
      <div
        className={`${sizes[size]} rounded-full ${bgClass} flex items-center justify-center text-white font-extrabold shadow-sm transition-colors`}
      >
        {displayInitial}
      </div>
      {showStatus && (
        <span
          className={`absolute bottom-0 right-0 ${statusDotSizes[size]} rounded-full border-2 border-white dark:border-[#111827] ${
            isOnline ? 'bg-[#1E8E3E]' : 'bg-slate-300 dark:bg-slate-600'
          }`}
        />
      )}
    </div>
  );
}

