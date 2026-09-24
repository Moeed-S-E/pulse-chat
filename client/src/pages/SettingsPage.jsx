import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import Card from '../components/ui/Card';
import {
  User, AtSign, Mail, Bell, Camera, LogOut, Check, ArrowLeft,
  FileText, Sun, Moon, Sparkles, Volume2, ShieldCheck, Palette,
  Key
} from 'lucide-react';

export default function SettingsPage() {
  const { user, updateProfile, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('profile');

  // Form State
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor || 'emerald');

  const [callAlerts, setCallAlerts] = useState(localStorage.getItem('pulse_call_alerts') !== 'false');
  const [soundEffects, setSoundEffects] = useState(localStorage.getItem('pulse_sound') !== 'false');

  // Status feedback
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const avatarColors = [
    { id: '#059669', name: 'Emerald Green' },
    { id: '#0D9488', name: 'Teal Forest' },
    { id: '#E11D48', name: 'Crimson Rose' },
    { id: '#F59E0B', name: 'Amber Gold' },
    { id: '#0E7490', name: 'Deep Teal' },
    { id: '#16A34A', name: 'WhatsApp Green' },
  ];

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setLoading(true);

    try {
      await updateProfile(name, username, bio, avatarColor);
      localStorage.setItem('pulse_call_alerts', callAlerts);
      localStorage.setItem('pulse_sound', soundEffects);
      setSuccessMsg('Settings updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 transition-colors py-8 px-4 sm:px-6 lg:px-8 flex justify-center">
      <div className="w-full max-w-4xl space-y-6">

        {/* Header Bar */}
        <div className="flex items-center justify-between bg-white dark:bg-[#111827] p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center space-x-3.5">
            <button
              onClick={() => navigate('/app')}
              className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-all cursor-pointer group"
              title="Return to Chat"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-50">
                  Settings & Preferences
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 border border-emerald-100 dark:border-emerald-900/60">
                  PRO
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage profile details, theme appearance, and E2EE security options
              </p>
            </div>
          </div>

          <Button variant="danger" size="sm" onClick={handleLogout} className="rounded-2xl">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Log Out</span>
          </Button>
        </div>

        {/* Success / Error Alerts */}
        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center space-x-2.5 shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <Check className="w-3.5 h-3.5" />
            </div>
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-xs font-bold flex items-center space-x-2.5 shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0 font-black text-xs">
              !
            </div>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Main Grid: Sidebar Tabs + Content Area */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

          {/* Navigation Tabs Column */}
          <div className="md:col-span-4 lg:col-span-3 space-y-2">
            <div className="bg-white dark:bg-[#111827] p-2 sm:p-3 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex md:flex-col overflow-x-auto space-x-2 md:space-x-0 md:space-y-1.5">

              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeTab === 'profile'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
              >
                <User className="w-4 h-4 shrink-0" />
                <span>My Profile</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('appearance')}
                className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeTab === 'appearance'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
              >
                <Palette className="w-4 h-4 shrink-0" />
                <span>Appearance</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeTab === 'security'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Privacy & E2EE</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('notifications')}
                className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeTab === 'notifications'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
              >
                <Bell className="w-4 h-4 shrink-0" />
                <span>Notifications</span>
              </button>

            </div>

            {/* Account Quick Badge Card */}
            <div className="hidden md:block p-4 rounded-3xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-center space-y-2">
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-emerald-900/60 text-emerald-600 text-[11px] font-bold shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>AES-256 E2EE Enabled</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Your private encryption keys are stored securely on this device.
              </p>
            </div>
          </div>

          {/* Tab Content Column */}
          <div className="md:col-span-8 lg:col-span-9">
            <form onSubmit={handleSubmit}>
              <Card className="shadow-lg shadow-slate-900/5 p-6 space-y-6 rounded-3xl border border-slate-200/80 dark:border-slate-800">

                {/* TAB 1: PROFILE */}
                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                        Profile Information
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Update how other users see your account on PulseChat
                      </p>
                    </div>

                    {/* Avatar Customization Card */}
                    <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-pulse-dark-bg border border-slate-200/60 dark:border-slate-800/80 flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
                      <div className="relative group">
                        <Avatar
                          initial={user?.avatarInitial}
                          name={name || user?.name}
                          avatarColor={avatarColor}
                          size="xl"
                          showStatus={false}
                        />
                        <button
                          type="button"
                          disabled
                          className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center cursor-not-allowed opacity-60"
                          title="Avatar upload coming soon"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex-1 text-center sm:text-left space-y-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          Avatar Badge Color Theme
                        </h4>
                        <div className="flex items-center justify-center sm:justify-start space-x-2.5">
                          {avatarColors.map((col) => (
                            <button
                              key={col.id}
                              type="button"
                              onClick={() => setAvatarColor(col.id)}
                              className={`w-7 h-7 rounded-full transition-transform cursor-pointer flex items-center justify-center text-white ${avatarColor === col.id ? `ring-2 ring-offset-2 ring-emerald-500 scale-110` : 'hover:scale-105 opacity-80 hover:opacity-100'}`}
                              style={{ backgroundColor: col.id }}
                              title={col.name}
                            >
                              {avatarColor === col.id && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </button>
                          ))}
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          Select your accent color for chat initial badges & indicators
                        </p>
                      </div>
                    </div>

                    {/* Form Input Fields */}
                    <div className="space-y-4">
                      <Input
                        label="Display Name"
                        icon={User}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your full name"
                      />

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                          <span>Username Handle</span>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/60">
                            Unique ID
                          </span>
                        </label>
                        <div className="relative mb-1">
                          <AtSign className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-100/70 dark:bg-pulse-dark-bg border border-transparent dark:border-slate-800 rounded-2xl text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:bg-white dark:focus:bg-[#111827] focus:border-emerald-500 transition-all"
                            placeholder="username"
                          />
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          Direct handle for friends to search & video call: <span className="font-bold text-emerald-600">@{username || 'handle'}</span>
                        </p>
                      </div>

                      <Input
                        label="Bio / Status Message"
                        icon={FileText}
                        placeholder="Tell others what you're working on..."
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                      />

                      <Input
                        label="Email Address"
                        icon={Mail}
                        type="email"
                        disabled
                        value={user?.email || ''}
                      />
                    </div>
                  </div>
                )}

                {/* TAB 2: APPEARANCE */}
                {activeTab === 'appearance' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                        Theme & Visual Style
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Customize your workspace display colors and UI contrast
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                      {/* Dark Mode Option */}
                      <button
                        type="button"
                        onClick={() => setTheme('dark')}
                        className={`p-4 rounded-2xl border text-left transition-all flex items-start justify-between cursor-pointer ${theme === 'dark'
                          ? 'bg-slate-900 dark:bg-emerald-950/80 border-emerald-500 text-white shadow-md ring-1 ring-emerald-500'
                          : 'bg-slate-50 dark:bg-pulse-dark-bg border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                          }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 shrink-0">
                            <Moon className="w-5 h-5" />
                          </div>
                          <div>
                            <h5 className="text-xs font-black">Dark Mode</h5>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Sleek slate backdrop optimized for low-light focus
                            </p>
                          </div>
                        </div>
                        {theme === 'dark' && (
                          <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </button>

                      {/* Light Mode Option */}
                      <button
                        type="button"
                        onClick={() => setTheme('light')}
                        className={`p-4 rounded-2xl border text-left transition-all flex items-start justify-between cursor-pointer ${theme === 'light'
                          ? 'bg-white border-emerald-500 text-slate-900 shadow-md ring-1 ring-emerald-500/40'
                          : 'bg-slate-50 dark:bg-pulse-dark-bg border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                          }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                            <Sun className="w-5 h-5" />
                          </div>
                          <div>
                            <h5 className="text-xs font-black">Light Mode</h5>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Crisp high-contrast white & slate elements
                            </p>
                          </div>
                        </div>
                        {theme === 'light' && (
                          <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </button>

                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-pulse-dark-bg border border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Sparkles className="w-5 h-5 text-emerald-600" />
                        <div>
                          <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">Clean Monochrome Backgrounds</h5>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">Pure gradient-free canvas applied across all views</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                        Active
                      </span>
                    </div>
                  </div>
                )}

                {/* TAB 3: SECURITY & E2EE */}
                {activeTab === 'security' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                        Privacy & Encryption
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Manage encryption settings and visibility preferences
                      </p>
                    </div>

                    {/* Encryption Status Card */}
                    <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-emerald-950 text-white border border-emerald-900/60 shadow-md space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-9 h-9 rounded-xl bg-emerald-600/30 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black tracking-wide text-white">Transport Encryption & Client-Side AES-GCM</h4>
                            <p className="text-[11px] text-emerald-200">AES-GCM pre-storage encryption</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          VERIFIED
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        Messages & media standard payloads are encrypted locally prior to server transport. Only participants with session keys can decrypt content.
                      </p>

                      <div className="pt-2 border-t border-emerald-900/80 flex items-center justify-between text-[11px] text-emerald-300">
                        <span className="flex items-center space-x-1">
                          <Key className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Local RSA/AES Subsystem Active</span>
                        </span>
                      </div>
                    </div>

                    {/* iOS Toggles */}
                    <div className="space-y-3">
                      <div className="text-center text-xs text-slate-500 py-4">
                        Read receipts and online status are currently disabled pending E2EE protocol updates.
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: NOTIFICATIONS */}
                {activeTab === 'notifications' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                        Sound & Call Notifications
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Control ringtones, desktop alerts, and sound effects
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/70 dark:bg-pulse-dark-bg border border-slate-200/60 dark:border-slate-800/80">
                        <div className="flex items-center space-x-3">
                          <Bell className="w-4 h-4 text-emerald-600" />
                          <div>
                            <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">Incoming Call Ringtones</h5>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Play audio alerts when someone calls @{username}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCallAlerts(!callAlerts)}
                          className={`w-11 h-6 rounded-full transition-colors cursor-pointer relative p-0.5 ${callAlerts ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                        >
                          <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${callAlerts ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/70 dark:bg-pulse-dark-bg border border-slate-200/60 dark:border-slate-800/80">
                        <div className="flex items-center space-x-3">
                          <Volume2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                          <div>
                            <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">In-App Sound Effects</h5>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Subtle chime on message send and receive</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSoundEffects(!soundEffects)}
                          className={`w-11 h-6 rounded-full transition-colors cursor-pointer relative p-0.5 ${soundEffects ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                        >
                          <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${soundEffects ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom Save Action Bar */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => navigate('/app')}
                    className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={loading}
                    className="rounded-2xl px-6"
                  >
                    {loading ? 'Saving Changes...' : 'Save Profile Changes'}
                  </Button>
                </div>

              </Card>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}

