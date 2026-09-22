import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { UserCheck, Lock, ArrowRight } from 'lucide-react';

export default function LoginForm() {
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
          <a
            href="#forgot"
            onClick={(e) => {
              e.preventDefault();
              alert('Demo mode: Please sign up a new user or use your password.');
            }}
            className="text-xs font-bold text-emerald-600 hover:underline"
          >
            Forgot password?
          </a>
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
  );
}
