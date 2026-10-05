import React from 'react';
import { ShieldCheck } from 'lucide-react';

/*
  The "Secure gateway" screen shown on arriving at /admin. Same design as the
  entry veil in AdminLogin — it lives here, outside the lazily loaded admin
  code, so it can show immediately while that code downloads and while a saved
  session is being restored, instead of a plain spinner.

  `fading` plays the same 440ms fade-out the sign-in veil uses.
*/
export default function AdminGateway({ fading = false }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes gwTrack { 0% { transform: translateX(-110%); } 100% { transform: translateX(220%); } }
        @keyframes gwMark { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: none; } }
        .gw-track { animation: gwTrack 1.05s cubic-bezier(0.65, 0, 0.35, 1) infinite; }
        .gw-mark { animation: gwMark 420ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        .gw-veil { transition: opacity 440ms ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .gw-track, .gw-mark { animation: none; }
          .gw-veil { transition: none; }
        }
      ` }} />

      <div
        className={`gw-veil fixed inset-0 z-50 flex items-center justify-center bg-[#F4F7FB] ${
          fading ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
        role="status"
        aria-label="Preparing secure sign-in"
      >
        <div className="gw-mark flex flex-col items-center px-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            <ShieldCheck size={22} className="text-brand-navy" />
          </div>

          <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">
            Secure gateway
          </p>
          <p className="mt-2 text-[13px] font-bold text-brand-navy">Preparing secure sign-in</p>

          <div className="relative mt-5 h-[2px] w-44 overflow-hidden rounded-full bg-slate-200">
            <div
              className="gw-track absolute inset-y-0 w-1/2 rounded-full"
              style={{ background: 'linear-gradient(to right, transparent, #1a507c, transparent)' }}
              aria-hidden="true"
            />
          </div>

          <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">
            Restricted area — authorised access only
          </p>
        </div>
      </div>
    </>
  );
}
