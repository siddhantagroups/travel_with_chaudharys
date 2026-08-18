import React, { useState, useEffect } from 'react';
import { User, Bus, Building2, ArrowRight, Users } from 'lucide-react';

// Pull the About hero video into cache the moment someone shows intent (hover,
// focus or touch on the About link) rather than when the page mounts. By the
// time the view switches the file is usually already there, so the hero plays
// immediately instead of streaming in. Fires once per page load.
let aboutHeroWarmed = false;
function warmAboutHero() {
  if (aboutHeroWarmed) return;
  aboutHeroWarmed = true;
  try {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'video';
    link.href = '/about-hero.mp4';
    document.head.appendChild(link);
  } catch (e) { /* non-critical */ }
}

export default function Navbar({ currentView, setCurrentView, activeService, setActiveService }) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    setCurrentView('public');
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const highlightBookingCard = () => {
    const cards = document.querySelectorAll('[data-booking-card]');
    const card = Array.from(cards).find(c => c.offsetHeight > 0) || document.getElementById('booking');
    if (card) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      card.classList.remove('highlight-pulse');
      void card.offsetWidth;
      card.classList.add('highlight-pulse');
      setTimeout(() => card.classList.remove('highlight-pulse'), 3000);
    }
  };

  // The home hero is dark video, so the un-scrolled bar sits in white text over
  // it. The About hero is a bright sky, where white would vanish — so that view
  // gets the dark treatment from the start.
  const onLightHero = currentView === 'about';
  const darkText = isScrolled || onLightHero;

  return (
    <div
      className={`left-0 w-full z-50 transition-all duration-300 ${
        isScrolled
          ? 'fixed top-0 bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200/80 py-1'
          : onLightHero
            ? 'absolute top-0 bg-white/55 backdrop-blur-md border-b border-slate-200/50 py-1.5 sm:py-2'
            : 'absolute top-0 bg-white/15 backdrop-blur-md border-b border-white/10 py-1.5 sm:py-2'
      }`}
    >
      {/* gap guarantees clearance between the brand block and the nav buttons —
          justify-between alone lets them meet flush on narrow phones */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex justify-between items-center gap-3 sm:gap-4 text-slate-800">

        {/* Logo & Brand Name */}
        <div
          className="flex items-center gap-1.5 sm:gap-2 cursor-pointer group shrink-0"
          onClick={() => {
            setCurrentView('public');
            setActiveService('contracts');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <div className="relative overflow-hidden h-8 w-8 min-[400px]:h-9 min-[400px]:w-9 sm:h-12 sm:w-12 flex items-center justify-center bg-transparent shrink-0">
            <img
              src="/logoo.png"
              alt="Travel With Chaudharys"
              className="h-full w-full object-contain transform translate-y-[2px]"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentNode.innerHTML = '<span class="text-brand-navy font-bold text-base">TWC</span>';
              }}
            />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-[11px] sm:text-base font-black tracking-tight leading-none text-brand-navy">
              travel with <span className={`text-xs sm:text-lg font-extrabold italic transition-colors duration-300 ${darkText ? 'text-brand-steel' : 'text-white'}`}>Chaudhary</span>
            </h1>
            <span className={`text-[7px] sm:text-[8px] font-extrabold tracking-wider uppercase block mt-[-2px] leading-none transition-colors duration-300 ${darkText ? 'text-slate-500' : 'text-white/60'}`}>
              Chaudhary Transport
            </span>
          </div>
        </div>

        {/* Right Header Navigation — one uniform gap across every item. A
            divider used to sit before the CTA, which made that gap read as
            twice the others even though the flex spacing was equal. */}
        <div className="flex items-center gap-3 sm:gap-5">

          {/* Secondary: About (hidden on small mobile) */}
          <button
            onMouseEnter={warmAboutHero}
            onFocus={warmAboutHero}
            onTouchStart={warmAboutHero}
            onClick={() => setCurrentView('about')}
            aria-label="About Us"
            title="About Us"
            className={`flex items-center gap-1.5 sm:gap-2 shrink-0 text-[11px] sm:text-[12px] font-bold transition-colors ${
              currentView === 'about'
                ? (darkText ? 'text-brand-steel' : 'text-white')
                : (darkText ? 'text-slate-700 hover:text-brand-steel' : 'text-white/90 hover:text-white')
            }`}
          >
            <Users size={15} className={`shrink-0 ${darkText ? 'text-brand-steel' : 'text-white'}`} />
            {/* The label sheds width in two steps as space runs out: "About Us"
                on tablet and up, "About" on larger phones, icon-only below 360px
                where the brand block and the Fleet Quote pill leave nothing spare. */}
            <span className="hidden min-[360px]:inline sm:hidden">About</span>
            <span className="hidden sm:inline">About Us</span>
          </button>

          {/* Secondary: Book a Bus (hidden on small mobile) */}
          <button
            onClick={() => {
              setCurrentView('public');
              setActiveService('buses');
              setTimeout(highlightBookingCard, 80);
            }}
            className={`hidden sm:flex items-center gap-2 text-[12px] font-bold transition-colors ${
              darkText ? 'text-slate-700 hover:text-brand-steel' : 'text-white/90 hover:text-white'
            }`}
          >
            <Bus size={16} className={darkText ? 'text-brand-steel' : 'text-white'} />
            <span>Book a Bus</span>
          </button>

          {/* Separator before the CTA. It carries negative side margins so it
              pulls back part of the flex gap it sits inside — otherwise the row
              gap lands on both of its sides and the space before the CTA reads
              as roughly double every other gap. */}
          <span
            className={`hidden sm:block h-6 w-px -mx-2 ${darkText ? 'bg-slate-200' : 'bg-white/25'}`}
            aria-hidden="true"
          ></span>

          {/* Primary CTA — Fleet Contracts */}
          {currentView === 'admin' ? (
            <button
              onClick={() => {
                setCurrentView('public');
                setActiveService('contracts');
              }}
              className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2 rounded-full font-bold text-[11px] sm:text-[12px] transition-all hover:-translate-y-0.5 ${
                isScrolled
                  ? 'bg-brand-gradient text-white shadow-md shadow-brand-navy/25 hover:shadow-lg'
                  : 'bg-white text-brand-navy shadow-md shadow-black/10 hover:shadow-lg'
              }`}
            >
              <User size={13} />
              <span>Go to Website</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setCurrentView('public');
                setActiveService('contracts');
                setTimeout(highlightBookingCard, 80);
              }}
              className={`flex items-center shrink-0 gap-1 sm:gap-1.5 px-2.5 min-[400px]:px-3 sm:px-5 py-2 sm:py-2.5 rounded-full font-bold text-[10.5px] min-[400px]:text-[11px] sm:text-[12px] tracking-wide transition-all hover:-translate-y-0.5 ${
                darkText
                  ? 'bg-brand-gradient text-white shadow-lg shadow-brand-navy/25 hover:shadow-xl'
                  : 'bg-white text-brand-navy shadow-lg shadow-black/15 hover:shadow-xl'
              }`}
            >
              <Building2 size={13} className="shrink-0" />
              {/* Below 400px the CTA drops the "Fleet" and reads "Contract",
                  which still buys back enough width to keep the brand block clear
                  of the buttons on the narrowest phones. */}
              <span className="whitespace-nowrap hidden min-[400px]:inline">Fleet Quote</span>
              <span className="whitespace-nowrap min-[400px]:hidden">Contract</span>
              <ArrowRight size={13} className="shrink-0 hidden sm:block" />
            </button>
          )}

        </div>

      </div>
    </div>
  );
}
