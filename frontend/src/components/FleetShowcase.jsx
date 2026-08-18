import React, { useState } from 'react';
import { Users, Calendar, ArrowRight } from 'lucide-react';

export default function FleetShowcase({ vehicles, onSelectVehicleForTrip }) {
  const [selectedType, setSelectedType] = useState('All');

  // Filter public vehicles
  const publicVehicles = vehicles.filter(v => v.assignedTo === 'Available for Public Booking');

  const vehicleTypes = ['All', 'AC Coach', 'Seater Bus', 'Tempo Traveller', 'Luxury SUV / Cab'];
  const filteredVehicles = selectedType === 'All'
    ? publicVehicles
    : publicVehicles.filter(v => v.type === selectedType);

  // Real photos of our own vehicles, keyed by plate. Anything without one yet
  // falls back to the type-level stock image below.
  const vehiclePhotos = {
    'HR-49-E-5001': '/vehicle-innova-crysta-grey.jpg',
    'HR-49-F-6001': '/vehicle-chaudhary-ac-coach.jpg',
    'HR-49-F-6002': '/vehicle-chaudhary-transport-bus.jpg',
    'HR-49-G-7001': '/vehicle-innova-crysta.jpg',
    'HR-49-G-7002': '/vehicle-force-traveller.jpg',
  };

  const getVehicleImage = (vehicle) => {
    const own = vehiclePhotos[vehicle.plateNumber];
    if (own) return own;
    if (vehicle.type === 'AC Coach' || vehicle.type === 'Seater Bus') {
      return 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=600';
    }
    return 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600'; // cars & vans
  };

  return (
    <section id="fleet" className="relative py-10 sm:py-14 bg-white overflow-hidden">
      <div className="pointer-events-none absolute top-1/3 right-0 w-48 sm:w-96 h-48 sm:h-96 rounded-full bg-brand-steel/5 blur-3xl"></div>

      <div className="relative max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">

        {/* Title Block */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <span className="inline-flex items-center gap-3 text-[10px] sm:text-[11px] font-bold tracking-[0.25em] uppercase text-brand-steel">
            <span className="h-px w-6 sm:w-8 bg-gradient-to-r from-transparent to-brand-steel/60"></span>
            Our Premium Fleet
            <span className="h-px w-6 sm:w-8 bg-gradient-to-l from-transparent to-brand-steel/60"></span>
          </span>
          <h2 className="mt-4 sm:mt-5 text-2xl sm:text-5xl font-extrabold text-brand-navy tracking-tight leading-[1.1]">
            Rent Our Vehicles for Private Trips &amp; Tours
          </h2>
          <p className="mt-3 sm:mt-5 text-sm sm:text-lg text-slate-500 font-medium leading-relaxed">
            Book our meticulously maintained buses or premium cabs for weddings, pilgrimages, and corporate outings.
          </p>
        </div>

        {/* Filter Badges */}
        <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2.5 mb-8 sm:mb-12">
          {vehicleTypes.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 border ${
                selectedType === type
                  ? 'bg-brand-gradient border-transparent text-white shadow-lg shadow-brand-navy/20'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-brand-steel/40 hover:text-brand-steel'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Vehicles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-7">
          {filteredVehicles.length > 0 ? (
            filteredVehicles.map((vehicle) => (
              <div
                key={vehicle._id}
                className="group bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200/70 shadow-[0_1px_2px_rgba(16,50,87,0.04)] hover:shadow-[0_30px_60px_-24px_rgba(16,50,87,0.35)] hover:-translate-y-1.5 hover:border-brand-steel/30 transition-all duration-300 flex flex-col"
              >
                {/* Vehicle Image */}
                <div className="h-40 sm:h-52 w-full bg-slate-200 relative overflow-hidden">
                  <img
                    src={getVehicleImage(vehicle)}
                    alt={vehicle.modelName}
                    className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-[900ms] ease-out"
                  />
                  {/* Gradient overlay for depth + legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/70 via-brand-navy/10 to-transparent"></div>

                  <div className="absolute top-4 left-4 bg-brand-navy/70 backdrop-blur-md text-brand-silver font-mono text-[11px] font-bold px-2.5 py-1 rounded-lg border border-white/15 uppercase tracking-widest shadow-sm">
                    {vehicle.plateNumber}
                  </div>
                  <div className="absolute bottom-4 left-4 text-white">
                    <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/80">{vehicle.type}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base sm:text-xl font-bold text-brand-navy mb-1.5 sm:mb-2 leading-snug">{vehicle.modelName}</h3>

                    <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 mb-3 sm:mb-5 font-semibold">
                      <Users size={16} className="text-brand-steel" />
                      <span>Seats up to {vehicle.capacity} passengers</span>
                    </div>

                    {/* Features Badges */}
                    <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-4 sm:mb-6">
                      {vehicle.features && vehicle.features.slice(0, 4).map((feat, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 bg-slate-50 text-slate-600 rounded-lg text-[11px] font-semibold border border-slate-200/80"
                        >
                          {feat}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Booking Trigger */}
                  <button
                    onClick={() => onSelectVehicleForTrip(vehicle)}
                    className="group/btn w-full py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-brand-navy hover:bg-brand-steel text-white font-bold text-xs sm:text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-md shadow-brand-navy/15"
                  >
                    <Calendar size={16} />
                    <span>Inquire / Rent Vehicle</span>
                    <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>

              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-16 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
              <p className="text-slate-400 font-bold">No vehicles currently available for public booking in this category.</p>
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
