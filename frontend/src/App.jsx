import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HeroBooking from './components/HeroBooking';
import ZingFeatures from './components/ZingFeatures';
import ContractPartners from './components/ContractPartners';
import FleetShowcase from './components/FleetShowcase';
import PaymentGateway from './components/PaymentGateway';
import AdminPanel from './components/AdminPanel';
import AdminLogin from './components/AdminLogin';
import ListingSearchBar from './components/ListingSearchBar';
import Footer from './components/Footer';
import AboutPage from './components/AboutPage';
import { Bus, Calendar, Users, Info, Sparkles, MapPin, Clock, CheckCircle2, ArrowRight, ArrowLeft, Wifi, Search, Armchair, CreditCard } from 'lucide-react';

// Dev: falls back to the local backend. Production build: set VITE_API_BASE (e.g. "/api").
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

// Representative image per vehicle type (used across the booking flow)
const getVehicleImage = (type) => {
  switch (type) {
    case 'Luxury SUV / Cab':
      return 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800';
    case 'Tempo Traveller':
      return '/vehicle-force-traveller.jpg';
    case 'AC Coach':
      return '/vehicle-chaudhary-ac-coach.jpg';
    case 'Seater Bus':
      return '/vehicle-chaudhary-transport-bus.jpg';
    // Every remaining type is a bus of some kind, including legacy ones.
    case 'School Bus':
    case 'Mini Bus':
    default:
      return 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800';
  }
};

// Rough journey duration from "07:30 AM" style strings
const getDuration = (dep, arr) => {
  const toMin = (t) => {
    if (!t) return null;
    const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!m) return null;
    let h = parseInt(m[1]) % 12;
    if (/PM/i.test(m[3])) h += 12;
    return h * 60 + parseInt(m[2]);
  };
  const a = toMin(dep), b = toMin(arr);
  if (a == null || b == null) return null;
  let diff = b - a;
  if (diff < 0) diff += 24 * 60; // overnight
  const h = Math.floor(diff / 60), mm = diff % 60;
  return `${h}h${mm ? ' ' + mm + 'm' : ''}`;
};

