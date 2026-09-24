import React, { useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ToastProvider } from './context/ToastContext';
import { CallProvider } from './context/CallContext';
import { ThemeProvider } from './context/ThemeContext';

import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import SettingsPage from './pages/SettingsPage';

const LandingPage = React.lazy(() => import('./pages/LandingPage'));

import ToastSnackbarContainer from './components/ui/ToastSnackbarContainer';
import ActiveCallOverlay from './components/calls/ActiveCallOverlay';
import HealthKeepAlive from './components/common/HealthKeepAlive';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0B0B] text-[#F2F0EA]">
        <div className="w-10 h-10 border-4 border-[#C4F135] border-t-transparent rounded-full animate-spin" />
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

// Route Transition Layout Component (macOS Window Minimize/Restore Animation)
function PageTransitionLayout({ children }) {
  const location = useLocation();
  const containerRef = useRef(null);
  const isFirstRender = useRef(true);
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;

      const el = containerRef.current;
      if (!el) return;

      const tl = gsap.timeline();

      // macOS Minimize window down -> Expand new window up
      tl.to(el, {
        scale: 0.94,
        y: 40,
        opacity: 0,
        borderRadius: '24px',
        duration: 0.35,
        ease: 'power3.in',
        onComplete: () => {
          window.scrollTo(0, 0);
        },
      }).fromTo(
        el,
        { scale: 0.94, y: -30, opacity: 0, borderRadius: '24px' },
        {
          scale: 1,
          y: 0,
          opacity: 1,
          borderRadius: '0px',
          duration: 0.45,
          ease: 'power3.out',
          clearProps: 'transform,borderRadius',
        }
      );
    }
  }, [location.pathname]);

  return (
    <div
      ref={containerRef}
      className="w-full min-h-screen origin-center transition-all bg-[#0B0B0B]"
    >
      {children}
    </div>
  );
}

export default function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <ToastProvider>
              <CallProvider>
                <PageTransitionLayout>
                  {/* Global Toast & Incoming Call Snackbar Banners */}
                  <ToastSnackbarContainer />
                  {/* Global 1:M Active Video Call Overlay */}
                  <ActiveCallOverlay />
                  {/* Backend Health Check 15s Timer Keep-Alive */}
                  <HealthKeepAlive />

                  <React.Suspense fallback={<div className="min-h-screen bg-[#0B0B0B]" />}>
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
                  </React.Suspense>
                </PageTransitionLayout>
              </CallProvider>
            </ToastProvider>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}
