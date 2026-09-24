import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../config/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('pulsechat_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const res = await apiFetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          localStorage.removeItem('pulsechat_token');
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.error('Error verifying auth session:', err);
        localStorage.removeItem('pulsechat_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, [token]);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('pulse:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('pulse:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (loginIdentifier, password) => {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginIdentifier, password }),
    });

    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('pulsechat_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } else {
      throw new Error(data.message || 'Login failed.');
    }
  };

  const signup = async (name, username, email, password) => {
    const res = await apiFetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, username, email, password }),
    });

    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('pulsechat_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } else {
      throw new Error(data.message || 'Signup failed.');
    }
  };

  const logout = () => {
    localStorage.removeItem('pulsechat_token');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (name, username, bio, avatarColor) => {
    const res = await apiFetch('/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, username, bio, avatarColor }),
    });

    const data = await res.json();
    if (res.ok) {
      setUser(data.user);
      return data.user;
    } else {
      throw new Error(data.message || 'Failed to update profile.');
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
