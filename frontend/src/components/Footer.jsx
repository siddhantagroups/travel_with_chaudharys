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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          
          {/* About TWC */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-brand-steel rounded-lg text-white">
                <Bus size={20} />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">TWC Travels</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Travel With Chaudharys (TWC) is Pinjor's most trusted and popular passenger transport and corporate fleet manager. We operate daily routes and manage employee/student commutes for top institutions.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Shield size={14} className="text-brand-steel" />
              <span>100% Licensed & ISO Certified</span>
            </div>
          </div>

          {/* Contact Details */}
          <div>
            <h4 className="text-white font-bold mb-4 tracking-wide uppercase text-sm border-b border-slate-800 pb-2">
              Our Headquarters
            </h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="text-brand-steel shrink-0 mt-0.5" size={18} />
                <span>35 36 sd market, opp. to Housing Board Colony,<br />Housing Board Colony, Kalka, Haryana 133302, India</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="text-brand-steel shrink-0" size={18} />
                <span>bookings@travelwithchaudhary.com</span>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold mb-4 tracking-wide uppercase text-sm border-b border-slate-800 pb-2">
              Quick Navigation
            </h4>
            <ul className="space-y-2 text-sm">
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
            <h4 className="text-white font-bold mb-4 tracking-wide uppercase text-sm border-b border-slate-800 pb-2">
              Proud Partners
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>• Baddi International School</li>
              <li>• Eicher Parwanoo</li>
              <li>• Eicher School</li>
              <li>• DAV Public School Pinjor</li>
            </ul>
          </div>

        </div>

        {/* Leadership & Contacts Row */}
        <div className="mt-12 pt-8 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Managing Director on Left */}
          <div>
            <h4 className="text-white font-bold mb-3 tracking-wide uppercase text-xs text-brand-silver">
              Managing Director
            </h4>
            <div>
              <p className="text-white font-semibold text-base">Dalbir Singh</p>
              <a href="tel:+917082252200" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mt-1.5 transition-colors font-medium text-sm">
                <Phone size={14} className="text-brand-steel" />
                <span>+91 70822 52200</span>
              </a>
            </div>
          </div>

          {/* Co-founder & Management on Right */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h4 className="text-white font-bold mb-3 tracking-wide uppercase text-xs text-brand-silver">
                Co-Founder
              </h4>
              <p className="text-white font-semibold text-base">Aditya Singh</p>
              <a href="tel:+918708060565" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mt-1.5 transition-colors font-medium text-sm">
                <Phone size={14} className="text-brand-steel" />
                <span>+91 87080 60565</span>
              </a>
            </div>
            <div>
              <h4 className="text-white font-bold mb-3 tracking-wide uppercase text-xs text-brand-silver">
                Management / Partner
              </h4>
              <p className="text-white font-semibold text-base">Prajwal Singh</p>
              <a href="tel:+917015096142" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mt-1.5 transition-colors font-medium text-sm">
                <Phone size={14} className="text-brand-steel" />
                <span>+91 70150 96142</span>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Travel With Chaudharys (TWC). All rights reserved.</p>
          <p className="flex items-center gap-1 mt-4 md:mt-0">
            Made with <Heart size={12} className="text-red-500 fill-red-500" /> for Pinjor and Baddi Commuters
          </p>
        </div>
      </div>
    </footer>
  );
}
