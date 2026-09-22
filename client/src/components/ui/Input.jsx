import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function Input({
  label,
  icon: Icon,
  type = 'text',
  placeholder,
  value,
  onChange,
  required = false,
  disabled = false,
  error,
  helperText,
  className = '',
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordType = type === 'password';
  const inputType = isPasswordType ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        )}
        <input
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`w-full ${
            Icon ? 'pl-11' : 'pl-4'
          } ${isPasswordType ? 'pr-11' : 'pr-4'} py-3 bg-white dark:bg-[#1E2429] border border-slate-200 dark:border-[#2D353B] rounded-2xl text-sm font-medium text-slate-900 dark:text-[#EEF2F5] placeholder:text-slate-400 dark:placeholder:text-[#9AA8B2] focus:outline-none focus:bg-white dark:focus:bg-[#262C31] focus:border-pulse-blue focus:ring-4 focus:ring-pulse-blue/10 transition-all ${
            disabled ? 'bg-slate-100 dark:bg-[#1A1F24] cursor-not-allowed text-slate-500 dark:text-slate-400' : ''
          }`}
          {...props}
        />
        {isPasswordType && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1 cursor-pointer focus:outline-none"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500 dark:text-red-400 font-semibold mt-1">{error}</p>}
      {helperText && !error && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">{helperText}</p>
      )}
    </div>
  );
}
