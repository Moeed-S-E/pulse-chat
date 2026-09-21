import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ToastProvider } from './context/ToastContext';
import { CallProvider } from './context/CallContext';
import { ThemeProvider } from './context/ThemeContext';

import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import SettingsPage from './pages/SettingsPage';
import LandingPage from './pages/LandingPage';

import ToastSnackbarContainer from './components/ui/ToastSnackbarContainer';
import ActiveCallOverlay from './components/calls/ActiveCallOverlay';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA] dark:bg-pulse-dark-bg">
        <div className="w-10 h-10 border-4 border-pulse-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public Only Route Component
const PublicOnlyRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) {
    return <Navigate to="/app" replace />;
  }

  return children;
};

export default function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <ToastProvider>
              <CallProvider>
                {/* Global Toast & Incoming Call Snackbar Banners */}
                <ToastSnackbarContainer />
                {/* Global 1:M Active Video Call Overlay */}
                <ActiveCallOverlay />

                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route
                    path="/signup"
                    element={
                      <PublicOnlyRoute>
                        <AuthPage mode="signup" />
                      </PublicOnlyRoute>
                    }
                  />
                  <Route
                    path="/login"
                    element={
                      <PublicOnlyRoute>
                        <AuthPage mode="login" />
                      </PublicOnlyRoute>
                    }
                  />
                  <Route
                    path="/app"
                    element={
                      <ProtectedRoute>
                        <HomePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <SettingsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </CallProvider>
            </ToastProvider>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}
