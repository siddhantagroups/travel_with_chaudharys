import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Lock, ArrowLeft, Loader2, AlertCircle, ArrowRight, Check, RefreshCw, Eye, EyeOff } from 'lucide-react';

const HANDSHAKE_STEPS = [
  'Contacting authentication service',
  'Verifying sign-in methods',
  'Opening secure channel',
];

// The handshake is paced so it reads, but it never finishes before the real
// check does — and it refuses to open the form if the server can't authenticate.
// One entry per step: the earliest each check is allowed to report its result.
// Entry veil: how long it holds before dissolving. VEIL_FADE_MS must match the
// .gate-veil transition below.
const VEIL_HOLD_MS = 1400;
const VEIL_FADE_MS = 440;
// How long "Access granted" stays up while the dashboard's data loads behind it.
const GRANTED_MS = 1500;
// The first step clears just as the veil clears, so the sequence is watched
// rather than half-missed behind it.
const STEP_AT = [1500, 2080, 2660];

export default function AdminLogin({ apiBase, onLoginSuccess, onCancel }) {
  const [config, setConfig] = useState(null); // { google, googleClientId, password }
  const [status, setStatus] = useState('checking'); // 'checking' | 'online' | 'offline'
  const [phase, setPhase] = useState('handshake'); // 'handshake' | 'ready' | 'failed'
  const [cleared, setCleared] = useState(0); // how many checks have passed
  const [failure, setFailure] = useState(null); // { step, reason }
  const [attempt, setAttempt] = useState(0);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [veil, setVeil] = useState('in'); // 'in' | 'out' | 'gone'
  const googleBtnRef = useRef(null);

  // 0. An entry veil so arriving at /admin isn't a hard cut. It runs over the
  //    top of the checks rather than before them, so it costs no extra time.
  useEffect(() => {
    const t1 = setTimeout(() => setVeil('out'), VEIL_HOLD_MS);
    const t2 = setTimeout(() => setVeil('gone'), VEIL_HOLD_MS + VEIL_FADE_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // 1. Run the gateway checks, then hand over to the sign-in form.
  useEffect(() => {
    let active = true;
    const startedAt = Date.now();
    const timers = [];

    setPhase('handshake');
    setCleared(0);
    setFailure(null);
    setStatus('checking');

    // A step only ticks once its real check has passed; `at` just holds the
    // result back long enough to be read. On localhost the fetch returns in a
    // few ms, so without this the bar would jump straight from empty to full.
    const at = (ms, fn) => {
      timers.push(setTimeout(() => { if (active) fn(); }, Math.max(0, ms - (Date.now() - startedAt))));
    };

    fetch(`${apiBase}/auth/config`)
      .then((r) => r.json())
      .then((cfg) => {
        // Check 1 passed: the service answered.
        at(STEP_AT[0], () => setCleared(1));

        if (cfg.password || cfg.google) {
          // Check 2 passed: at least one sign-in method is usable.
          at(STEP_AT[1], () => setCleared(2));
          at(STEP_AT[2], () => {
            setConfig(cfg);
            setStatus('online');
            setCleared(3);
            setPhase('ready');
          });
        } else {
          // Reachable, but nobody could sign in — don't open the form.
          at(STEP_AT[1], () => {
            setConfig(cfg);
            setStatus('online');
            setFailure({
              step: 1,
              reason: 'The server has no sign-in method enabled, so the form would not work. Set ADMIN_PASSWORD or GOOGLE_CLIENT_ID in the backend .env, then restart it.',
            });
            setPhase('failed');
          });
        }
      })
      .catch(() => {
        at(STEP_AT[0], () => {
          setConfig({ google: false, password: true });
          setStatus('offline');
          setFailure({ step: 0, reason: 'The authentication service did not respond. Start the backend on port 5000, then try again.' });
          setPhase('failed');
        });
      });

    return () => { active = false; timers.forEach(clearTimeout); };
  }, [apiBase, attempt]);

  // 2. Load Google Identity Services and render the official button (only if configured).
  //    Waits for 'ready' so the button has a mounted container to render into.
  useEffect(() => {
    if (phase !== 'ready') return;
    if (!config?.google || !config.googleClientId) return;

    const renderButton = () => {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: config.googleClientId,
        callback: handleGoogleCredential,
      });
      googleBtnRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'filled_black',
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
  }, [config, phase]);

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
        setPhase('granted');
        await onLoginSuccess(data.token, data.user, GRANTED_MS);
        return; // unmounted by now
      } else {
        setError(data.error || 'Google sign-in was refused.');
      }
    } catch (e) {
      setStatus('offline');
      setError('Can’t reach the authentication service. Check that the backend is running on port 5000.');
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
        setStatus('online');
        setPhase('granted');
        await onLoginSuccess(data.token, data.user, GRANTED_MS);
        return; // the panel replaces this screen; nothing left to reset
      } else {
        setStatus('online');
        setError(data.error || 'That password doesn’t match. Try again.');
      }
    } catch (e) {
      setStatus('offline');
      setError('Can’t reach the authentication service. Check that the backend is running on port 5000.');
    }
    setLoading(false);
  };

  const trackCaps = (e) => {
    if (typeof e.getModifierState === 'function') setCapsOn(e.getModifierState('CapsLock'));
  };

  // The status line reports what the server actually said, so a dead backend
  // reads as a dead backend instead of a vague failure at submit time.
  const channel = {
    checking: { dot: 'bg-slate-400', text: 'Contacting authentication service…', detail: null },
    online: {
      dot: 'bg-brand-success',
      text: 'Secure channel established',
      detail: config
        ? `${config.password ? 'Password sign-in enabled' : 'Password sign-in disabled'} · ${config.google ? 'Google enabled' : 'Google disabled'}`
        : null,
    },
    offline: {
      dot: 'bg-brand-accent',
      text: 'Authentication service unreachable',
      detail: 'Start the backend on port 5000, then reload.',
    },
  }[status];

  return (
    <>
      <style>{`
        @keyframes gateRise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @keyframes gateFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes gatePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        @keyframes gateSweep { 0% { transform: translateX(-100%); } 100% { transform: translateX(320%); } }
        @keyframes gateTrack { 0% { transform: translateX(-110%); } 100% { transform: translateX(220%); } }
        @keyframes gateMark { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: none; } }
        @keyframes confirmRing { 0% { transform: scale(0.7); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes confirmTick { 0% { transform: scale(0.4); opacity: 0; } 70% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        .gate-track { animation: gateTrack 1.05s cubic-bezier(0.65, 0, 0.35, 1) infinite; }
        .gate-mark { animation: gateMark 420ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        .gate-veil { transition: opacity 440ms ease-out; }
        .confirm-ring { animation: confirmRing 320ms cubic-bezier(0.22, 1, 0.36, 1) 40ms both; }
        .confirm-tick { animation: confirmTick 340ms cubic-bezier(0.22, 1, 0.36, 1) 140ms both; }
        @keyframes gateStepIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        .gate-rise { animation: gateRise 520ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        .gate-fade { animation: gateFade 700ms ease-out 220ms both; }
        .gate-live { animation: gatePulse 2.4s ease-in-out infinite; }
        .gate-sweep { animation: gateSweep 1.15s ease-in-out infinite; }
        .gate-step { animation: gateStepIn 300ms ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .gate-rise, .gate-fade, .gate-live, .gate-sweep, .gate-step,
          .gate-track, .gate-mark, .confirm-ring, .confirm-tick { animation: none; }
          .gate-veil { transition: none; }
        }
      `}</style>

      {/* Signing in — covers the gate so the dashboard doesn't snap into place.
          Stays up until App has the admin data loaded. */}
      {phase === 'granted' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#F4F7FB] p-4" role="status" aria-live="polite">
          <div className="gate-mark flex flex-col items-center px-6 text-center">
            <span className="confirm-ring flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Check size={28} strokeWidth={3} className="confirm-tick" />
            </span>

            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">
              Access granted
            </p>
            <p className="mt-2 text-[13px] font-bold text-brand-navy">Opening your dashboard</p>

            <div className="relative mt-5 h-[2px] w-44 overflow-hidden rounded-full bg-slate-200">
              <div
                className="gate-track absolute inset-y-0 w-1/2 rounded-full"
                style={{ background: 'linear-gradient(to right, transparent, #1a507c, transparent)' }}
                aria-hidden="true"
              />
            </div>

            <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">
              Loading fleet, routes and inquiries
            </p>
          </div>
        </div>
      )}

      {veil !== 'gone' && (
        <div
          className={`gate-veil fixed inset-0 z-50 flex items-center justify-center bg-[#F4F7FB] ${
            veil === 'out' ? 'pointer-events-none opacity-0' : 'opacity-100'
          }`}
          aria-hidden="true"
        >
          <div className="gate-mark flex flex-col items-center px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
              <ShieldCheck size={22} className="text-brand-navy" />
            </div>

            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">
              Secure gateway
            </p>
            <p className="mt-2 text-[13px] font-bold text-brand-navy">Preparing secure sign-in</p>

            <div className="relative mt-5 h-[2px] w-44 overflow-hidden rounded-full bg-slate-200">
              <div
                className="gate-track absolute inset-y-0 w-1/2 rounded-full"
                style={{ background: 'linear-gradient(to right, transparent, #1a507c, transparent)' }}
                aria-hidden="true"
              />
            </div>

            <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">
              Restricted area — authorised access only
            </p>
          </div>
        </div>
      )}

      <div className="relative min-h-screen md:min-h-[calc(100vh/0.9)] bg-[#F4F7FB] flex items-center justify-center px-5 py-14 overflow-hidden">
        {/* One soft wash of brand colour so the ground isn't flat grey. */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[680px] w-[680px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #1a507c 0%, transparent 68%)' }}
          aria-hidden="true"
        />

        <div className="relative w-full max-w-[420px] gate-rise">
          <button
            onClick={onCancel}
            className="group mb-6 flex items-center gap-1.5 rounded text-[11px] font-semibold text-slate-600 transition-colors hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-steel focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F7FB]"
          >
            <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
            Return to site
          </button>

          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_24px_60px_-30px_rgba(16,50,87,0.35)]">
            {/* Brand seal across the top edge. */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
              style={{ background: 'linear-gradient(to right, #103257, #1a507c 50%, #103257)' }}
              aria-hidden="true"
            />

            <div className="p-8 sm:p-9">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                <ShieldCheck size={13} className="text-brand-steel" />
                Operations console
              </div>

              <h1 className="mt-5 text-[22px] font-extrabold leading-tight tracking-tight text-brand-navy">
                Travel With Chaudharys
              </h1>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-500">
                Sign in to manage fleet, routes, bookings and inquiries.
              </p>

              {phase !== 'ready' && (
                <div className="mt-7" role="status" aria-live="polite">
                  <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-[width] duration-500 ease-out"
                      style={{
                        width: `${Math.max(cleared / HANDSHAKE_STEPS.length, failure ? 0.08 : 0) * 100}%`,
                        background: failure ? '#dc2626' : 'linear-gradient(to right, #103257, #1a507c)',
                      }}
                    />
                    {phase === 'handshake' && (
                      <div
                        className="gate-sweep pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/80 to-transparent"
                        aria-hidden="true"
                      />
                    )}
                  </div>

                  <ul className="mt-4 space-y-2">
                    {HANDSHAKE_STEPS.map((label, i) => {
                      const done = i < cleared;
                      const failedHere = failure?.step === i;
                      const active = !done && !failedHere && phase === 'handshake' && i === cleared;
                      return (
                        <li
                          key={label}
                          className="gate-step flex items-center gap-2.5"
                          style={{ animationDelay: `${i * 90}ms` }}
                        >
                          <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                            {failedHere ? (
                              <AlertCircle size={13} className="text-brand-danger" />
                            ) : done ? (
                              <Check size={13} className="text-brand-success" />
                            ) : active ? (
                              <Loader2 size={12} className="animate-spin text-brand-steel" />
                            ) : (
                              <span className="h-1 w-1 rounded-full bg-slate-300" />
                            )}
                          </span>
                          <span
                            className={`font-mono text-[10px] uppercase tracking-[0.14em] ${
                              failedHere
                                ? 'text-red-700'
                                : done
                                ? 'text-slate-700'
                                : active
                                ? 'font-semibold text-brand-navy'
                                : 'text-slate-500'
                            }`}
                          >
                            {label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  {phase === 'failed' && failure && (
                    <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3">
                      <p className="text-[12px] font-medium leading-relaxed text-red-700">{failure.reason}</p>
                      <button
                        type="button"
                        onClick={() => setAttempt((a) => a + 1)}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-brand-navy px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-brand-steel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-steel focus-visible:ring-offset-2"
                      >
                        <RefreshCw size={12} /> Try again
                      </button>
                    </div>
                  )}
                </div>
              )}

              {phase === 'ready' && error && (
                <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-[12px] font-medium leading-relaxed text-red-700">
                  <AlertCircle size={15} className="mt-px shrink-0 text-brand-danger" />
                  <span>{error}</span>
                </div>
              )}

              {phase === 'ready' && config?.google && (
                <div className="mt-6 flex justify-center">
                  <div ref={googleBtnRef} className="min-h-[44px]" />
                </div>
              )}

              {phase === 'ready' && config?.google && config?.password && (
                <div className="mt-6 flex items-center gap-3">
                  <div className="h-px flex-grow bg-slate-200" />
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">or</span>
                  <div className="h-px flex-grow bg-slate-200" />
                </div>
              )}

              {phase === 'ready' && config?.password && (
                <form onSubmit={handlePasswordSubmit} className="mt-6">
                  <label
                    htmlFor="admin-password"
                    className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500"
                  >
                    Admin password
                  </label>
                  <div className="relative">
                    <Lock size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="admin-password"
                      type={revealed ? 'text' : 'password'}
                      required
                      autoFocus
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyUp={trackCaps}
                      onKeyDown={trackCaps}
                      className={`w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pl-10 pr-11 text-[13px] font-medium text-slate-800 transition-colors placeholder:tracking-normal placeholder:text-slate-400 focus:border-brand-steel focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-steel/25 ${
                        revealed ? 'tracking-normal' : 'tracking-[0.18em]'
                      }`}
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setRevealed((v) => !v)}
                      aria-label={revealed ? 'Hide password' : 'Show password'}
                      aria-pressed={revealed}
                      title={revealed ? 'Hide password' : 'Show password'}
                      className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-steel"
                    >
                      {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  {capsOn && (
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-amber-600">
                      Caps lock is on
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="group mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-navy py-3.5 text-[13px] font-bold text-white shadow-sm shadow-brand-navy/20 transition-colors hover:bg-brand-steel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-steel focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {loading ? <Loader2 size={15} className="animate-spin" /> : null}
                    <span>{loading ? 'Verifying…' : 'Sign in'}</span>
                    {!loading && <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />}
                  </button>
                </form>
              )}

            </div>

            {/* Live state of the auth service, not a badge. */}
            {phase === 'ready' && (
            <div className="gate-fade border-t border-slate-200/80 bg-slate-50/70 px-8 py-3.5 sm:px-9">
              <div className="flex items-center gap-2.5">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${channel.dot} ${status === 'online' ? 'gate-live' : ''}`}
                  aria-hidden="true"
                />
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                  {channel.text}
                </span>
              </div>
              {channel.detail && (
                <p className="mt-1 pl-4 font-mono text-[10px] tracking-[0.06em] text-slate-500">{channel.detail}</p>
              )}
            </div>
            )}
          </div>

          <p className="mt-6 text-center font-mono text-[10px] tracking-[0.1em] text-slate-600">
            Sessions end automatically after 8 hours.
          </p>
        </div>
      </div>
    </>
  );
}
