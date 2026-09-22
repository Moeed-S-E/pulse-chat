import React from 'react';

export default function Card({ children, className = '' }) {
  return (
    <div
      className={`bg-white dark:bg-[#262C31] text-slate-900 dark:text-[#EEF2F5] rounded-3xl p-6 sm:p-8 shadow-sm dark:shadow-2xl border border-slate-200 dark:border-[#2D353B] transition-all duration-200 ${className}`}
    >
      {children}
    </div>
  );
}
