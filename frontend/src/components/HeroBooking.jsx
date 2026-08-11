import React, { useState, useRef, useEffect } from 'react';
import { Bus, Calendar, MapPin, Users, Phone, ShieldCheck, Clock, Landmark, ChevronDown, ChevronUp, Plane, Hotel, Train, Car, Mail, User } from 'lucide-react';

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

let heroVideoPlayedThisVisit = false;

export default function HeroBooking({ routes, onSearch, onContractSubmit, activeService, setActiveService, serviceConfig }) {
  const [bookingType, setBookingType] = useState('oneway');

  const [from, setFrom] = useState('Pinjor');
  const [to, setTo] = useState('Delhi');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [seats, setSeats] = useState(1);
  const dateInputRef = useRef(null);
  const [showMoreFields, setShowMoreFields] = useState(false);

  const openDatePicker = () => {
    const el = dateInputRef.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') {
      try { el.showPicker(); return; } catch (e) { /* fall through */ }
    }
    el.focus();
  };

  const [contractOrg, setContractOrg] = useState('');
  const [contractPerson, setContractPerson] = useState('');
  const [contractEmail, setContractEmail] = useState('');
  const [contractPhone, setContractPhone] = useState('');
  const [contractFleetSize, setContractFleetSize] = useState(1);
  const [contractVehicleType, setContractVehicleType] = useState('School Bus');
  const [contractRoute, setContractRoute] = useState('');
  const [contractNotes, setContractNotes] = useState('');
  const [contractSubmitted, setContractSubmitted] = useState(false);

  const videoRef = useRef(null);

  const handleHeroVideoPlaying = () => { heroVideoPlayedThisVisit = true; };
  const handleHeroVideoEnded = () => { heroVideoPlayedThisVisit = true; };

  const isServiceEnabled = (id) => {
    if (id === 'contracts') return true;
    if (!serviceConfig || !serviceConfig[id]) return true;
    return serviceConfig[id].enabled;
  };
  const getServiceMessage = (id) => {
    if (!serviceConfig || !serviceConfig[id]) return '';
    return serviceConfig[id].message || '';
  };

  const services = [
    { id: 'buses', label: 'Buses', icon: <Bus size={18} /> },
    { id: 'cabs', label: 'Cabs', icon: <Car size={18} /> },
    { id: 'traveler', label: 'Traveler', icon: <VanIcon size={18} /> },
    { id: 'contracts', label: 'Fleet Contracts', icon: <ShieldCheck size={18} /> }
  ];

  const handleServiceClick = (service) => {
    setActiveService(service.id);
    setShowMoreFields(false);
  };

  const fromOptions = Array.from(new Set(routes.map(r => r.departure)));
  const toOptions = Array.from(new Set(routes.filter(r => r.departure === from).map(r => r.destination)));

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    onSearch({ from, to, date, seats, bookingType });
  };

  const handleContractSubmit = async (e) => {
    e.preventDefault();
    if (!contractOrg || !contractPhone || !contractVehicleType) {
      alert('Please fill in all required fields.');
      return;
    }
    const success = await onContractSubmit({
      orgName: contractOrg,
      contactPerson: contractPerson,
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
      setShowMoreFields(false);
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

  // Phone-only contract form: labelled fields at a readable size. This is the
  // first impression for corporate/school buyers, so it follows normal
  // enterprise form conventions rather than being squeezed to fit the video.
  const mLabel = "block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1";
  const mField = "w-full h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-[11.5px] font-semibold text-slate-800 placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:border-brand-steel focus:ring-2 focus:ring-brand-steel/15 transition-colors";

  return (
    <>
    <style>{`
      .hero-video {
        object-position: 30% center;
      }
      /* Phone: the media layers are shifted up 20% together for framing. */
      .hero-shift {
        transform: translateY(-20%);
      }
      /* Medium and large phones (360px+) sit the bus slightly further left.
         Small phones keep the 30% framing; the 640px block below resets
         desktop back to centre. */
      @media (min-width: 360px) {
        .hero-video {
          object-position: 36% center;
        }
      }
      @media (min-width: 640px) {
        .hero-video {
          object-position: center center;
        }
        .hero-shift {
          transform: none;
        }
      }

      /* Laptop: size the hero so the first screen ends just after the
         "Travel With Chaudharys Standard" heading + subtitle — the feature
         cards start below the fold instead of being cut in half.
         The / 0.9 compensates for the global desktop zoom in index.css
         (vh units are not affected by CSS zoom, so it must be divided out).
         Keep the divisor in sync with that zoom value. */
      @media (min-width: 768px) {
        #booking {
          min-height: max(520px, calc((100vh - 168px) / 0.9));
        }

        /* Nudge the video slightly left on laptops. object-position can't do
           this here: the video is narrower in aspect than the hero box, so
           object-cover already fits it to the full width with zero horizontal
           slack to pan. Widening it by 2% and pulling it left by the same 2%
           shifts the framing while keeping the right edge flush (the extra
           width is clipped by the hero's overflow-hidden).
           max-width:none is required — Tailwind's preflight caps video at
           max-width 100%, which otherwise clamps the widening. */
        #booking .hero-video {
          max-width: none;
          width: 105%;
          left: -5%;
        }
      }

      /* Tablets: the hero box is portrait here, so object-cover fits the video
         to the height and the bus reads small. Growing the element 15% past the
         box scales the video up with it — the overflow is clipped by the hero.
         Must come after the 768px rule to override its width/left. */
      @media (min-width: 640px) and (max-width: 1023px) {
        #booking .hero-video {
          max-width: none;
          width: 115%;
          height: 115%;
          left: -7.5%;
          top: -7.5%;
          /* The zoom leaves plenty of horizontal slack here, so the framing
             pans with object-position rather than the laptop width trick. */
          object-position: 56% center;
        }
      }

      /* Small laptops: same 15% zoom as tablets. left is -12.5% rather than a
         centred -7.5% so the framing keeps the same 5% leftward bias the wider
         laptops get, and the right edge still lands past the box at 102.5%. */
      @media (min-width: 1024px) and (max-width: 1279px) {
        #booking .hero-video {
          max-width: none;
          width: 115%;
          height: 115%;
          left: -12.5%;
          top: -7.5%;
        }
      }
    `}</style>
    <div
      id="booking"
      className="relative min-h-[480px] sm:min-h-[520px] pt-16 sm:pt-28 pb-[154px] sm:pb-16 flex flex-col justify-start sm:justify-center items-center overflow-hidden bg-slate-900"
    >
      {/* Media layers live in a fixed-height box on phones. object-cover scales
          the video to the box height, so if this tracked the hero it would zoom
          in whenever the form expands. Pinning it keeps the framing still. */}
      <div className="absolute inset-x-0 top-0 h-[540px] sm:h-full" aria-hidden="true">
        <video
          ref={videoRef}
          className="hero-shift absolute inset-0 w-full h-full object-cover hero-video"
          src="/hero.mp4"
          autoPlay
          muted
          playsInline
          preload="auto"
          poster="/hero.jpeg"
          onPlaying={handleHeroVideoPlaying}
          onEnded={handleHeroVideoEnded}
          tabIndex={-1}
          disablePictureInPicture
        />

        {/* Softens the media's lower edge into the hero background once the
            form is expanded and the hero is taller than this box. */}
        <div
          className="hero-shift absolute inset-0 sm:hidden"
          style={{ background: 'linear-gradient(to bottom, transparent 90%, #0f172a 100%)' }}
        ></div>
      </div>

      {/* Gradient overlay — lighter on mobile so video is more visible */}
      <div
        className="absolute inset-0 hidden sm:block"
        style={{ background: 'linear-gradient(rgba(16, 50, 87, 0.35), rgba(13, 27, 42, 0.55))' }}
        aria-hidden="true"
      ></div>
      <div
        className="absolute inset-0 sm:hidden"
        style={{ background: 'linear-gradient(rgba(16, 50, 87, 0.2), rgba(13, 27, 42, 0.45))' }}
        aria-hidden="true"
      ></div>
      <div className="absolute inset-0 bg-slate-950/10 sm:bg-slate-950/15" aria-hidden="true"></div>

      {/* Bottom fade */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-brand-navy z-[1] hidden sm:block" aria-hidden="true"></div>

      <div className="max-w-4xl w-full mx-auto px-3 sm:px-6 lg:px-8 relative z-10">

        {/* Category Selector Bar */}
        <div className="flex justify-center mb-2 sm:mb-6">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 p-1 sm:p-2 flex flex-wrap items-center justify-center gap-0 sm:gap-2 max-w-fit mx-auto relative z-30">
            {services.map((service) => {
              const isActive = activeService === service.id;
              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => handleServiceClick(service)}
                  className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 rounded-full font-black text-[9px] sm:text-xs transition-all duration-200 max-[359px]:gap-0.5 max-[359px]:px-1 max-[359px]:text-[8px] ${
                    isActive
                      ? 'bg-brand-steel text-white shadow-md shadow-brand-steel/20 scale-[1.03]'
                      : 'text-slate-600 hover:text-brand-steel hover:bg-slate-50'
                  }`}
                >
                  <span className={`${isActive ? 'text-white' : 'text-slate-400'} shrink-0 hidden sm:block`}>
                    {service.icon}
                  </span>
                  <span>{service.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Title — hidden on mobile to save space */}
        <div className="text-center mb-3 sm:mb-4 hidden sm:block">
          <span className="bg-white/95 text-slate-700 font-extrabold text-[10px] px-4 py-1.5 rounded-full border border-slate-200 uppercase shadow-sm tracking-wider">
            {activeService === 'contracts' ? 'Corporate Fleet Transport Contracts.' : activeService === 'cabs' ? 'Luxury SUV / Cab Rental.' : activeService === 'traveler' ? 'Tempo Traveller Booking.' : 'Bus Ticket Booking.'}
          </span>
        </div>

        {/* Booking Card */}
        <div data-booking-card className={`relative w-[85%] sm:w-[78%] lg:w-[88%] xl:w-full mx-auto bg-white/95 sm:bg-white backdrop-blur-sm sm:backdrop-blur-none rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200/85 sm:p-5 sm:pb-14 ${activeTab === 'contract' ? 'p-4 pb-4' : 'p-2 pb-8'}`}>
          {activeService !== 'contracts' && !isServiceEnabled(activeService) ? (
            /* Sizing: the phone values (the unprefixed ones) are tuned to match
               the live booking form's height. From sm: up the copy is set larger
               for tablets/laptops, and the icon and vertical padding are trimmed
               by the same amount so the card height does not grow. */
            <div className="flex flex-col items-center justify-center py-2 sm:py-1 px-4 text-center">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mb-1 sm:mb-0.5">
                <Clock size={16} className="text-slate-400" />
              </div>
              <h3 className="text-[11px] sm:text-lg font-bold text-brand-navy mb-0.5">
                {activeService === 'buses' ? 'Bus Booking' : activeService === 'cabs' ? 'Cab Booking' : 'Traveller Booking'} Unavailable
              </h3>
              <p className="text-[10px] sm:text-[15px] text-slate-500 max-w-sm sm:max-w-lg leading-snug">
                {getServiceMessage(activeService)}
              </p>
              <button
                type="button"
                onClick={() => setActiveService('contracts')}
                className="mt-1.5 sm:mt-2 px-3.5 sm:px-5 py-1 sm:py-1.5 rounded-full bg-brand-navy text-white text-[9px] sm:text-[13px] font-bold hover:bg-brand-steel transition-colors"
              >
                Request Fleet Contract Instead
              </button>
            </div>
          ) : activeTab === 'booking' ? (
            <form onSubmit={handleSearchSubmit}>
              {/* Trip type toggle */}
              <div className="flex gap-3 sm:gap-6 border-b border-slate-100 pb-1.5 sm:pb-3 mb-2 sm:mb-5 text-slate-700">
                <label className="flex items-center gap-1.5 cursor-pointer text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
                  <input type="radio" name="bookingType" checked={bookingType === 'oneway'} onChange={() => setBookingType('oneway')} className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600 focus:ring-blue-500 border-slate-300" />
                  <span className={bookingType === 'oneway' ? 'text-blue-600 font-extrabold' : 'text-slate-500 font-semibold'}>One-Way</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
                  <input type="radio" name="bookingType" checked={bookingType === 'roundtrip'} onChange={() => setBookingType('roundtrip')} className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600 focus:ring-blue-500 border-slate-300" />
                  <span className={bookingType === 'roundtrip' ? 'text-blue-600 font-extrabold' : 'text-slate-500 font-semibold'}>Round Trip</span>
                </label>
              </div>

              {/* Mobile: compact 3-col row */}
              <div className="grid grid-cols-3 gap-1.5 sm:hidden">
                <div className="border border-slate-200 rounded-lg p-1.5 bg-white">
                  <span className="text-[8px] font-bold text-slate-400 uppercase block">From</span>
                  <select value={from} onChange={(e) => { setFrom(e.target.value); const p = routes.find(r => r.departure === e.target.value); if (p) setTo(p.destination); }} className="w-full font-black text-slate-900 text-sm focus:outline-none border-none p-0 cursor-pointer bg-transparent appearance-none leading-tight">
                    {fromOptions.length > 0 ? fromOptions.map((opt) => (<option key={opt} value={opt}>{opt}</option>)) : (<option>Pinjor</option>)}
                  </select>
                </div>
                <div className="border border-slate-200 rounded-lg p-1.5 bg-white">
                  <span className="text-[8px] font-bold text-slate-400 uppercase block">To</span>
                  <select value={to} onChange={(e) => setTo(e.target.value)} className="w-full font-black text-slate-900 text-sm focus:outline-none border-none p-0 cursor-pointer bg-transparent appearance-none leading-tight">
                    {toOptions.length > 0 ? toOptions.map((opt) => (<option key={opt} value={opt}>{opt}</option>)) : (<><option value="Delhi">Delhi</option><option value="Chandigarh">Chandigarh</option><option value="Baddi">Baddi</option></>)}
                  </select>
                </div>
                <div className="border border-slate-200 rounded-lg p-1.5 bg-white cursor-pointer" onClick={openDatePicker}>
                  <span className="text-[8px] font-bold text-slate-400 uppercase block">Date</span>
                  <span className="font-black text-slate-900 text-sm leading-tight block">{formatDateDisplay(date)}</span>
                  <input ref={dateInputRef} type="date" value={date} min={new Date().toISOString().split('T')[0]} onChange={(e) => setDate(e.target.value)} className="absolute opacity-0 pointer-events-none w-0 h-0" />
                </div>
              </div>

              {/* Mobile: seats row */}
              <div className="flex items-center justify-between mt-1.5 sm:hidden">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Passengers</span>
                <div className="flex items-center gap-1.5">
                  <button type="button" disabled={seats <= 1} onClick={() => setSeats(seats - 1)} className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-700 disabled:opacity-40 text-xs border border-slate-200">-</button>
                  <span className="text-sm font-black text-slate-800 w-4 text-center">{seats}</span>
                  <button type="button" disabled={seats >= 6} onClick={() => setSeats(seats + 1)} className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-700 disabled:opacity-40 text-xs border border-slate-200">+</button>
                </div>
              </div>

              {/* Desktop: original layout */}
              <div className="hidden sm:grid md:grid-cols-12 border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm hover:border-slate-300 transition-all">
                <div className="md:col-span-4 p-4 hover:bg-slate-50 transition-colors border-b md:border-b-0 md:border-r border-slate-200 cursor-pointer">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">From</span>
                  <select value={from} onChange={(e) => { setFrom(e.target.value); const p = routes.find(r => r.departure === e.target.value); if (p) setTo(p.destination); }} className="w-full font-black text-slate-900 text-2xl focus:outline-none border-none p-0 cursor-pointer bg-transparent appearance-none leading-tight mt-1">
                    {fromOptions.length > 0 ? fromOptions.map((opt) => (<option key={opt} value={opt}>{opt}</option>)) : (<option>Pinjor</option>)}
                  </select>
                  <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">India</span>
                </div>
                <div className="md:col-span-4 p-4 hover:bg-slate-50 transition-colors border-b md:border-b-0 md:border-r border-slate-200 cursor-pointer">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">To</span>
                  <select value={to} onChange={(e) => setTo(e.target.value)} className="w-full font-black text-slate-900 text-2xl focus:outline-none border-none p-0 cursor-pointer bg-transparent appearance-none leading-tight mt-1">
                    {toOptions.length > 0 ? toOptions.map((opt) => (<option key={opt} value={opt}>{opt}</option>)) : (<><option value="Delhi">Delhi</option><option value="Chandigarh">Chandigarh</option><option value="Baddi">Baddi</option></>)}
                  </select>
                  <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">India</span>
                </div>
                <div className="md:col-span-4 p-4 hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1">Travel Date <ChevronDown size={11} className="text-blue-500" /></span>
                    <span>Seats ({seats})</span>
                  </div>
                  <div className="mt-1 flex items-end justify-between">
                    <div className="relative flex flex-col cursor-pointer" onClick={openDatePicker}>
                      <span className="font-black text-slate-900 text-2xl leading-none">{formatDateDisplay(date)}</span>
                      <input ref={dateInputRef} type="date" value={date} min={new Date().toISOString().split('T')[0]} onChange={(e) => setDate(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 pointer-events-none" />
                      <span className="text-[10px] font-semibold text-slate-400 block mt-1">{new Date(date).toLocaleDateString('en-US', { weekday: 'long' })}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1 border border-slate-200 mb-0.5">
                      <button type="button" disabled={seats <= 1} onClick={() => setSeats(seats - 1)} className="w-5.5 h-5.5 rounded-full bg-white flex items-center justify-center font-black text-slate-700 hover:bg-blue-600 hover:text-white disabled:opacity-50 text-[10px] shadow-sm">-</button>
                      <button type="button" disabled={seats >= 6} onClick={() => setSeats(seats + 1)} className="w-5.5 h-5.5 rounded-full bg-white flex items-center justify-center font-black text-slate-700 hover:bg-blue-600 hover:text-white disabled:opacity-50 text-[10px] shadow-sm">+</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 z-20">
                <button type="submit" className="px-8 sm:px-20 py-2.5 sm:py-4.5 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs sm:text-2xl font-black tracking-wide uppercase transition-all duration-300 hover:scale-[1.04] shadow-xl shadow-blue-500/40 border border-blue-500/20">
                  SEARCH
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleContractSubmit}>
              {contractSubmitted && (
                <div className="p-2 sm:p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg sm:rounded-xl flex items-center gap-2 sm:gap-3 animate-fade-in mb-2 sm:mb-4">
                  <ShieldCheck className="shrink-0 text-emerald-500" size={16} />
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm">Contract Application Sent!</h4>
                    <p className="text-[10px] sm:text-xs">We will get back to you shortly.</p>
                  </div>
                </div>
              )}

              {/* Phone: labelled enquiry form */}
              <div className="sm:hidden">
                <div className="pb-2 mb-3 border-b border-slate-200">
                  <h3 className="text-center text-[12px] font-extrabold text-brand-navy tracking-tight whitespace-nowrap">Fleet Contract Enquiry</h3>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className={mLabel}>Organisation <span className="text-brand-steel">*</span></label>
                    <input type="text" placeholder="School / Company name" value={contractOrg} onChange={(e) => setContractOrg(e.target.value)} className={mField} required />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={mLabel}>Contact Person</label>
                      <input type="text" placeholder="Full name" value={contractPerson} onChange={(e) => setContractPerson(e.target.value)} className={mField} />
                    </div>
                    <div>
                      <label className={mLabel}>Phone <span className="text-brand-steel">*</span></label>
                      <input type="tel" placeholder="+91 98765 43210" value={contractPhone} onChange={(e) => setContractPhone(e.target.value)} className={mField} required />
                    </div>
                  </div>

                </div>

                {/* Animating to height:auto is not possible, so the extra fields
                    sit in a grid row that eases from 0fr to 1fr. */}
                <div
                  className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${showMoreFields ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-2 pt-2">
                      <div>
                        <label className={mLabel}>Email</label>
                        <input type="email" placeholder="name@organisation.com" value={contractEmail} onChange={(e) => setContractEmail(e.target.value)} className={mField} tabIndex={showMoreFields ? 0 : -1} />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={mLabel}>Vehicle Type</label>
                          <div className="relative">
                            <select value={contractVehicleType} onChange={(e) => setContractVehicleType(e.target.value)} className={`${mField} appearance-none pr-7 cursor-pointer`} tabIndex={showMoreFields ? 0 : -1}>
                              <option value="School Bus">School Bus</option>
                              <option value="Mini Bus">Mini Bus</option>
                              <option value="Volvo AC Seater">Volvo AC Seater</option>
                              <option value="Sleeper Coach">Sleeper Coach</option>
                            </select>
                            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          </div>
                        </div>
                        <div>
                          <label className={mLabel}>No. of Vehicles</label>
                          <input type="number" min="1" value={contractFleetSize} onChange={(e) => setContractFleetSize(e.target.value)} className={mField} tabIndex={showMoreFields ? 0 : -1} />
                        </div>
                      </div>

                      <div>
                        <label className={mLabel}>Route</label>
                        <input type="text" placeholder="Pickup area to destination" value={contractRoute} onChange={(e) => setContractRoute(e.target.value)} className={mField} tabIndex={showMoreFields ? 0 : -1} />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowMoreFields(!showMoreFields)}
                  className="mt-2 w-full flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wider text-brand-steel py-1"
                >
                  <span>{showMoreFields ? 'Show less' : 'Add more details'}</span>
                  {showMoreFields ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                <button type="submit" className="mt-1.5 w-full h-10 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-[11px] font-black uppercase tracking-[0.1em] shadow-lg shadow-blue-600/25 active:scale-[0.99] transition-transform">
                  Request a Proposal
                </button>
                <p className="mt-2 text-center text-[8px] font-medium text-slate-400">
                  Response within 24 hours &middot; No obligation
                </p>
              </div>

              {/* Core fields — 3-col single row */}
              <div className="hidden sm:grid grid-cols-3 gap-1.5 sm:gap-3">
                <div>
                  <label className="block text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1">Organization *</label>
                  <input type="text" placeholder="School / Company" value={contractOrg} onChange={(e) => setContractOrg(e.target.value)} className="w-full p-1 sm:p-2.5 border border-slate-200 rounded-lg sm:rounded-xl focus:outline-none focus:border-blue-500 bg-slate-50 font-semibold text-slate-800 text-[10px] sm:text-xs" required />
                </div>
                <div>
                  <label className="block text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1">Phone *</label>
                  <input type="tel" placeholder="+91 98765..." value={contractPhone} onChange={(e) => setContractPhone(e.target.value)} className="w-full p-1 sm:p-2.5 border border-slate-200 rounded-lg sm:rounded-xl focus:outline-none focus:border-blue-500 bg-slate-50 font-semibold text-slate-800 text-[10px] sm:text-xs" required />
                </div>
                <div>
                  <label className="block text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1">Vehicle *</label>
                  <select value={contractVehicleType} onChange={(e) => setContractVehicleType(e.target.value)} className="w-full p-1 sm:p-2.5 border border-slate-200 rounded-lg sm:rounded-xl focus:outline-none focus:border-blue-500 bg-slate-50 font-bold text-slate-700 cursor-pointer text-[10px] sm:text-xs">
                    <option value="School Bus">School Bus</option>
                    <option value="Mini Bus">Mini Bus</option>
                    <option value="Volvo AC Seater">Volvo AC</option>
                    <option value="Sleeper Coach">Sleeper</option>
                  </select>
                </div>
              </div>

              {/* Extra fields — always visible */}
              <div className="hidden sm:block mt-2 sm:mt-4 space-y-2 sm:space-y-3">
                <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
                  <div>
                    <label className="block text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1">Contact Person</label>
                    <input type="text" placeholder="Devendra Singh" value={contractPerson} onChange={(e) => setContractPerson(e.target.value)} className="w-full p-1 sm:p-2.5 border border-slate-200 rounded-lg sm:rounded-xl focus:outline-none focus:border-blue-500 bg-slate-50 font-semibold text-slate-800 text-[10px] sm:text-xs" />
                  </div>
                  <div>
                    <label className="block text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1">Email</label>
                    <input type="email" placeholder="email@org.com" value={contractEmail} onChange={(e) => setContractEmail(e.target.value)} className="w-full p-1 sm:p-2.5 border border-slate-200 rounded-lg sm:rounded-xl focus:outline-none focus:border-blue-500 bg-slate-50 font-semibold text-slate-800 text-[10px] sm:text-xs" />
                  </div>
                  <div>
                    <label className="block text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1">Vehicles</label>
                    <input type="number" min="1" value={contractFleetSize} onChange={(e) => setContractFleetSize(e.target.value)} className="w-full p-1 sm:p-2.5 border border-slate-200 rounded-lg sm:rounded-xl focus:outline-none focus:border-blue-500 bg-slate-50 font-extrabold text-slate-800 text-[10px] sm:text-xs" />
                  </div>
                  <div>
                    <label className="block text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1">Route</label>
                    <input type="text" placeholder="Kalka to campus" value={contractRoute} onChange={(e) => setContractRoute(e.target.value)} className="w-full p-1 sm:p-2.5 border border-slate-200 rounded-lg sm:rounded-xl focus:outline-none focus:border-blue-500 bg-slate-50 font-semibold text-slate-700 text-[10px] sm:text-xs" />
                  </div>
                </div>

              </div>

              <div className="hidden sm:block absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 z-20">
                <button type="submit" className="px-6 sm:px-14 py-2 sm:py-4 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-[11px] sm:text-base font-black tracking-wide uppercase transition-all duration-300 hover:scale-[1.04] shadow-lg shadow-blue-500/40 border border-blue-500/20">
                  SUBMIT INQUIRY
                </button>
              </div>
            </form>
          )}
        </div>

      </div>

    </div>
    </>
  );
}

