import React from 'react';
import { Shield, MapPin, BadgeCheck, Clock, ShieldAlert, HeartHandshake } from 'lucide-react';

export default function ZingFeatures() {
  const features = [
    {
      icon: <MapPin className="text-white" size={18} />,
      title: "Real-time Live GPS Tracking",
      desc: "Share your live bus location with family and track arrival in real-time."
    },
    {
      icon: <Shield className="text-white" size={18} />,
      title: "CCTV Inspected Security",
      desc: "Complete camera monitoring on all public and school fleets for full safety."
    },
    {
      icon: <BadgeCheck className="text-white" size={18} />,
      title: "Verified Professional Staff",
      desc: "All drivers are background-checked and rigorously trained for secure commutes."
    },
    {
      icon: <Clock className="text-white" size={18} />,
      title: "Guaranteed Punctuality",
      desc: "Daily routes run on strict schedules with zero unnecessary delays."
    },
    {
      icon: <ShieldAlert className="text-white" size={18} />,
      title: "Premium Volvo Sanitization",
      desc: "Deep cleaning and disinfecting of every cabin after each completed run."
    },
    {
      icon: <HeartHandshake className="text-white" size={18} />,
      title: "24/7 Helpline & Support",
      desc: "Call our emergency helpline anytime for seats, luggage, or pickup changes."
    }
  ];

  return (
    <section
      id="features"
      className="relative pt-8 pb-16 overflow-hidden bg-brand-navy bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "linear-gradient(rgba(16,50,87,0.80), rgba(13,27,42,0.90)), url('/p1.png')" }}
    >
      {/* Top fade — continues from the hero's navy so the two photos blend seamlessly */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-brand-navy to-transparent" aria-hidden="true"></div>
      {/* Bottom fade — small, subtle ease into the next (light) section */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-50 to-transparent"></div>

      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Title Block */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <span className="inline-flex items-center gap-3 text-[11px] font-bold tracking-[0.25em] uppercase text-sky-200">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-sky-200/60"></span>
            Why Travel With Us
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-sky-200/60"></span>
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-[1.05]">
            The Travel With Chaudharys Standard
          </h2>
          <p className="mt-3 text-base text-slate-200/90 font-medium">
            Redefining passenger travel and school transport across Pinjor, Baddi &amp; beyond.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feat, idx) => (
            <div
              key={idx}
              className="group relative bg-white p-5 rounded-2xl border border-slate-200/70 shadow-[0_1px_2px_rgba(16,50,87,0.04)] hover:shadow-[0_20px_40px_-20px_rgba(16,50,87,0.25)] hover:border-brand-steel/30 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              {/* Gradient accent line on top (reveals on hover) */}
              <span className="absolute inset-x-0 top-0 h-1 bg-brand-gradient scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500"></span>

              {/* Faint index watermark */}
              <span className="absolute top-3 right-4 text-4xl font-black text-slate-100 group-hover:text-brand-steel/10 transition-colors select-none leading-none">
                {String(idx + 1).padStart(2, '0')}
              </span>

              <div className="flex items-center gap-3.5 mb-2.5">
                {/* Icon tile */}
                <div className="relative w-11 h-11 rounded-xl bg-brand-gradient flex items-center justify-center shadow-md shadow-brand-navy/20 ring-4 ring-brand-steel/5 shrink-0 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                  {feat.icon}
                </div>
                <h3 className="relative text-[15px] font-bold text-brand-navy leading-tight">
                  {feat.title}
                </h3>
              </div>
              <p className="relative text-slate-500 text-[13px] leading-snug">
                {feat.desc}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
