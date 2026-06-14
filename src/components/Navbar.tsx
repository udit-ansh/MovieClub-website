import React, { useState } from 'react';
import { Film, User as UserIcon, LogOut, Shield, ShieldCheck, HelpCircle, GraduationCap } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  currentUser: User | null;
  onLogin: (email: string, name: string, role: 'admin' | 'student') => void;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  adminMode: boolean;
  setAdminMode: (mode: boolean) => void;
}

export default function Navbar({
  currentUser,
  onLogin,
  onLogout,
  activeTab,
  setActiveTab,
  adminMode,
  setAdminMode,
}: NavbarProps) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showAdminVerify, setShowAdminVerify] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) {
      setErrorMsg('Email address is required');
      return;
    }

    const trimmedEmail = emailInput.trim().toLowerCase();
    // Validate institute email format
    // Accept standard user email or @iiserkol.ac.in
    const extMatch = trimmedEmail.endsWith('@iiserkol.ac.in');
    
    // For demonstration and easy testing, we also accept uditansh2007@gmail.com (user email in metadata) or basic custom entry
    // but we enforce the rule with a helper warning
    if (!extMatch && trimmedEmail !== 'uditansh2007@gmail.com') {
      setErrorMsg('Please use your official IISER K email ID (@iiserkol.ac.in)');
      return;
    }

    // Extrapolate a name if not provided
    let calculatedName = nameInput.trim();
    if (!calculatedName) {
      const partBeforeAt = trimmedEmail.split('@')[0];
      calculatedName = partBeforeAt
        .split('.')
        .map(p => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ');
    }

    // Default role is student unless authenticated, or we can check simple passcode
    let role: 'admin' | 'student' = 'student';
    if (trimmedEmail.startsWith('admin') || passwordInput === 'admin123') {
      role = 'admin';
    }

    onLogin(trimmedEmail, calculatedName, role);
    setShowLoginModal(false);
    setEmailInput('');
    setNameInput('');
    setPasswordInput('');
    setErrorMsg('');
  };

  const handleAdminAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'admin123') {
      setAdminMode(true);
      if (currentUser) {
        onLogin(currentUser.email, currentUser.name, 'admin');
      } else {
        onLogin('admin.movieclub@iiserkol.ac.in', 'Club Administrator', 'admin');
      }
      setShowAdminVerify(false);
      setPasswordInput('');
      setErrorMsg('');
    } else {
      setErrorMsg('Incorrect passcode. Use experimental password: admin123');
    }
  };

  const handleSignOut = () => {
    onLogout();
    setAdminMode(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('schedule')}>
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/30">
              <Film className="h-6 w-6" id="logo-icon" />
              <div className="absolute -top-1 -right-1 flex h-3 w-3 rounded-full bg-amber-500 animate-pulse"></div>
            </div>
            <div>
              <h1 className="font-serif text-lg font-bold tracking-tight text-zinc-100 sm:text-xl">
                CINEPHILIA
              </h1>
              <p className="font-mono text-[10px] tracking-wider text-amber-500/80 uppercase">
                IISER Kolkata Movie Club
              </p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="hidden md:flex items-center space-x-1">
            {[
              { id: 'schedule', label: 'Screenings' },
              { id: 'past', label: 'Letterboxd Reels' },
              { id: 'recommendations', label: 'Recommendations' },
              { id: 'trivia', label: 'CineQuiz' }
            ].map((tab) => (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'text-amber-400 bg-zinc-900'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-amber-500 rounded-full" />
                )}
              </button>
            ))}
          </nav>

          {/* User Session Auth Actions */}
          <div className="flex items-center space-x-4">
            {/* Quick Admin Toggler for ease of editing schedules */}
            {adminMode ? (
              <div className="flex items-center space-x-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1.5 rounded-lg text-xs font-mono">
                <ShieldCheck className="h-4 w-4 text-amber-500" />
                <span className="hidden sm:inline">Admin Mode Active</span>
                <button
                  onClick={() => {
                    setAdminMode(false);
                    if (currentUser && currentUser.role === 'admin') {
                      onLogin(currentUser.email, currentUser.name, 'student');
                    }
                  }}
                  className="ml-1 underline hover:text-white cursor-pointer"
                >
                  Exit
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAdminVerify(true)}
                className="flex items-center space-x-1 text-zinc-400 hover:text-amber-400 border border-zinc-800 hover:border-amber-500/30 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors"
                title="Schedules can be edited by Admin. Code: admin123"
              >
                <Shield className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Admin Access</span>
              </button>
            )}

            {currentUser ? (
              <div className="flex items-center space-x-3 pl-2 border-l border-zinc-800">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-medium text-zinc-200 text-ellipsis max-w-[120px] overflow-hidden">
                    {currentUser.name}
                  </p>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    {currentUser.role === 'admin' ? 'Club Coordinator' : 'IISER-K Member'}
                  </p>
                </div>
                <div className="relative h-9 w-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-400 font-semibold cursor-pointer group">
                  {currentUser.name.charAt(0).toUpperCase()}
                  <div className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full bg-green-500 border border-zinc-950"></div>
                  
                  {/* Hover dropdown simulated */}
                  <div className="absolute right-0 top-11 bg-zinc-900 border border-zinc-800 rounded-lg py-1 px-2 w-48 text-left shadow-xl hidden group-hover:block z-50">
                    <p className="text-[11px] font-mono text-zinc-500 border-b border-zinc-800 pb-1 mb-1 truncate">
                      {currentUser.email}
                    </p>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center space-x-2 text-red-400 hover:bg-zinc-850 p-1.5 rounded text-xs"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  id="btn-signout"
                  className="p-2 text-zinc-500 hover:text-red-400 rounded-lg transition-colors hidden sm:inline-block"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                id="btn-login-trigger"
                className="flex items-center space-x-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 px-4 py-2 h-10 rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-amber-500/10 cursor-pointer"
              >
                <UserIcon className="h-4 w-4" />
                <span>Institute Login</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile quick submenu */}
        <div className="flex md:hidden items-center justify-around h-11 border-t border-zinc-900 bg-zinc-950">
          {[
            { id: 'schedule', label: 'Screenings' },
            { id: 'past', label: 'Reels' },
            { id: 'recommendations', label: 'Requests' },
            { id: 'trivia', label: 'Quiz' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${
                activeTab === tab.id ? 'text-amber-400 bg-zinc-900/80' : 'text-zinc-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl relative">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="h-12 w-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center ring-1 ring-amber-500/20 mb-3">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h2 className="font-serif text-xl font-bold text-zinc-100">IISER Kolkata Email Authentication</h2>
              <p className="text-xs text-zinc-400 max-w-xs mt-1">
                Access schedule actions and submit/vote on recommendations using your campus email ID.
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase tracking-wider">
                  IISER-K Student Email ID
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. user21@iiserkol.ac.in"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                />
                <span className="text-[10px] text-zinc-500 block mt-1 font-mono italic">
                  Must end with @iiserkol.ac.in (or use uditansh2007@gmail.com)
                </span>
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ritoban Roy"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                />
              </div>

              <div className="border-t border-zinc-900 pt-4">
                <div className="flex items-center space-x-2 text-xs text-zinc-500 mb-2">
                  <HelpCircle className="h-3.5 w-3.5" />
                  <span>Logging in as club administrator?</span>
                </div>
                <input
                  type="password"
                  placeholder="Enter administrative passcode (optional)"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                />
                <span className="text-[10px] text-zinc-500 block mt-1 font-mono italic">
                  To log in as admin, use experimental passcode: <code className="text-amber-500 bg-amber-500/5 px-1 rounded block sm:inline">admin123</code>
                </span>
              </div>

              {errorMsg && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
                  {errorMsg}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-zinc-950 px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  Verify Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Mode Verification Modal */}
      {showAdminVerify && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-850 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex flex-col items-center text-center mb-5">
              <Shield className="h-10 w-10 text-amber-500 mb-2 animate-pulse" />
              <h2 className="font-serif text-lg font-bold text-zinc-100">Unlock Administrative Console</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Authorized IISER Kolkata Movie Club coordinators only.
              </p>
            </div>

            <form onSubmit={handleAdminAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Admin Passcode
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Enter coordinates or admin passcode"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50 text-center"
                />
                <span className="text-[10px] text-zinc-500 block text-center mt-2 font-mono">
                  Default test passcode: <code className="text-amber-500 font-bold">admin123</code>
                </span>
              </div>

              {errorMsg && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/25 p-3 text-xs text-red-400 text-center">
                  {errorMsg}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminVerify(false);
                    setPasswordInput('');
                    setErrorMsg('');
                  }}
                  className="px-4 py-2 text-sm font-semibold text-zinc-400 hover:text-zinc-200"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-zinc-950 px-5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center space-x-1"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Authenticate</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
