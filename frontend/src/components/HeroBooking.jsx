import React, { useState, useRef, useEffect } from 'react';
import { Bus, Calendar, MapPin, Users, Phone, ShieldCheck, Clock, Landmark, ChevronDown, Plane, Hotel, Train, Car } from 'lucide-react';

const VanIcon = ({ size = 18, className }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <path d="M2 14V6a2 2 0 0 1 2-2h11l5 4v6a2 2 0 0 1-2 2h-1" />
    <circle cx="7" cy="16" r="2" />
    <circle cx="16" cy="16" r="2" />
    <path d="M2 14h3" />
    <path d="M9 14h5" />
    <path d="M18 14h3" />
    <path d="M4 6h4v3H4z" />
    <path d="M10 6h4v3h-4z" />
    <path d="M16 7.5l2.5 1.5v2h-2.5z" />
  </svg>
);

// Tracks whether the intro video has already played during THIS page visit.
// Module scope means it survives component remounts (e.g. switching admin ↔ home)
// but resets on a real page refresh — giving us clean "play once per visit".
let heroVideoPlayedThisVisit = false;

export default function HeroBooking({ routes, onSearch, onContractSubmit, activeService, setActiveService }) {
  const [bookingType, setBookingType] = useState('oneway');
  
  // Booking Form State
  const [from, setFrom] = useState('Pinjor');
  const [to, setTo] = useState('Delhi');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [seats, setSeats] = useState(1);
  const dateInputRef = useRef(null);

  // Reliably open the native date picker (invisible date inputs don't open on click in some browsers)
  const openDatePicker = () => {
    const el = dateInputRef.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') {
      try { el.showPicker(); return; } catch (e) { /* fall through to focus */ }
    }
    el.focus();
  };

  // Contract Form State
  const [contractOrg, setContractOrg] = useState('');
  const [contractPerson, setContractPerson] = useState('');
  const [contractEmail, setContractEmail] = useState('');
  const [contractPhone, setContractPhone] = useState('');
  const [contractFleetSize, setContractFleetSize] = useState(1);
  const [contractVehicleType, setContractVehicleType] = useState('School Bus');
  const [contractRoute, setContractRoute] = useState('');
  const [contractNotes, setContractNotes] = useState('');
  
  const [contractSubmitted, setContractSubmitted] = useState(false);

  // --- HERO INTRO VIDEO ---
  // Plays once per visit: every fresh page load / refresh plays the clip a single
  // time (no loop), then freezes on its final frame. It won't restart when you
  // toggle between the admin panel and the home view within the same visit.
  const videoRef = useRef(null);
  const [playHeroVideo, setPlayHeroVideo] = useState(false); // mount the video layer

  useEffect(() => {
    if (!heroVideoPlayedThisVisit) setPlayHeroVideo(true);
  }, []);

  // Mark as played the moment it starts, so a remount mid-visit doesn't restart it.
  const handleHeroVideoPlaying = () => { heroVideoPlayedThisVisit = true; };

  // When it ends, do nothing — the <video> element naturally holds its last frame.
  const handleHeroVideoEnded = () => { heroVideoPlayedThisVisit = true; };

  // Only if it fails to load, reveal the static hero image instead of a blank layer.
  const handleHeroVideoError = () => {
    heroVideoPlayedThisVisit = true;
    setPlayHeroVideo(false);
  };

  // Services list matching MMT styling
  const services = [
    { id: 'buses', label: 'Buses', icon: <Bus size={18} />, enabled: true },
    { id: 'cabs', label: 'Cabs', icon: <Car size={18} />, enabled: true },
    { id: 'traveler', label: 'Traveler', icon: <VanIcon size={18} />, enabled: true },
    { id: 'contracts', label: 'Fleet Contracts', icon: <ShieldCheck size={18} />, enabled: true }
  ];

  const handleServiceClick = (service) => {
    if (!service.enabled) {
      alert(`${service.label} bookings via Travel With Chaudharys partnerships are coming soon! Try 'Buses', 'Cabs', or 'Fleet Contracts'.`);
      return;
    }
    setActiveService(service.id);
  };

  // Derive unique from/to options from routes
  const fromOptions = Array.from(new Set(routes.map(r => r.departure)));
  const toOptions = Array.from(new Set(routes.filter(r => r.departure === from).map(r => r.destination)));

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    onSearch({ from, to, date, seats, bookingType });
  };

  const handleContractSubmit = async (e) => {
    e.preventDefault();
    if (!contractOrg || !contractPerson || !contractEmail || !contractPhone || !contractRoute) {
      alert('Please fill in all required fields.');
      return;
    }
    const success = await onContractSubmit({
      orgName: contractOrg,
      contactPerson,
      email: contractEmail,
      phone: contractPhone,
      requiredFleetSize: parseInt(contractFleetSize),
      vehicleType: contractVehicleType,
      routeDescription: contractRoute,
      notes: contractNotes
    });
    
    if (success) {
      setContractSubmitted(true);
      setContractOrg('');
      setContractPerson('');
      setContractEmail('');
      setContractPhone('');
      setContractFleetSize(1);
      setContractRoute('');
      setContractNotes('');
      setTimeout(() => setContractSubmitted(false), 5000);
    }
  };

  const formatDateDisplay = (dateString) => {
    try {
      const d = new Date(dateString);
      const day = d.getDate();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[d.getMonth()];
      const year = d.getFullYear().toString().substring(2);
      return `${day} ${month}'${year}`;
    } catch (e) {
      return dateString;
    }
  };

  const activeTab = activeService === 'contracts' ? 'contract' : 'booking';

  return (
    <div
      id="booking"
      className="relative min-h-[520px] pt-28 pb-16 flex flex-col justify-center items-center overflow-hidden bg-slate-900"
    >
      {/* Base layer: static hero image — instant paint, poster, and permanent fallback */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/hero.jpeg')" }}
        aria-hidden="true"
      ></div>

      {/* Intro video: plays once on the first-ever visit, then fades into the image */}
      {playHeroVideo && (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          src="/hero.mp4"
          poster="/hero.jpeg"
          autoPlay
          muted
          playsInline
          preload="auto"
          onPlaying={handleHeroVideoPlaying}
          onEnded={handleHeroVideoEnded}
          onError={handleHeroVideoError}
          aria-hidden="true"
          tabIndex={-1}
          disablePictureInPicture
        />
      )}

      {/* Gradient + darkening overlay — above image AND video so the form stays readable */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(rgba(16, 50, 87, 0.45), rgba(13, 27, 42, 0.6))' }}
        aria-hidden="true"
      ></div>
      <div className="absolute inset-0 bg-slate-950/20" aria-hidden="true"></div>

      {/* Bottom fade — dissolves the hero into solid navy so it blends seamlessly
          into the next section's navy-tinted background (no hard seam). */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-brand-navy z-[1]" aria-hidden="true"></div>

      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* MakeMyTrip-Style Floating Category Selector Bar */}
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 p-2 flex flex-wrap items-center justify-center gap-1 sm:gap-2 max-w-fit mx-auto relative z-30">
            {services.map((service) => {
              const isActive = activeService === service.id;
              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => handleServiceClick(service)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-black text-xs transition-all duration-200 ${
                    isActive
                      ? 'bg-brand-steel text-white shadow-md shadow-brand-steel/20 scale-[1.03]'
                      : 'text-slate-600 hover:text-brand-steel hover:bg-slate-50'
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-slate-400 shrink-0'}>
                    {service.icon}
                  </span>
                  <span>{service.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Title (MMT Label) */}
        <div className="text-center mb-4">
          <span className="bg-white/95 text-slate-700 font-extrabold text-[10px] px-4 py-1.5 rounded-full border border-slate-200 uppercase shadow-sm tracking-wider">
            {activeService === 'contracts' ? 'Corporate Fleet Transport Contracts.' : activeService === 'cabs' ? 'Luxury SUV / Cab Rental.' : activeService === 'traveler' ? 'Tempo Traveller Booking.' : 'Bus Ticket Booking.'}
          </span>
        </div>

        {/* ----------------- MMT BOOKING CARD CONTAINER ----------------- */}
        <div id="booking-card" className="relative w-full bg-white rounded-2xl shadow-2xl border border-slate-200/85 p-4 sm:p-5 pb-8">
          {activeTab === 'booking' ? (
            
            /* TICKET SEARCH CARD FORM */
            <form onSubmit={handleSearchSubmit} className="space-y-5">
              
              {/* Radio options inside card top */}
              <div className="flex gap-6 border-b border-slate-100 pb-3 text-slate-700">
                <label className="flex items-center gap-2 cursor-pointer text-[10px] font-black uppercase tracking-wider">
                  <input
                    type="radio"
                    name="bookingType"
                    checked={bookingType === 'oneway'}
                    onChange={() => setBookingType('oneway')}
                    className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span className={bookingType === 'oneway' ? 'text-blue-600 font-extrabold' : 'text-slate-500 font-semibold'}>Outstation One-Way</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer text-[10px] font-black uppercase tracking-wider">
                  <input
                    type="radio"
                    name="bookingType"
                    checked={bookingType === 'roundtrip'}
                    onChange={() => setBookingType('roundtrip')}
                    className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span className={bookingType === 'roundtrip' ? 'text-blue-600 font-extrabold' : 'text-slate-500 font-semibold'}>Round Trip</span>
                </label>
              </div>

              {/* MMT 3-Column Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm hover:border-slate-300 transition-all">
                
                {/* Column 1: FROM (Span 4) */}
                <div className="md:col-span-4 p-4 hover:bg-slate-50 transition-colors border-b md:border-b-0 md:border-r border-slate-200 cursor-pointer relative flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">From</span>
                  <div className="mt-1 relative">
                    <select
                      value={from}
                      onChange={(e) => {
                        setFrom(e.target.value);
                        const possibleTo = routes.find(r => r.departure === e.target.value);
                        if (possibleTo) setTo(possibleTo.destination);
                      }}
                      className="w-full font-black text-slate-900 text-2xl focus:outline-none border-none p-0 cursor-pointer bg-transparent appearance-none leading-tight"
                    >
                      {fromOptions.length > 0 ? (
                        fromOptions.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))
                      ) : (
                        <option>Pinjor</option>
                      )}
                    </select>
                    <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">India</span>
                  </div>
                </div>

                {/* Column 2: TO (Span 4) */}
                <div className="md:col-span-4 p-4 hover:bg-slate-50 transition-colors border-b md:border-b-0 md:border-r border-slate-200 cursor-pointer relative flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">To</span>
                  <div className="mt-1 relative">
                    <select
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      className="w-full font-black text-slate-900 text-2xl focus:outline-none border-none p-0 cursor-pointer bg-transparent appearance-none leading-tight"
                    >
                      {toOptions.length > 0 ? (
                        toOptions.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))
                      ) : (
                        <>
                          <option value="Delhi">Delhi</option>
                          <option value="Chandigarh">Chandigarh</option>
                          <option value="Baddi">Baddi</option>
                        </>
                      )}
                    </select>
                    <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">India</span>
                  </div>
                </div>

                {/* Column 3: TRAVEL DATE & SEATS (Span 4) */}
                <div className="md:col-span-4 p-4 hover:bg-slate-50 transition-colors cursor-pointer relative flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1">Travel Date <ChevronDown size={11} className="text-blue-500" /></span>
                    <span>Seats ({seats})</span>
                  </div>
                  <div className="mt-1 flex items-end justify-between">
                    
                    {/* Date Selector */}
                    <div
                      className="relative flex flex-col cursor-pointer"
                      onClick={openDatePicker}
                    >
                      <span className="font-black text-slate-900 text-2xl leading-none">
                        {formatDateDisplay(date)}
                      </span>
                      <input
                        ref={dateInputRef}
                        type="date"
                        value={date}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setDate(e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
                      />
                      <span className="text-[10px] font-semibold text-slate-400 block mt-1">
                        {new Date(date).toLocaleDateString('en-US', { weekday: 'long' })}
                      </span>
                    </div>

                    {/* Seat controls */}
                    <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1 border border-slate-200 mb-0.5">
                      <button 
                        type="button"
                        disabled={seats <= 1}
                        onClick={() => setSeats(seats - 1)}
                        className="w-5.5 h-5.5 rounded-full bg-white flex items-center justify-center font-black text-slate-700 hover:bg-blue-600 hover:text-white disabled:opacity-50 text-[10px] shadow-sm"
                      >
                        -
                      </button>
                      <button 
                        type="button"
                        disabled={seats >= 6}
                        onClick={() => setSeats(seats + 1)}
                        className="w-5.5 h-5.5 rounded-full bg-white flex items-center justify-center font-black text-slate-700 hover:bg-blue-600 hover:text-white disabled:opacity-50 text-[10px] shadow-sm"
                      >
                        +
                      </button>
                    </div>

                  </div>
                </div>

              </div>

              {/* MMT Signature search button - Correctly positioned half-in half-out */}
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 z-20">
                <button
                  type="submit"
                  className="px-20 py-4.5 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-2xl font-black tracking-wide uppercase transition-all duration-300 hover:scale-[1.04] shadow-xl shadow-blue-500/40 border border-blue-500/20"
                >
                  SEARCH
                </button>
              </div>

            </form>
          ) : (
            
            /* INSTITUTIONAL CONTRACT FORM */
            <form onSubmit={handleContractSubmit} className="space-y-5">
              
              {contractSubmitted && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3 animate-fade-in">
                  <ShieldCheck className="shrink-0 text-emerald-500" size={24} />
                  <div>
                    <h4 className="font-bold">Contract Application Sent!</h4>
                    <p className="text-sm">We will get back to you with route proposals and vehicle availabilities shortly.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Organization Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Baddi International School"
                    value={contractOrg}
                    onChange={(e) => setContractOrg(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 bg-slate-50 font-semibold text-slate-800 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Contact Person Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Principal Devendra Singh"
                    value={contractPerson}
                    onChange={(e) => setContractPerson(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 bg-slate-50 font-semibold text-slate-800 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Contact Email *</label>
                  <input
                    type="email"
                    placeholder="e.g. transport@school.org"
                    value={contractEmail}
                    onChange={(e) => setContractEmail(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 bg-slate-50 font-semibold text-slate-800 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765-43210"
                    value={contractPhone}
                    onChange={(e) => setContractPhone(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 bg-slate-50 font-semibold text-slate-800 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Vehicle Type Needed *</label>
                  <select
                    value={contractVehicleType}
                    onChange={(e) => setContractVehicleType(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 bg-slate-50 font-bold text-slate-700 cursor-pointer text-xs"
                  >
                    <option value="School Bus">School Bus (50 Seats)</option>
                    <option value="Mini Bus">Mini Bus (32 Seats)</option>
                    <option value="Volvo AC Seater">Luxury Volvo AC (45 Seats)</option>
                    <option value="Sleeper Coach">Sleeper Coach (30 Berths)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Number of Vehicles *</label>
                  <input
                    type="number"
                    min="1"
                    value={contractFleetSize}
                    onChange={(e) => setContractFleetSize(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 bg-slate-50 font-extrabold text-slate-800 text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Route details *</label>
                <textarea
                  rows="2"
                  placeholder="Daily student pick-ups from Kalka and Pinjor sectors to school campus..."
                  value={contractRoute}
                  onChange={(e) => setContractRoute(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 bg-slate-50 font-semibold text-slate-700 text-xs resize-none"
                  required
                ></textarea>
              </div>

              {/* Submit Inquiry Button - Correctly positioned half-in half-out */}
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 z-20">
                <button
                  type="submit"
                  className="px-14 py-4 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-base font-black tracking-wide uppercase transition-all duration-300 hover:scale-[1.04] shadow-xl shadow-blue-500/40 border border-blue-500/20"
                >
                  SUBMIT INQUIRY
                </button>
              </div>

            </form>
          )}
        </div>

      </div>

    </div>
  );
}
