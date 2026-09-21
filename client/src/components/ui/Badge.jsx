import React from 'react';

export default function Badge({
  children,
  variant = 'gradient', // 'gradient' | 'green' | 'gray' | 'dark'
  className = '',
}) {
  const variants = {
    gradient: 'pulse-gradient-bg text-white shadow-sm',
    green: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    gray: 'bg-slate-100 text-slate-600',
    dark: 'call-glass-bar text-white border border-white/10 shadow-lg',
  };

  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center space-x-1 ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