// Progress indicator so the user always knows where they are in the flow
function BookingSteps({ current }) {
  const steps = [
    { id: 1, label: 'Search', Icon: Search },
    { id: 2, label: 'Select Bus & Seats', Icon: Armchair },
    { id: 3, label: 'Payment', Icon: CreditCard },
  ];
  return (
    <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-10">
      {steps.map((s, i) => {
        const active = s.id === current;
        const done = s.id < current;
        return (
          <React.Fragment key={s.id}>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              active ? 'bg-brand-navy text-white shadow-md shadow-brand-navy/20'
              : done ? 'bg-brand-steel/10 text-brand-steel'
              : 'bg-slate-100 text-slate-400'
            }`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                active ? 'bg-white/20 text-white' : done ? 'bg-brand-steel/20 text-brand-steel' : 'bg-slate-200 text-slate-500'
              }`}>
                {done ? '✓' : s.id}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
              <s.Icon size={13} className="sm:hidden" />
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 w-5 sm:w-10 rounded-full ${done ? 'bg-brand-steel/40' : 'bg-slate-200'}`}></div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function App() {
  const [currentView, setCurrentView] = useState('public'); // 'public' or 'admin'
  const [activeService, setActiveService] = useState('contracts'); // 'buses', 'cabs', 'contracts', etc.
  
  // API States
  const [vehicles, setVehicles] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [clients, setClients] = useState([]);

  // Auth state
  const [authToken, setAuthToken] = useState(() => {
    try { return localStorage.getItem('twc_admin_token') || null; } catch { return null; }
  });
  const [adminUser, setAdminUser] = useState(null);

  // Search Results States
  const [searchResults, setSearchResults] = useState(null);
  const [searchParams, setSearchParams] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [occupiedSeats, setOccupiedSeats] = useState([]);
  const [listingOpen, setListingOpen] = useState(false); // dedicated search-results page
  const [editingSearch, setEditingSearch] = useState(false); // inline edit on listing page

  // Checkout Info
  const [bookingFormData, setBookingFormData] = useState({
    name: '', age: '', email: '', phone: ''
  });
  const [showPayment, setShowPayment] = useState(false);
  const [activeBookingRef, setActiveBookingRef] = useState(null);
  const [showTicketReceipt, setShowTicketReceipt] = useState(null);
  const [inquiryVehicle, setInquiryVehicle] = useState(null);
  const [serviceConfig, setServiceConfig] = useState(null);

  // --- HIDDEN ADMIN ACCESS ---
  // There is intentionally NO public admin button. The admin panel is only reachable
  // via the secret URL (/admin or #admin) or the Ctrl+Shift+A keyboard shortcut.
  const isAdminUrl = () => {
    try {
      const path = window.location.pathname.replace(/\/+$/, '').toLowerCase();
      return path === '/admin' || window.location.hash.toLowerCase() === '#admin';
    } catch (e) {
      return false;
    }
  };

  const isAboutUrl = () => {
    try {
      const path = window.location.pathname.replace(/\/+$/, '').toLowerCase();
      return path === '/about' || window.location.hash.toLowerCase() === '#about';
    } catch (e) {
      return false;
    }
  };

  // Switch view and keep the URL in sync (so refresh/back behave sensibly).
  const setView = (view) => {
    setCurrentView(view);
    // Navigating to the public home always leaves the dedicated listing page
    if (view !== 'admin') {
      setListingOpen(false);
      setEditingSearch(false);
      setSearchResults(null);
      setSelectedRoute(null);
      setSelectedSeats([]);
    }
    try {
      if (view === 'admin') {
        if (!isAdminUrl()) window.history.pushState(null, '', '/admin');
      } else if (view === 'about') {
        if (!isAboutUrl()) window.history.pushState(null, '', '/about');
        window.scrollTo({ top: 0, behavior: 'auto' });
      } else if (isAdminUrl() || isAboutUrl() || window.location.pathname.startsWith('/search')) {
        window.history.pushState(null, '', '/');
        // Coming back from /about (or /admin, /search) the browser keeps the old
        // scroll offset. The About page is far taller than the home page, so that
        // offset lands the visitor in the footer instead of the hero.
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    } catch (e) { /* ignore */ }
  };

  // Sync the view with the URL (back/forward) and wire the secret shortcut.
  useEffect(() => {
    const syncFromUrl = () => setCurrentView(isAdminUrl() ? 'admin' : isAboutUrl() ? 'about' : 'public');
    syncFromUrl();
    const onKey = (e) => {
      // Ctrl+Shift+A (Cmd+Shift+A on Mac) opens the admin login from anywhere.
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setView('admin');
      }
    };
    window.addEventListener('popstate', syncFromUrl);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('popstate', syncFromUrl);
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch public data on mount + restore any existing admin session.
  useEffect(() => {
    fetchPublicData();
    restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Authenticated fetch: attaches the bearer token and logs out on 401.
  const authFetch = async (url, options = {}) => {
    let token = null;
    try { token = localStorage.getItem('twc_admin_token'); } catch { /* ignore */ }
    const headers = { ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) handleLogout();
    return res;
  };

  // Public data — no auth required.
  const fetchPublicData = async () => {
    try {
      const [vRes, rRes, cRes, sRes] = await Promise.all([
        fetch(`${API_BASE}/vehicles`),
        fetch(`${API_BASE}/routes`),
        fetch(`${API_BASE}/clients`),
        fetch(`${API_BASE}/settings`),
      ]);
      if (vRes.ok) setVehicles(await vRes.json());
      if (rRes.ok) setRoutes(await rRes.json());
      if (cRes.ok) setClients(await cRes.json());
      if (sRes.ok) {
        const settings = await sRes.json();
        if (settings.services) setServiceConfig(settings.services);
      }
    } catch (err) {
      console.error('Error fetching public data:', err);
    }
  };

  // Admin-only data — requires a valid session token.
  const fetchAdminData = async () => {
    try {
      const bRes = await authFetch(`${API_BASE}/bookings`);
      const iRes = await authFetch(`${API_BASE}/inquiries`);
      if (bRes.ok) setBookings(await bRes.json());
      if (iRes.ok) setInquiries(await iRes.json());
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  };

  // Refresh everything relevant after a mutation (public + admin when logged in).
  const refreshAll = async () => {
    await fetchPublicData();
    let token = null;
    try { token = localStorage.getItem('twc_admin_token'); } catch { /* ignore */ }
    if (token) await fetchAdminData();
  };

  // Restore a saved session if its token is still valid on the server.
  const restoreSession = async () => {
    let token = null;
    try { token = localStorage.getItem('twc_admin_token'); } catch { /* ignore */ }
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setAdminUser(data.user);
        setAuthToken(token);
        fetchAdminData();
      } else {
        try { localStorage.removeItem('twc_admin_token'); } catch { /* ignore */ }
        setAuthToken(null);
      }
    } catch (err) {
      console.error('Session restore failed:', err);
    }
  };

  // --- AUTH HANDLERS ---
  // Holds back until the admin data is in, so the dashboard opens already
  // populated instead of flashing empty. minMs keeps the sign-in transition on
  // screen long enough to read when the fetch returns almost instantly.
  const handleLoginSuccess = async (token, user, minMs = 0) => {
    try { localStorage.setItem('twc_admin_token', token); } catch { /* ignore */ }
    setAuthToken(token);
    setView('admin');

    const startedAt = Date.now();
    await fetchAdminData();
    const remaining = minMs - (Date.now() - startedAt);
    if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));

    setAdminUser(user); // this swaps the gate for the panel
  };

  const handleLogout = () => {
    try { localStorage.removeItem('twc_admin_token'); } catch { /* ignore */ }
    setAuthToken(null);
    setAdminUser(null);
    setBookings([]);
    setInquiries([]);
    setView('public');
  };

  // --- PUBLIC HANDLERS ---
  
  // Search intercity routes
  // Run a search and open the dedicated listing page (optionally syncing the URL)
  const runSearch = (params, { pushUrl = true } = {}) => {
    const svc = params.service || activeService;
    setSearchParams({ ...params, service: svc });
    setSelectedRoute(null);
    setSelectedSeats([]);

    let matched = routes.filter(
      r => r.departure.toLowerCase() === params.from.toLowerCase() &&
           r.destination.toLowerCase() === params.to.toLowerCase()
    );

    // Filter by service type (cabs vs traveler vs buses)
    if (svc === 'cabs') {
      matched = matched.filter(r => r.vehicle?.type === 'Luxury SUV / Cab');
    } else if (svc === 'traveler') {
      matched = matched.filter(r => r.vehicle?.type === 'Mini Bus');
    } else {
      matched = matched.filter(r => r.vehicle?.type !== 'Luxury SUV / Cab' && r.vehicle?.type !== 'Mini Bus');
    }

    setSearchResults(matched);
    setListingOpen(true);

    if (pushUrl) {
      try {
        const q = new URLSearchParams({
          from: params.from, to: params.to, date: params.date,
          seats: String(params.seats), service: svc,
        });
        window.history.pushState(null, '', `/search?${q.toString()}`);
      } catch (e) { /* ignore */ }
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const handleSearch = (params) => runSearch(params, { pushUrl: true });

  // Leave the listing page and return to the home/search hero
  const closeListing = () => {
    setListingOpen(false);
    setEditingSearch(false);
    setSearchResults(null);
    setSelectedRoute(null);
    setSelectedSeats([]);
    try {
      if (window.location.pathname.startsWith('/search')) window.history.pushState(null, '', '/');
    } catch (e) { /* ignore */ }
    setTimeout(() => {
      const el = document.getElementById('booking');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  };

  // Rebuild the listing from a /search?... URL (reload, back/forward)
  const openListingFromUrl = () => {
    const q = new URLSearchParams(window.location.search);
    const from = q.get('from'), to = q.get('to');
    if (!from || !to) return;
    const svc = q.get('service') || 'buses';
    setActiveService(svc);
    runSearch({
      from, to,
      date: q.get('date') || new Date().toISOString().split('T')[0],
      seats: parseInt(q.get('seats') || '1', 10),
      bookingType: 'oneway',
      service: svc,
    }, { pushUrl: false });
  };

  // Restore the listing page from the URL once routes are available (reload / deep link)
  useEffect(() => {
    if (routes.length > 0 && window.location.pathname.startsWith('/search') && !listingOpen) {
      openListingFromUrl();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routes]);

  // Browser back/forward between the listing page and home
  useEffect(() => {
    const onPop = () => {
      if (window.location.pathname.startsWith('/search')) {
        if (routes.length > 0) openListingFromUrl();
      } else {
        setListingOpen(false);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routes]);


  // Select a bus/route to book
  const handleSelectRoute = async (route) => {
    setSelectedRoute(route);
    setSelectedSeats([]);

    // Ask the server which seats are already taken (returns seat numbers only, no passenger data)
    try {
      const res = await fetch(
        `${API_BASE}/occupied-seats?routeId=${encodeURIComponent(route._id)}&date=${encodeURIComponent(searchParams.date)}`
      );
      if (res.ok) {
        const data = await res.json();
        setOccupiedSeats(data.occupied || []);
      } else {
        setOccupiedSeats([]);
      }
    } catch (e) {
      setOccupiedSeats([]);
    }

    setTimeout(() => {
      const el = document.getElementById('seating-chart');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Handle seat clicks
  const handleSeatClick = (seatNum) => {
    if (occupiedSeats.includes(seatNum)) return;

    if (selectedSeats.includes(seatNum)) {
      setSelectedSeats(selectedSeats.filter(s => s !== seatNum));
    } else {
      // Limit to max search seats
      if (selectedSeats.length < searchParams.seats) {
        setSelectedSeats([...selectedSeats, seatNum]);
      } else {
        // Replace first selection or alert
        setSelectedSeats([...selectedSeats.slice(1), seatNum]);
      }
    }
  };

  // Start checkout processing
  const handleCheckoutStart = (e) => {
    e.preventDefault();
    if (selectedSeats.length !== searchParams.seats) {
      alert(`Please select precisely ${searchParams.seats} seats before booking.`);
      return;
    }
    
    // Package booking detail
    setActiveBookingRef({
      route: selectedRoute,
      date: searchParams.date,
      seatNumbers: selectedSeats,
      passengerName: bookingFormData.name,
      passengerAge: parseInt(bookingFormData.age),
      passengerEmail: bookingFormData.email,
      passengerPhone: bookingFormData.phone
    });
    
    setShowPayment(true);
  };

  // Successful payment callback
  const handlePaymentSuccess = async (paymentDetails) => {
    const finalPayload = {
      ...activeBookingRef,
      route: activeBookingRef.route._id, // Send ID only
      ...paymentDetails
    };

    try {
      const res = await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload)
      });
      if (res.ok) {
        const confirmedBooking = await res.json();
        // Refresh records
        await refreshAll();
        setShowPayment(false);
        // Close the listing page and clear the booking panels
        setListingOpen(false);
        setSearchResults(null);
        setSelectedRoute(null);
        setSelectedSeats([]);
        try {
          if (window.location.pathname.startsWith('/search')) window.history.pushState(null, '', '/');
        } catch (e) { /* ignore */ }
        // Display receipt
        setShowTicketReceipt(confirmedBooking);
      } else {
        const data = await res.json();
        alert(`Booking failed: ${data.error || 'Server error'}`);
        setShowPayment(false);
      }
    } catch (err) {
      console.error(err);
      alert('Network error registering booking.');
      setShowPayment(false);
    }
  };

  // Create institutional contract Inquiry
  const handleContractInquirySubmit = async (inquiryData) => {
    try {
      const res = await fetch(`${API_BASE}/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inquiryData)
      });
      if (res.ok) {
        await refreshAll();
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleRentFleetInquiry = (vehicle) => {
    setInquiryVehicle(vehicle);
  };

  const handleInquiryProceed = () => {
    if (!inquiryVehicle) return;
    setInquiryVehicle(null);
    setActiveService('contracts');
    setTimeout(() => {
      const el = document.getElementById('booking');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  };

  // --- ADMIN HANDLERS (all require a valid session token via authFetch) ---

  // Vehicles
  // Admin write handlers all resolve to { ok, error } so the panel can tell the
  // owner whether the change actually reached the database.
  const handleAddVehicle = async (vData) => {
    try {
      const res = await authFetch(`${API_BASE}/vehicles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vData)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data.error || 'Could not add that vehicle.' };
      await refreshAll();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: 'Could not reach the server.' };
    }
  };

  const handleUpdateVehicle = async (id, vData) => {
    try {
      const res = await authFetch(`${API_BASE}/vehicles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vData)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data.error || 'Could not save those changes.' };
      await refreshAll();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: 'Could not reach the server.' };
    }
  };

  // Clients (schools / companies under contract)
  const handleAddClient = async (cData) => {
    try {
      const res = await authFetch(`${API_BASE}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cData)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data.error || 'Could not add that client.' };
      await refreshAll();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: 'Could not reach the server.' };
    }
  };

  const handleDeleteClient = async (id, freeVehicles = false) => {
    try {
      const url = `${API_BASE}/clients/${id}${freeVehicles ? '?freeVehicles=1' : ''}`;
      const res = await authFetch(url, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data.error || 'Could not remove that client.' };
      await refreshAll();
      return { ok: true, freedVehicles: data.freedVehicles || 0 };
    } catch (err) {
      return { ok: false, error: 'Could not reach the server.' };
    }
  };

  const handleDeleteVehicle = async (id) => {
    // Confirmation is handled by the panel's own dialog, not window.confirm.
    try {
      const res = await authFetch(`${API_BASE}/vehicles/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data.error || 'Could not remove that vehicle.' };
      await refreshAll();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: 'Could not reach the server.' };
    }
  };

  // Routes
  const handleAddRoute = async (rData) => {
    try {
      const res = await authFetch(`${API_BASE}/routes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rData)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data.error || 'Could not schedule that route.' };
      await refreshAll();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: 'Could not reach the server.' };
    }
  };

  const handleUpdateRoute = async (id, rData) => {
    try {
      const res = await authFetch(`${API_BASE}/routes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rData)
      });
      if (res.ok) {
        await refreshAll();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRoute = async (id) => {
    // Confirmation is handled by the panel's own dialog, not window.confirm.
    try {
      const res = await authFetch(`${API_BASE}/routes/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data.error || 'Could not delete that route.' };
      await refreshAll();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: 'Could not reach the server.' };
    }
  };

  // Contracts Inquiries Status
  const handleUpdateInquiryStatus = async (id, newStatus) => {
    try {
      const res = await authFetch(`${API_BASE}/inquiries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        await refreshAll();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Render Seating Grid Helper
  const renderSeatGrid = () => {
    if (!selectedRoute) return null;
    const capacity = selectedRoute.vehicle?.capacity || 40;

    // A single seat button
    const seatButton = (num) => {
      const isTaken = occupiedSeats.includes(num);
      const isSelected = selectedSeats.includes(num);
      return (
        <button
          key={num}
          type="button"
          disabled={isTaken}
          onClick={() => handleSeatClick(num)}
          title={isTaken ? `Seat ${num} — booked` : `Seat ${num}`}
          className={`h-9 w-9 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center relative ${
            isTaken
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : isSelected
              ? 'bg-brand-gradient text-white ring-2 ring-brand-navy/40 shadow-md scale-105'
              : 'bg-white text-slate-600 border border-slate-300 hover:border-brand-steel hover:-translate-y-0.5 shadow-sm'
          }`}
        >
          {num}
          <span className="absolute top-0.5 left-1 right-1 h-0.5 rounded-full bg-current opacity-20"></span>
        </button>
      );
    };

    // Chunk seats into rows of 4 with a central aisle (2 + aisle + 2)
    const rows = [];
    for (let i = 1; i <= capacity; i += 4) {
      rows.push([i, i + 1, i + 2, i + 3].filter((n) => n <= capacity));
    }

    return (
      <div className="max-w-[280px] mx-auto bg-slate-50 rounded-[2rem] border-2 border-slate-200 shadow-inner p-5">
        {/* Driver / front-of-bus row */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-dashed border-slate-300">
          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Front</span>
          <div className="w-8 h-8 rounded-full border-4 border-slate-300 border-t-slate-500 flex items-center justify-center">
            <span className="text-[7px] font-extrabold text-slate-400">DRIVER</span>
          </div>
        </div>

        {/* Seat rows with aisle */}
        <div className="space-y-2.5">
          {rows.map((row, ri) => (
            <div key={ri} className="flex items-center justify-center gap-2">
              <div className="flex gap-2">{row.slice(0, 2).map(seatButton)}</div>
              <div className="w-5 flex justify-center">
                <span className="w-px h-6 bg-slate-200"></span>
              </div>
              <div className="flex gap-2">{row.slice(2, 4).map(seatButton)}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      
      {/* Navbar — hidden on the admin sign-in gate, which stands on its own */}
      {!(currentView === 'admin' && !adminUser) && (
        <Navbar
          currentView={currentView}
          setCurrentView={setView}
          activeService={activeService}
          setActiveService={setActiveService}
        />
      )}

      {/* Main View Area */}
      {currentView === 'admin' ? (
        adminUser ? (
          <AdminPanel
            vehicles={vehicles}
            routes={routes}
            bookings={bookings}
            inquiries={inquiries}
            clients={clients}
            adminUser={adminUser}
            onLogout={handleLogout}
            onAddVehicle={handleAddVehicle}
            onUpdateVehicle={handleUpdateVehicle}
            onDeleteVehicle={handleDeleteVehicle}
            onAddClient={handleAddClient}
            onDeleteClient={handleDeleteClient}
            onAddRoute={handleAddRoute}
            onUpdateRoute={handleUpdateRoute}
            onDeleteRoute={handleDeleteRoute}
            onUpdateInquiryStatus={handleUpdateInquiryStatus}
            serviceConfig={serviceConfig}
            onUpdateServiceConfig={async (newConfig) => {
              try {
                const token = localStorage.getItem('twc_admin_token');
                const res = await fetch(`${API_BASE}/settings`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ services: newConfig })
                });
                if (res.ok) {
                  const data = await res.json();
                  setServiceConfig(data.services);
                }
              } catch (err) {
                console.error('Failed to update service config:', err);
              }
            }}
          />
        ) : (
          <AdminLogin
            apiBase={API_BASE}
            onLoginSuccess={handleLoginSuccess}
            onCancel={() => setView('public')}
          />
        )
      ) : currentView === 'about' ? (
        <main className="flex-grow">
          <AboutPage
            onNavigateHome={() => {
              setView('public');
              setActiveService('contracts');
              // Land on the hero with the Fleet Contracts tab open, then pulse the
              // card so it is obvious where the enquiry form is.
              setTimeout(() => {
                const card = Array.from(document.querySelectorAll('[data-booking-card]'))
                  .find((c) => c.offsetHeight > 0);
                if (!card) return;
                card.classList.remove('highlight-pulse');
                void card.offsetWidth;
                card.classList.add('highlight-pulse');
                setTimeout(() => card.classList.remove('highlight-pulse'), 3000);
              }, 120);
            }}
          />
        </main>
      ) : (
        <main className="flex-grow">

          {/* MakeMyTrip-style Hero Form (home only) */}
          {!listingOpen && (
            <HeroBooking
              routes={routes}
              onSearch={handleSearch}
              onContractSubmit={handleContractInquirySubmit}
              activeService={activeService}
              setActiveService={setActiveService}
              serviceConfig={serviceConfig}
            />
          )}

          {/* Dedicated listing page — sticky search summary bar */}
          {listingOpen && searchParams && (
            <div className="bg-brand-navy text-white pt-24 pb-5 shadow-lg">
              <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={closeListing}
                      className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0 transition-colors"
                      aria-label="Back to home"
                      title="Back to home"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <div className="min-w-0">
                      <div className="text-lg sm:text-2xl font-extrabold flex items-center gap-2 truncate">
                        <span>{searchParams.from}</span>
                        <ArrowRight size={18} className="text-sky-300 shrink-0" />
                        <span>{searchParams.to}</span>
                      </div>
                      <div className="text-xs font-semibold text-white/70 mt-0.5">
                        {searchParams.date} · {searchParams.seats} {searchParams.seats > 1 ? 'seats' : 'seat'} · {searchParams.service === 'cabs' ? 'Cabs' : searchParams.service === 'traveler' ? 'Tempo Travellers' : 'Buses'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingSearch((v) => !v)}
                    className={`px-4 sm:px-5 py-2.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                      editingSearch
                        ? 'bg-white/15 text-white hover:bg-white/25'
                        : 'bg-white text-brand-navy hover:shadow-lg'
                    }`}
                  >
                    {editingSearch ? 'Close' : 'Modify Search'}
                  </button>
                </div>

                {/* Inline editable search — refine without leaving the page */}
                {editingSearch && (
                  <div className="mt-4 animate-fade-in">
                    <ListingSearchBar
                      routes={routes}
                      initial={searchParams}
                      onApply={(p) => {
                        runSearch({ ...p, service: searchParams.service }, { pushUrl: true });
                        setEditingSearch(false);
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Search Results Display Section (dedicated listing page only) */}
          {listingOpen && searchResults && (
            <section id="search-results" className="py-16 bg-slate-50 border-b border-slate-200 scroll-mt-20">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

                <BookingSteps current={2} />

                <div className="flex justify-between items-end mb-8">
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-brand-navy tracking-tight">
                      {searchResults.length}{' '}
                      {activeService === 'cabs'
                        ? (searchResults.length === 1 ? 'Cab' : 'Cabs')
                        : activeService === 'traveler'
                        ? (searchResults.length === 1 ? 'Tempo Traveller' : 'Tempo Travellers')
                        : (searchResults.length === 1 ? 'Bus' : 'Buses')}{' '}
                      available
                    </h3>
                    <p className="text-sm font-semibold text-slate-500 mt-1.5 flex items-center gap-1.5">
                      <MapPin size={14} className="text-brand-steel" />
                      {searchParams.from} → {searchParams.to} · {searchParams.date}
                    </p>
                  </div>
                  <button
                    onClick={closeListing}
                    className="text-xs font-bold text-slate-500 hover:text-brand-steel underline underline-offset-2 shrink-0"
                  >
                    Modify search
                  </button>
                </div>

                <div className="space-y-5">
                  {searchResults.length > 0 ? (
                    searchResults.map((route) => {
                      const isSel = selectedRoute?._id === route._id;
                      const duration = getDuration(route.departureTime, route.arrivalTime);
                      return (
                        <div
                          key={route._id}
                          className={`group bg-white rounded-3xl border overflow-hidden transition-all duration-300 flex flex-col sm:flex-row ${
                            isSel
                              ? 'border-brand-steel ring-2 ring-brand-steel/25 shadow-xl'
                              : 'border-slate-200/80 hover:border-brand-steel/40 hover:shadow-xl shadow-sm'
                          }`}
                        >
                          {/* Vehicle image — so the user clearly sees what they're booking */}
                          <div className="relative sm:w-60 h-44 sm:h-auto shrink-0 overflow-hidden bg-slate-200">
                            <img
                              src={getVehicleImage(route.vehicle?.type)}
                              alt={route.vehicle?.modelName}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-brand-navy/70 via-brand-navy/10 to-transparent"></div>
                            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-white/95 text-brand-navy text-[11px] font-extrabold shadow-sm">
                              {route.vehicle?.type}
                            </span>
                            {isSel && (
                              <span className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-brand-steel text-white text-[10px] font-bold flex items-center gap-1">
                                <CheckCircle2 size={12} /> Selected
                              </span>
                            )}
                          </div>

                          {/* Details */}
                          <div className="flex-1 p-5 flex flex-col sm:flex-row justify-between gap-4">
                            <div className="space-y-2.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-lg font-extrabold text-brand-navy leading-tight">{route.vehicle?.modelName}</h4>
                                <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                  {route.vehicle?.plateNumber}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 flex-wrap">
                                <span className="flex items-center gap-1"><Clock size={14} className="text-brand-steel" />{route.departureTime} → {route.arrivalTime}</span>
                                {duration && (<><span className="text-slate-300">•</span><span>{duration}</span></>)}
                                <span className="text-slate-300">•</span>
                                <span className="flex items-center gap-1"><Users size={13} className="text-brand-steel" />{route.vehicle?.capacity} seats</span>
                              </div>

                              {/* Amenities */}
                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {(route.vehicle?.features || []).slice(0, 4).map((f, i) => (
                                  <span key={i} className="px-2 py-0.5 rounded-md bg-brand-light text-slate-600 text-[10px] font-semibold border border-slate-200/80">
                                    {f}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Price + CTA */}
                            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-5 shrink-0">
                              <div className="sm:text-right">
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Per Ticket</span>
                                <span className="text-2xl font-extrabold text-brand-navy">₹{route.price}</span>
                              </div>
                              <button
                                onClick={() => handleSelectRoute(route)}
                                className="px-5 py-2.5 rounded-xl bg-brand-gradient text-white text-xs font-bold transition-all shadow-md shadow-brand-navy/20 hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-1.5 whitespace-nowrap"
                              >
                                <span>{isSel ? 'Change Seats' : 'Select Seats'}</span>
                                <ArrowRight size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-10 text-center bg-white border border-dashed border-slate-300 rounded-3xl">
                      <p className="text-slate-600 font-bold">No direct services scheduled for this route today.</p>
                      <p className="text-xs text-slate-400 mt-2 font-semibold">Try a different origin or destination (e.g. Pinjor → Delhi).</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Interactive Seating & Passenger Details Section (listing page only) */}
          {listingOpen && selectedRoute && (
            <section id="seating-chart" className="py-14 bg-white border-b border-slate-200 scroll-mt-20">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Selected-vehicle summary — makes it crystal-clear what is being booked */}
                <div className="mb-8 bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col sm:flex-row">
                  <div className="relative sm:w-52 h-36 sm:h-auto shrink-0 overflow-hidden bg-slate-200">
                    <img
                      src={getVehicleImage(selectedRoute.vehicle?.type)}
                      alt={selectedRoute.vehicle?.modelName}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-brand-navy/70 via-brand-navy/10 to-transparent"></div>
                    <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-white/95 text-brand-navy text-[10px] font-extrabold shadow-sm">
                      {selectedRoute.vehicle?.type}
                    </span>
                  </div>
                  <div className="flex-1 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-steel">You're booking</span>
                      <h3 className="text-xl font-extrabold text-brand-navy leading-tight">{selectedRoute.vehicle?.modelName}</h3>
                      <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-600 flex-wrap">
                        <span className="flex items-center gap-1"><MapPin size={13} className="text-brand-steel" />{selectedRoute.departure} → {selectedRoute.destination}</span>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1"><Clock size={13} className="text-brand-steel" />{selectedRoute.departureTime}</span>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1"><Calendar size={13} className="text-brand-steel" />{searchParams.date}</span>
                      </div>
                      <span className="inline-block font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded mt-0.5">
                        {selectedRoute.vehicle?.plateNumber}
                      </span>
                    </div>
                    <div className="sm:text-right shrink-0 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-5">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Fare / seat</span>
                      <span className="text-2xl font-extrabold text-brand-navy">₹{selectedRoute.price}</span>
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-extrabold text-brand-navy text-center mb-8">
                  Choose your seats &amp; enter traveller details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  
                  {/* Seating Layout Column */}
                  <div>
                    <h4 className="font-bold text-slate-700 text-center mb-4 uppercase tracking-wider text-xs">Bus Layout</h4>
                    {renderSeatGrid()}
                    
                    {/* Legend */}
                    <div className="flex justify-center gap-6 mt-6 text-xs font-bold text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 bg-white border border-slate-300 rounded"></div>
                        <span>Available</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 bg-slate-300 rounded"></div>
                        <span>Booked</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 bg-brand-steel rounded"></div>
                        <span>Selected</span>
                      </div>
                    </div>
                  </div>

                  {/* Passenger Form Column */}
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
                    <h4 className="font-bold text-slate-800 mb-6 border-b pb-3 flex items-center justify-between">
                      <span>Traveler Information</span>
                      <span className="text-xs text-slate-400 font-bold uppercase">
                        Selected: {selectedSeats.length} / {searchParams.seats} Seats
                      </span>
                    </h4>

                    <form onSubmit={handleCheckoutStart} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Lead Passenger Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="Passenger Full Name"
                          value={bookingFormData.name}
                          onChange={(e) => setBookingFormData({ ...bookingFormData, name: e.target.value })}
                          className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-steel"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Age *</label>
                          <input
                            type="number"
                            required
                            min="5"
                            max="100"
                            placeholder="Age"
                            value={bookingFormData.age}
                            onChange={(e) => setBookingFormData({ ...bookingFormData, age: e.target.value })}
                            className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-steel text-center"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Phone *</label>
                          <input
                            type="tel"
                            required
                            placeholder="Mobile Number"
                            value={bookingFormData.phone}
                            onChange={(e) => setBookingFormData({ ...bookingFormData, phone: e.target.value })}
                            className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-steel"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email *</label>
                        <input
                          type="email"
                          required
                          placeholder="passenger@domain.com"
                          value={bookingFormData.email}
                          onChange={(e) => setBookingFormData({ ...bookingFormData, email: e.target.value })}
                          className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-steel"
                        />
                      </div>

                      <div className="pt-4 space-y-3">
                        {selectedSeats.length > 0 && (
                          <div className="flex items-center justify-between text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                            <span className="font-semibold text-slate-500">
                              Seats <span className="font-mono font-bold text-brand-navy">{selectedSeats.join(', ')}</span>
                            </span>
                            <span className="font-extrabold text-brand-navy">₹{selectedSeats.length * (selectedRoute.price || 0)}</span>
                          </div>
                        )}
                        <button
                          type="submit"
                          className="w-full py-4 rounded-xl bg-brand-gradient text-white font-bold text-sm transition-all shadow-md shadow-brand-navy/20 hover:shadow-lg flex items-center justify-center gap-2"
                        >
                          <span>Proceed to Payment{selectedSeats.length > 0 ? ` · ₹${selectedSeats.length * (selectedRoute.price || 0)}` : ''}</span>
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    </form>
                  </div>

                </div>

              </div>
            </section>
          )}

          {/* Confirmed Ticket Receipt Overlay Modal */}
          {showTicketReceipt && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 shadow-2xl p-6 sm:p-8 animate-fade-in space-y-6 text-center">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-brand-navy">Ticket Booked Successfully!</h3>
                  <p className="text-xs text-slate-400 font-semibold mt-1">Here is your digital journey receipt. Present this to driver.</p>
                </div>

                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-left text-sm relative overflow-hidden bg-slate-50 font-medium">
                  {/* Decorative side notches */}
                  <div className="absolute top-1/2 -left-3 w-6 h-6 rounded-full bg-white border-r border-slate-200 -translate-y-1/2"></div>
                  <div className="absolute top-1/2 -right-3 w-6 h-6 rounded-full bg-white border-l border-slate-200 -translate-y-1/2"></div>
                  
                  <div className="flex justify-between font-bold text-brand-navy text-base pb-3 border-b border-slate-200">
                    <span>TWC Express Ticket</span>
                    <span className="font-mono text-brand-steel text-sm">₹{showTicketReceipt.amountPaid}</span>
                  </div>

                  <div className="py-4 space-y-3 font-semibold text-slate-600 text-xs">
                    <div className="flex justify-between">
                      <span>PASSENGER:</span>
                      <span className="font-bold text-slate-800">{showTicketReceipt.passengerName} (Age: {showTicketReceipt.passengerAge})</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ROUTE:</span>
                      <span className="font-bold text-slate-800">{showTicketReceipt.route?.departure} ➔ {showTicketReceipt.route?.destination}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>DATE / TIME:</span>
                      <span className="font-bold text-slate-800">{showTicketReceipt.date} | {showTicketReceipt.route?.departureTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SEATS ASSIGNED:</span>
                      <span className="font-mono font-bold text-brand-steel text-sm">{showTicketReceipt.seatNumbers?.join(', ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>BUS PLATE NO:</span>
                      <span className="font-mono font-bold text-brand-navy">{showTicketReceipt.route?.vehicle?.plateNumber}</span>
                    </div>
                    <div className="flex justify-between border-t pt-3 font-mono text-[10px]">
                      <span>TRANSACTION REF:</span>
                      <span className="font-bold">{showTicketReceipt.paymentId}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowTicketReceipt(null)}
                  className="w-full py-3 bg-brand-navy hover:bg-brand-steel text-white rounded-xl text-sm font-bold transition-all shadow"
                >
                  Download & Close Ticket
                </button>
              </div>
            </div>
          )}

          {/* Home-only marketing sections (hidden on the dedicated listing page) */}
          {!listingOpen && (
            <>
              {/* Zingbus style marketing highlights */}
              <ZingFeatures />

              {/* School and corporate transport sections */}
              <ContractPartners onOpenAbout={() => setView('about')} />

              {/* Public Rent Showcase */}
              <FleetShowcase
                vehicles={vehicles}
                onSelectVehicleForTrip={handleRentFleetInquiry}
              />
            </>
          )}

        </main>
      )}

      {/* Payment Gateway Dialog */}
      {showPayment && activeBookingRef && (
        <PaymentGateway
          bookingInfo={activeBookingRef}
          onClose={() => setShowPayment(false)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Fleet Inquiry Modal */}
      {inquiryVehicle && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setInquiryVehicle(null); }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
            <div className="h-40 w-full bg-slate-200 relative overflow-hidden">
              <img
                src={getVehicleImage(inquiryVehicle.type)}
                alt={inquiryVehicle.modelName}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/80 via-brand-navy/20 to-transparent" />
              <div className="absolute bottom-3 left-4 text-white">
                <p className="text-lg font-extrabold leading-snug">{inquiryVehicle.modelName}</p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/80 mt-0.5">{inquiryVehicle.plateNumber}</p>
              </div>
            </div>

            <div className="p-5">
              <div className="flex items-center gap-3 rounded-xl bg-sky-50 border border-sky-200/60 px-3.5 py-3">
                <Info size={18} className="text-brand-steel shrink-0" />
                <p className="text-[13px] font-semibold text-brand-navy leading-snug">
                  Fill out the <span className="font-extrabold">Fleet Contracts</span> form and our team will reach out to you within the hour.
                </p>
              </div>

              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setInquiryVehicle(null)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInquiryProceed}
                  className="flex-1 rounded-xl bg-brand-navy py-2.5 text-xs font-bold text-white transition-colors hover:bg-brand-steel flex items-center justify-center gap-1.5"
                >
                  <Calendar size={14} />
                  Fill Inquiry Form
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer — the admin area is a workspace, not a public page */}
      {currentView !== 'admin' && <Footer setCurrentView={setView} />}

    </div>
  );
}
