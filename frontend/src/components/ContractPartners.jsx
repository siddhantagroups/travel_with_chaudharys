import React from 'react';
import { GraduationCap, Building2, ArrowRight } from 'lucide-react';

export default function ContractPartners() {
  const partners = [
    {
      name: "Baddi International School",
      type: "Educational Transport",
      desc: "Daily transport for students and teachers with a dedicated fleet of 5 school buses.",
      icon: <GraduationCap className="text-white" size={22} />
    },
    {
      name: "Eicher Parwanoo",
      type: "Corporate Staff Shuttle",
      desc: "Multi-shift employee commutes between Pinjor, Parwanoo, and the Baddi industrial area.",
      icon: <Building2 className="text-white" size={22} />
    },
    {
      name: "Eicher School",
      type: "Educational Transport",
      desc: "Secure student transport on customized routes with GPS-tracked safety buses.",
      icon: <GraduationCap className="text-white" size={22} />
    },
    {
      name: "DAV Public School Pinjor",
      type: "Educational Transport",
      desc: "4 active buses serving DAV sectors, giving parents real-time peace of mind.",
      icon: <GraduationCap className="text-white" size={22} />
    }
  ];

  const stats = [
    { value: "50+", label: "Active Routes Daily" },
    { value: "5,000+", label: "Commuters Daily" },
    { value: "30+", label: "Contract Vehicles" },
    { value: "100%", label: "On-Time Compliance" }
  ];

  const handleInquireNow = () => {
    const el = document.getElementById('booking');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="contracts" className="py-10 sm:py-14 bg-slate-50 border-y border-slate-200/70">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">

        {/* Header Block */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-6 sm:mb-8 gap-4 sm:gap-5">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-3 text-[10px] sm:text-[11px] font-bold tracking-[0.25em] uppercase text-brand-steel">
              <span className="h-px w-6 sm:w-8 bg-gradient-to-r from-transparent to-brand-steel/60"></span>
              Institutional Partnerships
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-brand-navy tracking-tight mt-3 sm:mt-4 leading-[1.1]">
              Trusted by Top Schools &amp; Corporations
            </h2>
            <p className="mt-2 sm:mt-3 text-sm sm:text-base text-slate-500 font-medium">
              We manage transport for thousands of school children and industrial employees every day.
            </p>
          </div>
          <div className="shrink-0">
            <button
              onClick={handleInquireNow}
              className="group flex items-center gap-2 sm:gap-2.5 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-brand-navy hover:bg-brand-steel text-white font-bold text-xs sm:text-sm transition-all duration-300 shadow-lg shadow-brand-navy/20 hover:shadow-xl hover:shadow-brand-steel/25 hover:-translate-y-0.5"
            >
              <span>Request Fleet Contract</span>
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Partners Grid — single row on desktop to stay compact */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {partners.map((partner, idx) => (
            <div
              key={idx}
              className="group relative p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/70 bg-white hover:border-brand-steel/30 shadow-[0_1px_2px_rgba(16,50,87,0.04)] hover:shadow-[0_18px_40px_-22px_rgba(16,50,87,0.28)] hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              <span className="absolute inset-x-0 top-0 h-1 bg-brand-gradient scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500"></span>
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-brand-gradient flex items-center justify-center shadow-md shadow-brand-navy/20 ring-4 ring-brand-steel/5 mb-2.5 sm:mb-3.5 group-hover:scale-105 transition-transform [&>svg]:w-4 [&>svg]:h-4 sm:[&>svg]:w-[22px] sm:[&>svg]:h-[22px]">
                {partner.icon}
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold text-brand-steel uppercase tracking-[0.14em]">{partner.type}</span>
              <h3 className="text-sm sm:text-base font-bold text-brand-navy mt-0.5 sm:mt-1 mb-1 sm:mb-1.5 leading-snug">{partner.name}</h3>
              <p className="text-slate-500 text-[11px] sm:text-[13px] leading-snug">{partner.desc}</p>
            </div>
          ))}
        </div>

        {/* Statistics Banner */}
        <div className="bg-brand-gradient rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-white relative overflow-hidden shadow-2xl shadow-brand-navy/25">
          {/* Grid texture + glow */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:28px_28px]"></div>
          <div className="pointer-events-none absolute -top-20 right-0 w-48 sm:w-72 h-48 sm:h-72 rounded-full bg-white/10 blur-3xl"></div>
          <div className="pointer-events-none absolute -bottom-24 left-0 w-40 sm:w-64 h-40 sm:h-64 rounded-full bg-brand-accent/10 blur-3xl"></div>

          <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-y-4 sm:gap-y-6 gap-x-4 sm:gap-x-6 text-center">
            {stats.map((stat, idx) => (
              <div key={idx} className="px-1 sm:px-2">
                <span className="block text-2xl sm:text-4xl font-extrabold tracking-tight leading-none bg-gradient-to-b from-white to-brand-silver bg-clip-text text-transparent">
                  {stat.value}
                </span>
                <span className="block text-[9px] sm:text-xs font-semibold text-brand-silver/90 tracking-[0.1em] uppercase mt-1.5 sm:mt-2">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
