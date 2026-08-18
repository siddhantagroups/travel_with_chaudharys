import React from 'react';
import { Mail, Phone, MapPin, Bus, Shield, Heart } from 'lucide-react';

export default function Footer({ setCurrentView }) {
  const handleScroll = (id) => {
    setCurrentView('public');
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <footer className="bg-brand-navy text-slate-300 border-t-4 border-brand-steel">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-12">

          {/* About TWC */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <div className="p-1.5 sm:p-2 bg-brand-steel rounded-lg text-white">
                <Bus size={18} />
              </div>
              <span className="text-lg sm:text-xl font-bold text-white tracking-tight">TWC Travels</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4 sm:mb-6">
              Travel With Chaudharys (TWC) is Pinjor's most trusted and popular passenger transport and corporate fleet manager. We operate daily routes and manage employee/student commutes for top institutions.
            </p>
            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-500">
              <Shield size={13} className="text-brand-steel" />
              <span>100% Licensed & ISO Certified</span>
            </div>
          </div>

          {/* Contact Details */}
          <div className="col-span-2 md:col-span-1">
            <h4 className="text-white font-bold mb-3 sm:mb-4 tracking-wide uppercase text-xs sm:text-sm border-b border-slate-800 pb-2">
              Our Headquarters
            </h4>
            <ul className="space-y-3 sm:space-y-4 text-xs sm:text-sm">
              <li className="flex items-start gap-2 sm:gap-3">
                <MapPin className="text-brand-steel shrink-0 mt-0.5" size={16} />
                <span>35 36 sd market, opp. to Housing Board Colony, Kalka, Haryana 133302, India</span>
              </li>
              <li className="flex items-center gap-2 sm:gap-3">
                <Mail className="text-brand-steel shrink-0" size={16} />
                <span className="break-all">bookings@travelwithchaudhary.com</span>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold mb-3 sm:mb-4 tracking-wide uppercase text-xs sm:text-sm border-b border-slate-800 pb-2">
              Quick Navigation
            </h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              <li>
                <button onClick={() => handleScroll('booking')} className="hover:text-white transition-colors">
                  Bus Ticket Booking
                </button>
              </li>
              <li>
                <button onClick={() => handleScroll('features')} className="hover:text-white transition-colors">
                  Features & Quality
                </button>
              </li>
              <li>
                <button onClick={() => handleScroll('contracts')} className="hover:text-white transition-colors">
                  School & Corporate Fleet
                </button>
              </li>
              <li>
                <button onClick={() => handleScroll('fleet')} className="hover:text-white transition-colors">
                  Our Buses and SUV Fleet
                </button>
              </li>
            </ul>
          </div>

          {/* Corporate Clients */}
          <div>
            <h4 className="text-white font-bold mb-3 sm:mb-4 tracking-wide uppercase text-xs sm:text-sm border-b border-slate-800 pb-2">
              Proud Partners
            </h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-slate-400">
              <li>• Baddi International School</li>
              <li>• Eicher Parwanoo</li>
              <li>• Eicher School</li>
              <li>• DAV Public School Pinjor</li>
            </ul>
          </div>

        </div>

        {/* Leadership & Contacts Row — the role and the name open the About page
            (its own scroll-to-top is handled by setView); the phone stays a plain
            tel: link so tapping it still dials instead of navigating. */}
        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-5 sm:gap-8">
          {[
            { role: 'Managing Director', name: 'Dalbir Singh', phone: '+91 70822 52200', href: 'tel:+917082252200' },
            { role: 'Co-Founder', name: 'Aditya Singh', phone: '+91 87080 60565', href: 'tel:+918708060565' },
            { role: 'Management / Partner', name: 'Prajwal Singh', phone: '+91 70150 96142', href: 'tel:+917015096142' },
          ].map((person) => (
            <div key={person.name}>
              <button
                type="button"
                onClick={() => setCurrentView('about')}
                aria-label={`${person.name}, ${person.role} — read more on the About page`}
                className="group block text-left"
              >
                <h4 className="font-bold mb-2 sm:mb-3 tracking-wide uppercase text-[10px] sm:text-xs text-brand-silver group-hover:text-white transition-colors">
                  {person.role}
                </h4>
                <p className="text-white font-semibold text-sm sm:text-base group-hover:text-brand-silver transition-colors">
                  <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-no-repeat bg-left-bottom group-hover:bg-[length:100%_1px] transition-[background-size] duration-300">
                    {person.name}
                  </span>
                </p>
              </button>
              <a
                href={person.href}
                className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white mt-1 transition-colors font-medium text-xs sm:text-sm"
              >
                <Phone size={12} className="text-brand-steel shrink-0" />
                <span>{person.phone}</span>
              </a>
            </div>
          ))}
        </div>

        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center text-[10px] sm:text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Travel With Chaudharys (TWC). All rights reserved.</p>
          <p className="flex items-center gap-1 mt-3 md:mt-0">
            Made with <Heart size={11} className="text-red-500 fill-red-500" /> for Pinjor and Baddi Commuters
          </p>
        </div>
      </div>
    </footer>
  );
}
