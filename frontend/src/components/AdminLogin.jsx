import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Lock, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

export default function AdminLogin({ apiBase, onLoginSuccess, onCancel }) {
  const [config, setConfig] = useState(null); // { google, googleClientId, password }
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const googleBtnRef = useRef(null);

  // 1. Ask the backend which sign-in methods are available.
  useEffect(() => {
    let active = true;
    fetch(`${apiBase}/auth/config`)
      .then((r) => r.json())
      .then((cfg) => { if (active) setConfig(cfg); })
      .catch(() => { if (active) setConfig({ google: false, password: true }); });
    return () => { active = false; };
  }, [apiBase]);

  // 2. Load Google Identity Services and render the official button (only if configured).
  useEffect(() => {
    if (!config?.google || !config.googleClientId) return;

    const renderButton = () => {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: config.googleClientId,
        callback: handleGoogleCredential,
      });
      googleBtnRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: 300,
        text: 'signin_with',
        shape: 'pill',
      });
    };

    if (window.google?.accounts?.id) {
      renderButton();
      return;
    }
    const SCRIPT_ID = 'google-gsi-client';
    let script = document.getElementById(SCRIPT_ID);
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.id = SCRIPT_ID;
      script.onload = renderButton;
      document.body.appendChild(script);
    } else {
      script.addEventListener('load', renderButton);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const handleGoogleCredential = async (response) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (res.ok) {
        onLoginSuccess(data.token, data.user);
      } else {
        setError(data.error || 'Google sign-in failed.');
      }
    } catch (e) {
      setError('Network error contacting the server.');
    }
    setLoading(false);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok) {
        onLoginSuccess(data.token, data.user);
      } else {
        setError(data.error || 'Login failed.');
      }
    } catch (e) {
      setError('Network error contacting the server.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 mb-5 transition-colors"
        >
          <ArrowLeft size={14} /> Back to website
        </button>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8 sm:p-10">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-brand-navy/5 border border-brand-navy/10 flex items-center justify-center text-brand-navy mb-4">
              <ShieldCheck size={28} />
            </div>
            <h1 className="text-2xl font-extrabold text-brand-navy">Admin Access</h1>
            <p className="text-xs font-semibold text-slate-400 mt-1.5">
              Restricted area — authorized administrators only.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Google Sign-In */}
          {config?.google && (
            <div className="flex justify-center mb-6">
              <div ref={googleBtnRef} className="min-h-[44px]" />
            </div>
          )}

          {/* Divider (only when both methods exist) */}
          {config?.google && config?.password && (
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-grow bg-slate-200" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">or</span>
              <div className="h-px flex-grow bg-slate-200" />
            </div>
          )}

          {/* Password login */}
          {config?.password && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Admin Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    autoFocus
                    placeholder="Enter admin password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-steel bg-slate-50 font-medium"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-brand-navy hover:bg-brand-steel text-white font-bold text-sm transition-all shadow-md shadow-brand-navy/15 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={15} />}
                <span>{loading ? 'Verifying…' : 'Sign in'}</span>
              </button>
            </form>
          )}

          {config && !config.google && !config.password && (
            <p className="text-center text-xs font-semibold text-slate-500">
              No sign-in method is configured on the server. Set <code className="text-brand-steel">ADMIN_PASSWORD</code> or{' '}
              <code className="text-brand-steel">GOOGLE_CLIENT_ID</code> in the backend <code>.env</code>.
            </p>
          )}

          {!config && (
            <div className="flex justify-center py-4 text-slate-400">
              <Loader2 size={20} className="animate-spin" />
            </div>
          )}
        </div>

        <p className="text-center text-[10px] font-semibold text-slate-400 mt-5">
          Sessions expire automatically after 8 hours.
        </p>
      </div>
    </div>
  );
}
