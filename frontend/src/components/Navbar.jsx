import React, { useState, useEffect } from 'react';
import { User, Bus, Building2, ArrowRight } from 'lucide-react';

export default function Navbar({ currentView, setCurrentView, activeService, setActiveService }) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleScroll = (id) => {
    setCurrentView('public');
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div 
      className={`left-0 w-full z-50 transition-all duration-300 ${
        isScrolled 
          ? 'fixed top-0 bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200/80 py-1' 
          : 'absolute top-0 bg-white/15 backdrop-blur-md border-b border-white/10 py-2'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center text-slate-800">
        
        {/* Logo & Brand Name */}
        <div 
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => {
            setCurrentView('public');
            setActiveService('buses');
          }}
        >
          <div className="relative overflow-hidden h-12 w-12 flex items-center justify-center bg-transparent shrink-0">
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
            <h1 className="text-sm sm:text-base font-black tracking-tight leading-none text-brand-navy">
              travel with <span className={`text-base sm:text-lg font-extrabold italic transition-colors duration-300 ${isScrolled ? 'text-brand-steel' : 'text-white'}`}>Chaudhary</span>
            </h1>
            <span className={`text-[8px] font-extrabold tracking-wider uppercase block mt-[-2px] leading-none transition-colors duration-300 ${isScrolled ? 'text-slate-500' : 'text-white/60'}`}>
              Chaudhary Transport
            </span>
          </div>
        </div>

        {/* Right Header Navigation */}
        <div className="flex items-center gap-3 sm:gap-4">

          {/* Secondary: Book a Bus (individual ticket booking) */}
          <button
            onClick={() => {
              setCurrentView('public');
              setActiveService('buses');
              setTimeout(() => {
                const card = document.getElementById('booking-card') || document.getElementById('booking');
                if (card) {
                  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  card.classList.remove('highlight-pulse');
                  void card.offsetWidth; // restart the animation if already applied
                  card.classList.add('highlight-pulse');
                  setTimeout(() => card.classList.remove('highlight-pulse'), 3000);
                }
              }, 80);
            }}
            className={`hidden sm:flex items-center gap-2 text-[12px] font-bold transition-colors ${
              isScrolled ? 'text-slate-700 hover:text-brand-steel' : 'text-white/90 hover:text-white'
            }`}
          >
            <Bus size={16} className={isScrolled ? 'text-brand-steel' : 'text-white'} />
            <span>Book a Bus</span>
          </button>

          {/* Divider */}
          <span className={`hidden sm:block h-6 w-px ${isScrolled ? 'bg-slate-200' : 'bg-white/25'}`}></span>

          {/* Primary CTA — Fleet Contracts (the company's core business) */}
          {currentView === 'admin' ? (
            <button
              onClick={() => {
                setCurrentView('public');
                setActiveService('buses');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-[12px] transition-all hover:-translate-y-0.5 ${
                isScrolled
                  ? 'bg-brand-gradient text-white shadow-md shadow-brand-navy/25 hover:shadow-lg'
                  : 'bg-white text-brand-navy shadow-md shadow-black/10 hover:shadow-lg'
              }`}
            >
              <User size={14} />
              <span>Go to Website</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setCurrentView('public');
                setActiveService('contracts');
                setTimeout(() => {
                  // Open + center the contract inquiry form and draw attention to it
                  const card = document.getElementById('booking-card') || document.getElementById('booking');
                  if (card) {
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    card.classList.remove('highlight-pulse');
                    void card.offsetWidth; // restart the animation if already applied
                    card.classList.add('highlight-pulse');
                    setTimeout(() => card.classList.remove('highlight-pulse'), 3000);
                  }
                }, 80);
              }}
              className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full font-bold text-[12px] tracking-wide transition-all hover:-translate-y-0.5 ${
                isScrolled
                  ? 'bg-brand-gradient text-white shadow-lg shadow-brand-navy/25 hover:shadow-xl'
                  : 'bg-white text-brand-navy shadow-lg shadow-black/15 hover:shadow-xl'
              }`}
            >
              <Building2 size={14} />
              <span>Get a Fleet Quote</span>
              <ArrowRight size={14} />
            </button>
          )}

        </div>

      </div>
    </div>
  );
}
