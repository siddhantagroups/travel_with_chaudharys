import React from 'react';
import { Shield, MapPin, BadgeCheck, Clock, ShieldAlert, HeartHandshake } from 'lucide-react';

export default function ZingFeatures() {
  const features = [
    {
      icon: <MapPin className="text-white" size={18} />,
      title: "Live GPS Tracking",
      shortTitle: "GPS Tracking",
      desc: "Share your live bus location with family and track arrival in real-time."
    },
    {
      icon: <Shield className="text-white" size={18} />,
      title: "CCTV Inspected Security",
      shortTitle: "CCTV Security",
      desc: "Complete camera monitoring on all public and school fleets for full safety."
    },
    {
      icon: <BadgeCheck className="text-white" size={18} />,
      title: "Verified Professional Staff",
      shortTitle: "Verified Staff",
      desc: "All drivers are background-checked and rigorously trained for secure commutes."
    },
    {
      icon: <Clock className="text-white" size={18} />,
      title: "Guaranteed Punctuality",
      shortTitle: "Punctuality",
      desc: "Daily routes run on strict schedules with zero unnecessary delays."
    },
    {
      icon: <ShieldAlert className="text-white" size={18} />,
      title: "Premium Sanitization",
      shortTitle: "Sanitization",
      desc: "Deep cleaning and disinfecting of every cabin after each completed run."
    },
    {
      icon: <HeartHandshake className="text-white" size={18} />,
      title: "24/7 Helpline & Support",
      shortTitle: "24/7 Support",
      desc: "Call our emergency helpline anytime for seats, luggage, or pickup changes."
    }
  ];

  return (
    <>
    <style>{`
      /* Mobile: this section is pulled up over the hero so its background
         image fades in on top of the video, giving the same soft video ->
         image blend the laptop view gets from its bottom fade.
         The hero video is shifted up 20%, so it ends at 80% of the hero and
         the static poster shows through below it — a hard seam. The overlap
         (240px) starts the fade over the video and the gradient reaches full
         opacity by 62px — well before the video's bottom edge — so the seam is
         covered and the heading below it sits on a solid background. */
      .features-bg {
        -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 62px);
        mask-image: linear-gradient(to bottom, transparent 0, #000 62px);
      }
      @media (min-width: 640px) {
        .features-bg { -webkit-mask-image: none; mask-image: none; }
      }
    `}</style>
    <section
      id="features"
      className="relative -mt-[240px] sm:mt-0 pt-[130px] sm:pt-8 pb-16 overflow-hidden"
    >
      {/* Background layer — masked so it eases in over the hero on mobile */}
      <div
        className="features-bg pointer-events-none absolute inset-0 bg-brand-navy bg-cover bg-center bg-fixed"
        style={{ backgroundImage: "linear-gradient(rgba(16,50,87,0.80), rgba(13,27,42,0.90)), url('/p1.jpg')" }}
        aria-hidden="true"
      ></div>

      {/* Desktop keeps the original navy top fade */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-brand-navy to-transparent hidden sm:block" aria-hidden="true"></div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-50 to-transparent"></div>

      <div className="relative w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">

        {/* Title Block */}
        <div className="text-center max-w-2xl sm:max-w-5xl mx-auto mb-5 sm:mb-16">
          <span className="inline-flex items-center gap-3 text-[10px] sm:text-[11px] font-bold tracking-[0.25em] uppercase text-sky-200">
            <span className="h-px w-6 sm:w-8 bg-gradient-to-r from-transparent to-sky-200/60"></span>
            Why Travel With Us
            <span className="h-px w-6 sm:w-8 bg-gradient-to-l from-transparent to-sky-200/60"></span>
          </span>
          <h2 className="mt-3 sm:mt-4 text-xl min-[420px]:text-2xl sm:text-4xl lg:text-[42px] font-extrabold text-white tracking-tight leading-[1.1]">
            The Travel With Chaudharys Standard
          </h2>
          <p className="mt-2 sm:mt-3 text-xs sm:text-base text-slate-200/90 font-medium">
            Redefining passenger travel and school transport across Pinjor, Baddi &amp; beyond.
          </p>
        </div>

        {/* Mobile: compact 2-col grid with icon + short title, no description */}
        <div className="grid grid-cols-2 gap-2.5 sm:hidden">
          {features.map((feat, idx) => (
            <div
              key={idx}
              className="group relative bg-white/[0.07] backdrop-blur-sm p-3 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300 overflow-hidden"
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center shadow-md shadow-brand-navy/30 shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5">
                  {feat.icon}
                </div>
                <span className="absolute top-2 right-2.5 text-2xl font-black text-white/[0.06] leading-none select-none">
                  {String(idx + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="text-[11px] font-bold text-white/90 leading-tight mt-1">
                {feat.shortTitle}
              </h3>
              <p className="text-[9px] text-white/50 leading-snug mt-0.5 line-clamp-2">
                {feat.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Desktop/Tablet: full cards with descriptions */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feat, idx) => (
            <div
              key={idx}
              className="group relative bg-white p-5 rounded-2xl border border-slate-200/70 shadow-[0_1px_2px_rgba(16,50,87,0.04)] hover:shadow-[0_20px_40px_-20px_rgba(16,50,87,0.25)] hover:border-brand-steel/30 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              <span className="absolute inset-x-0 top-0 h-1 bg-brand-gradient scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500"></span>
              <span className="absolute top-3 right-4 text-4xl font-black text-slate-100 group-hover:text-brand-steel/10 transition-colors select-none leading-none">
                {String(idx + 1).padStart(2, '0')}
              </span>

              <div className="flex items-center gap-3.5 mb-2.5">
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
    </>
  );
}
