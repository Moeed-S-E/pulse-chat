import React from 'react';
import Card from '../ui/Card';
import { Activity } from 'lucide-react';

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-[#F8FAFC] dark:bg-pulse-dark-bg relative overflow-hidden transition-colors">
      {/* Main Card */}
      <Card className="w-full max-w-md relative z-10 shadow-xl shadow-slate-900/5">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-pulse-blue flex items-center justify-center text-white shadow-md shadow-pulse-blue/25 mb-3">
            <Activity className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            {title || 'PulseChat'}
          </h1>
          {subtitle && (
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 text-center">
              {subtitle}
            </p>
          )}
        </div>

        {children}
      </Card>
    </div>
  );
}
