import React from 'react';

export default function Card({ children, className = '' }) {
  return (
    <div
      className={`bg-white dark:bg-[#1E293B] text-slate-900 dark:text-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm dark:shadow-2xl border border-slate-200/50 dark:border-slate-800/80 transition-all duration-200 ${className}`}
    >
      {children}
    </div>
  );
}
