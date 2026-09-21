import React from 'react';
import AuthLayout from '../components/auth/AuthLayout';
import SignUpForm from '../components/auth/SignUpForm';
import LoginForm from '../components/auth/LoginForm';

export default function AuthPage({ mode = 'login' }) {
  const isSignUp = mode === 'signup';

  return (
    <AuthLayout
      title={isSignUp ? 'Create Your Account' : 'Welcome Back'}
      subtitle={
        isSignUp
          ? 'Join your team and friends for messaging & video calling'
          : 'Log in to continue chatting & video calling'
      }
    >
      {isSignUp ? <SignUpForm /> : <LoginForm />}
    </AuthLayout>
  );
}
