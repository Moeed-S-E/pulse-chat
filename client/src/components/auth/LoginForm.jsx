import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { UserCheck, Lock, ArrowRight, Info, KeyRound } from 'lucide-react';

export default function LoginForm() {
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(loginIdentifier, password);
      navigate('/app');
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3.5 rounded-2xl bg-red-50/80 dark:bg-red-950/40 border border-red-200/60 dark:border-red-800/60 text-red-600 dark:text-red-400 text-xs font-semibold text-center">
            {error}
          </div>
        )}

        <Input
          label="Email or Username"
          icon={UserCheck}
          placeholder="samuel or sam@example.com"
          required
          value={loginIdentifier}
          onChange={(e) => setLoginIdentifier(e.target.value)}
        />

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Password
            </label>
            <button
              type="button"
              onClick={() => setIsDemoModalOpen(true)}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Forgot password?
            </button>
          </div>
          <Input
            icon={Lock}
            type="password"
            placeholder="••••••••"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={loading}
          className="w-full mt-2"
        >
          <span>{loading ? 'Logging In...' : 'Log In'}</span>
          <ArrowRight className="w-4 h-4" />
        </Button>

        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
          Don't have an account?{' '}
          <Link to="/signup" className="font-bold text-emerald-600 hover:underline ml-1">
            Sign Up
          </Link>
        </div>
      </form>

      {/* Demo Mode / Forgot Password Modal */}
      <Modal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        title="Demo Mode Information"
        subtitle="Password recovery & demo user accounts"
      >
        <div className="space-y-4 pt-2">
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 flex items-start space-x-3">
            <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed font-medium">
              PulseChat is running in <strong className="font-bold">Demo Mode</strong>. Automated email recovery is disabled to preserve system security.
            </div>
          </div>

          {import.meta.env.DEV && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
                <KeyRound className="w-3.5 h-3.5 text-emerald-500" />
                <span>Default Demo Accounts</span>
              </h4>
              <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-2 text-xs">
                <div className="flex justify-between items-center font-mono">
                  <span className="text-slate-700 dark:text-slate-300 font-bold">@samuel</span>
                  <span className="text-slate-500 dark:text-slate-400">password123</span>
                </div>
                <div className="flex justify-between items-center font-mono">
                  <span className="text-slate-700 dark:text-slate-300 font-bold">@alex_rivera</span>
                  <span className="text-slate-500 dark:text-slate-400">password123</span>
                </div>
                <div className="flex justify-between items-center font-mono">
                  <span className="text-slate-700 dark:text-slate-300 font-bold">@jane_doe</span>
                  <span className="text-slate-500 dark:text-slate-400">password123</span>
                </div>
              </div>
            </div>
          )}

          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            You can also create a new personal account anytime from the{' '}
            <Link
              to="/signup"
              onClick={() => setIsDemoModalOpen(false)}
              className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
            >
              Sign Up
            </Link>{' '}
            page.
          </p>

          <Button
            onClick={() => setIsDemoModalOpen(false)}
            variant="primary"
            className="w-full rounded-xl py-2.5 mt-2"
          >
            Got It
          </Button>
        </div>
      </Modal>
    </>
  );
}
