import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../config/api';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { User, AtSign, Mail, Lock, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SignUpForm() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [usernameStatus, setUsernameStatus] = useState({ state: 'idle', message: '' }); // 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

  const { signup } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const cleanUsername = username.toLowerCase().trim().replace(/^@/, '');
    if (!cleanUsername) {
      setUsernameStatus({ state: 'idle', message: '' });
      return;
    }

    if (cleanUsername.length < 3 || !/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
      setUsernameStatus({
        state: 'invalid',
        message: 'Must be 3-30 characters (letters, numbers, _, -)',
      });
      return;
    }

    setUsernameStatus({ state: 'checking', message: 'Checking availability...' });

    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch(`/api/auth/check-username/${encodeURIComponent(cleanUsername)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.available) {
            setUsernameStatus({ state: 'available', message: 'Username is available!' });
          } else {
            setUsernameStatus({ state: 'taken', message: data.message || 'Username is already taken.' });
          }
        } else {
          const data = await res.json();
          setUsernameStatus({ state: 'taken', message: data.message || 'Invalid username.' });
        }
      } catch {
        setUsernameStatus({ state: 'idle', message: '' });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [username]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (usernameStatus.state === 'taken' || usernameStatus.state === 'invalid') {
      setError(usernameStatus.message || 'Please choose a valid & available username.');
      return;
    }

    setLoading(true);

    try {
      await signup(name, username, email, password);
      navigate('/app');
    } catch (err) {
      setError(err.message || 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-semibold text-center">
          {error}
        </div>
      )}

      <Input
        label="Full Name"
        icon={User}
        placeholder="Sam Wilson"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div>
        <Input
          label="Username"
          icon={AtSign}
          placeholder="samuel"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        {usernameStatus.state !== 'idle' && (
          <div className="mt-1 flex items-center space-x-1.5 text-[11px] font-semibold">
            {usernameStatus.state === 'checking' && (
              <span className="text-slate-400 dark:text-slate-500">Checking availability...</span>
            )}
            {usernameStatus.state === 'available' && (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">{usernameStatus.message}</span>
              </>
            )}
            {(usernameStatus.state === 'taken' || usernameStatus.state === 'invalid') && (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-red-500 dark:text-red-400">{usernameStatus.message}</span>
              </>
            )}
          </div>
        )}
      </div>

      <Input
        label="Email Address"
        icon={Mail}
        type="email"
        placeholder="sam@example.com"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <Input
        label="Password"
        icon={Lock}
        type="password"
        placeholder="••••••••"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={loading || usernameStatus.state === 'taken' || usernameStatus.state === 'invalid'}
        className="w-full mt-2"
      >
        <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
        <ArrowRight className="w-4 h-4" />
      </Button>

      <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/60 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
        Already have an account?{' '}
        <Link to="/login" className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline ml-1">
          Log In
        </Link>
      </div>
    </form>
  );
}
