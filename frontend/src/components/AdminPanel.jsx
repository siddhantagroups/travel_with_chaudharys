import React, { useState } from 'react';
import { Bus, Plus, Trash2, Edit2, Landmark, Users, Tag, Clock, MapPin, Eye, FileText, CheckCircle2, LogOut } from 'lucide-react';

export default function AdminPanel({
  vehicles, routes, bookings, inquiries,
  adminUser, onLogout,
  onAddVehicle, onUpdateVehicle, onDeleteVehicle,
  onAddRoute, onUpdateRoute, onDeleteRoute,
  onUpdateInquiryStatus
}) {
  const [activeTab, setActiveTab] = useState('assignments'); // assignments, vehicles, routes, bookings, contracts
  const [expandedGroup, setExpandedGroup] = useState(null); // Which school/corporate group is expanded
  
  // Modals / Form States
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showAddRoute, setShowAddRoute] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  
  // Reassignment Form State
  const [reassigningVehicle, setReassigningVehicle] = useState(null);
  const [newAssignment, setNewAssignment] = useState('');

  // New Vehicle Form State
  const [vModel, setVModel] = useState('');
  const [vPlate, setVPlate] = useState('');
  const [vType, setVType] = useState('School Bus');
  const [vCapacity, setVCapacity] = useState(40);
  const [vAssigned, setVAssigned] = useState('Available for Public Booking');

  // New Route Form State
  const [rFrom, setRFrom] = useState('Pinjor');
  const [rTo, setRTo] = useState('Delhi');
  const [rDepTime, setRDepTime] = useState('08:00 AM');
  const [rArrTime, setRArrTime] = useState('01:00 PM');
  const [rPrice, setRPrice] = useState(500);
  const [rVehicle, setRVehicle] = useState('');

  // Booking Filters
  const [bookingVehicleFilter, setBookingVehicleFilter] = useState('All');

  // Constants
  const assignments = [
    'Baddi International School',
    'Eicher Parwanoo',
    'Eicher School',
    'DAV School',
    'Available for Public Booking',
    'Maintenance'
  ];

  // Helper to group vehicles by assignment
  const getVehiclesByGroup = (group) => vehicles.filter(v => v.assignedTo === group);

  // Submits
  const handleAddVehicleSubmit = (e) => {
    e.preventDefault();
    if (!vModel || !vPlate) {
      alert('Please fill all fields.');
      return;
    }
    onAddVehicle({
      modelName: vModel,
      plateNumber: vPlate,
      type: vType,
      capacity: parseInt(vCapacity),
      assignedTo: vAssigned,
      features: ['Air Conditioning', 'CCTV', 'GPS Tracking']
    });
    // Reset
    setVModel('');
    setVPlate('');
    setVType('School Bus');
    setVCapacity(40);
    setVAssigned('Available for Public Booking');
    setShowAddVehicle(false);
  };

  const handleAddRouteSubmit = (e) => {
    e.preventDefault();
    const vehicleId = rVehicle || (vehicles.find(v => v.assignedTo === 'Available for Public Booking')?._id);
    if (!vehicleId) {
      alert('You must have at least one vehicle marked "Available for Public Booking" to assign to an intercity route.');
      return;
    }
    onAddRoute({
      departure: rFrom,
      destination: rTo,
      departureTime: rDepTime,
      arrivalTime: rArrTime,
      price: parseInt(rPrice),
      vehicle: vehicleId
    });
    setShowAddRoute(false);
  };

  const startReassignment = (vehicle) => {
    setReassigningVehicle(vehicle);
    setNewAssignment(vehicle.assignedTo);
  };

  const saveReassignment = () => {
    onUpdateVehicle(reassigningVehicle._id, {
      ...reassigningVehicle,
      assignedTo: newAssignment
    });
    setReassigningVehicle(null);
  };

  // Filter Bookings by Vehicle plate
  const filteredBookings = bookingVehicleFilter === 'All'
    ? bookings
    : bookings.filter(b => b.route && b.route.vehicle && b.route.vehicle.plateNumber === bookingVehicleFilter);

  // Vehicles available for routes (only public booking ones)
  const publicVehicles = vehicles.filter(v => v.assignedTo === 'Available for Public Booking');

  return (
    <div className="bg-slate-50 min-h-screen pt-24 pb-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Title */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-extrabold text-brand-navy tracking-tight font-sans">
              Owner Administration Dashboard
            </h2>
            <p className="text-sm font-semibold text-slate-500 mt-1">
              Manage routes, track vehicles, and review institutional service contracts.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                // Auto-set the first available vehicle
                if (publicVehicles.length > 0) setRVehicle(publicVehicles[0]._id);
                setShowAddRoute(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-steel hover:bg-brand-navy text-white text-xs font-bold rounded-xl transition-all shadow-sm"
            >
              <Plus size={16} />
              <span>Add New Route</span>
            </button>
            <button
              onClick={() => setShowAddVehicle(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-navy hover:bg-brand-steel text-white text-xs font-bold rounded-xl transition-all shadow-sm"
            >
              <Plus size={16} />
              <span>Add Vehicle</span>
            </button>

            {/* Signed-in admin + logout */}
            <div className="flex items-center gap-2 pl-2 ml-1 border-l border-slate-200">
              {adminUser?.email && (
                <span className="hidden sm:inline text-[11px] font-bold text-slate-500 max-w-[180px] truncate" title={adminUser.email}>
                  {adminUser.email}
                </span>
              )}
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-xl transition-all shadow-sm"
              >
                <LogOut size={15} />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap border-b border-slate-200 mb-8 gap-2 bg-white p-2 rounded-2xl shadow-sm border">
          <button
            onClick={() => setActiveTab('assignments')}
            className={`px-5 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'assignments' 
                ? 'bg-brand-navy text-white' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Fleet Assignments Grid
          </button>
          <button
            onClick={() => setActiveTab('vehicles')}
            className={`px-5 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'vehicles' 
                ? 'bg-brand-navy text-white' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Vehicle Directory
          </button>
          <button
            onClick={() => setActiveTab('routes')}
            className={`px-5 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'routes' 
                ? 'bg-brand-navy text-white' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Route Manager
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-5 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'bookings' 
                ? 'bg-brand-navy text-white' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Seat Bookings
          </button>
          <button
            onClick={() => setActiveTab('contracts')}
            className={`px-5 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'contracts' 
                ? 'bg-brand-navy text-white' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Contract Inquiries ({inquiries.filter(i => i.status === 'Pending').length} New)
          </button>
        </div>

        {/* ------------------ TAB CONTENT: FLEET ASSIGNMENTS GRID ------------------ */}
        {activeTab === 'assignments' && (
          <div className="space-y-6">
            <div className="bg-brand-light/30 border border-brand-silver/30 p-4 rounded-xl text-sm text-slate-700 font-semibold mb-2">
              💡 Owner Info: Below is your current vehicle distribution. Click on any School or Company group card to view/reassign the specific vehicles present there.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {assignments.map((group) => {
                const groupVehicles = getVehiclesByGroup(group);
                const isExpanded = expandedGroup === group;

                return (
                  <div 
                    key={group} 
                    className={`bg-white rounded-2xl border transition-all duration-300 ${
                      isExpanded 
                        ? 'border-brand-steel ring-2 ring-brand-steel/15 col-span-full' 
                        : 'border-slate-100 hover:border-brand-steel/30 shadow-sm'
                    }`}
                  >
                    {/* Group Card Header */}
                    <div 
                      onClick={() => setExpandedGroup(isExpanded ? null : group)}
                      className="p-6 cursor-pointer flex justify-between items-center"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-100 text-brand-navy rounded-xl">
                          {group.includes('School') ? <GraduationCap size={24} /> : <Landmark size={24} />}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-base">{group}</h4>
                          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                            {groupVehicles.length} {groupVehicles.length === 1 ? 'Vehicle' : 'Vehicles'} Active
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-brand-steel hover:underline">
                        {isExpanded ? 'Collapse' : 'Click to View'}
                      </span>
                    </div>

                    {/* Group Expanded list */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 p-6 bg-slate-50/50">
                        {groupVehicles.length === 0 ? (
                          <p className="text-slate-400 font-bold text-sm text-center py-6">No vehicles currently assigned here.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse">
                              <thead>
                                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-xs">
                                  <th className="pb-3">Plate Number</th>
                                  <th className="pb-3">Model</th>
                                  <th className="pb-3">Type</th>
                                  <th className="pb-3">Capacity</th>
                                  <th className="pb-3 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {groupVehicles.map(vehicle => (
                                  <tr key={vehicle._id} className="hover:bg-slate-100/50 font-medium text-slate-700">
                                    <td className="py-4 font-mono font-bold text-brand-navy">{vehicle.plateNumber}</td>
                                    <td className="py-4">{vehicle.modelName}</td>
                                    <td className="py-4">{vehicle.type}</td>
                                    <td className="py-4">{vehicle.capacity} Seats</td>
                                    <td className="py-4 text-right">
                                      <button
                                        onClick={() => startReassignment(vehicle)}
                                        className="px-3 py-1.5 bg-brand-steel/10 hover:bg-brand-steel text-brand-steel hover:text-white rounded-lg text-xs font-bold transition-all"
                                      >
                                        Reassign Vehicle
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ------------------ TAB CONTENT: VEHICLE DIRECTORY ------------------ */}
        {activeTab === 'vehicles' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-brand-navy">Registered Fleet</h3>
              <span className="text-xs font-bold text-slate-500 uppercase">{vehicles.length} Total Vehicles</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-xs">
                    <th className="p-4">Plate Number</th>
                    <th className="p-4">Model Name</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Capacity</th>
                    <th className="p-4">Current Deployment</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                  {vehicles.map(vehicle => (
                    <tr key={vehicle._id} className="hover:bg-slate-50">
                      <td className="p-4 font-mono text-brand-navy font-bold">{vehicle.plateNumber}</td>
                      <td className="p-4 text-slate-800">{vehicle.modelName}</td>
                      <td className="p-4">{vehicle.type}</td>
                      <td className="p-4">{vehicle.capacity} Seats</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                          vehicle.assignedTo === 'Available for Public Booking'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : vehicle.assignedTo === 'Maintenance'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}>
                          {vehicle.assignedTo}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => onDeleteVehicle(vehicle._id)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors inline-flex"
                          title="Delete Vehicle"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------ TAB CONTENT: ROUTE MANAGER ------------------ */}
        {activeTab === 'routes' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="font-bold text-lg text-brand-navy">Active Intercity Routes</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-xs">
                    <th className="p-4">Route</th>
                    <th className="p-4">Timings</th>
                    <th className="p-4">Price</th>
                    <th className="p-4">Assigned Bus Model</th>
                    <th className="p-4">Bus Plate Number</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                  {routes.map(route => (
                    <tr key={route._id} className="hover:bg-slate-50">
                      <td className="p-4 text-slate-800 font-bold">{route.departure} ➔ {route.destination}</td>
                      <td className="p-4">{route.departureTime} - {route.arrivalTime}</td>
                      <td className="p-4 text-brand-steel">₹{route.price}</td>
                      <td className="p-4">{route.vehicle?.modelName || 'No bus assigned'}</td>
                      <td className="p-4 font-mono font-bold text-slate-700">{route.vehicle?.plateNumber || 'N/A'}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => onDeleteRoute(route._id)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors inline-flex"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------ TAB CONTENT: SEAT BOOKINGS ------------------ */}
        {activeTab === 'bookings' && (
          <div className="space-y-6">
            
            {/* Filter Selection Panel */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-brand-navy">Passenger Manifest Filter</h4>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">Select a specific vehicle plate number to see its travelers.</p>
              </div>
              <div className="w-full sm:w-64">
                <select
                  value={bookingVehicleFilter}
                  onChange={(e) => setBookingVehicleFilter(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-steel font-bold text-slate-700"
                >
                  <option value="All">All Buses & Cabs</option>
                  {vehicles.filter(v => v.assignedTo === 'Available for Public Booking').map(v => (
                    <option key={v._id} value={v.plateNumber}>
                      {v.modelName} ({v.plateNumber})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bookings Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-xs">
                      <th className="p-4">Passenger Info</th>
                      <th className="p-4">Route Info</th>
                      <th className="p-4">Bus Plate</th>
                      <th className="p-4">Seat Numbers</th>
                      <th className="p-4">Payment ID</th>
                      <th className="p-4 text-right">Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                    {filteredBookings.length > 0 ? (
                      filteredBookings.map(b => (
                        <tr key={b._id} className="hover:bg-slate-50">
                          <td className="p-4">
                            <div className="font-bold text-slate-800">{b.passengerName}</div>
                            <div className="text-xs text-slate-400">{b.passengerPhone} | {b.passengerEmail}</div>
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-slate-800">{b.route?.departure} ➔ {b.route?.destination}</div>
                            <div className="text-xs text-slate-400">{b.date} | {b.route?.departureTime}</div>
                          </td>
                          <td className="p-4 font-mono font-bold text-brand-navy">{b.route?.vehicle?.plateNumber || 'N/A'}</td>
                          <td className="p-4 font-mono font-bold text-brand-steel">{b.seatNumbers.join(', ')}</td>
                          <td className="p-4">
                            <div className="text-xs font-mono">{b.paymentId}</div>
                            <span className="inline-block px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] rounded border border-emerald-100 uppercase font-bold mt-1">Paid</span>
                          </td>
                          <td className="p-4 text-right text-slate-800 font-bold">₹{b.amountPaid}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center py-12 font-bold text-slate-400">
                          No passenger bookings recorded for this vehicle.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ------------------ TAB CONTENT: CONTRACT INQUIRIES ------------------ */}
        {activeTab === 'contracts' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="font-bold text-lg text-brand-navy">Institutional Contract Inquiries</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-xs">
                    <th className="p-4">Organization / School</th>
                    <th className="p-4">Contact Applier</th>
                    <th className="p-4">Request Fleet</th>
                    <th className="p-4">Route Detail</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                  {inquiries.map(inq => (
                    <tr key={inq._id} className="hover:bg-slate-50">
                      <td className="p-4 text-slate-800 font-bold">{inq.orgName}</td>
                      <td className="p-4">
                        <div>{inq.contactPerson}</div>
                        <div className="text-xs text-slate-400">{inq.phone}</div>
                      </td>
                      <td className="p-4">{inq.requiredFleetSize} x {inq.vehicleType}</td>
                      <td className="p-4 max-w-xs truncate" title={inq.routeDescription}>{inq.routeDescription}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                          inq.status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : inq.status === 'Pending'
                            ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {inq.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedInquiry(inq)}
                          className="p-2 text-brand-steel hover:bg-slate-100 rounded-lg transition-colors inline-flex"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* ------------------ MODAL: ADD VEHICLE ------------------ */}
      {showAddVehicle && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form onSubmit={handleAddVehicleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border shadow-xl animate-fade-in space-y-4">
            <h3 className="font-extrabold text-xl text-brand-navy">Add New Fleet Vehicle</h3>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Model Name</label>
              <input
                type="text"
                placeholder="e.g. Volvo 9600 Luxury"
                value={vModel}
                onChange={(e) => setVModel(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Registration / Plate Number</label>
              <input
                type="text"
                placeholder="e.g. HR-49-E-9090"
                value={vPlate}
                onChange={(e) => setVPlate(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl font-mono uppercase font-bold"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Vehicle Type</label>
                <select
                  value={vType}
                  onChange={(e) => setVType(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-bold text-slate-700"
                >
                  <option value="School Bus">School Bus</option>
                  <option value="Mini Bus">Mini Bus</option>
                  <option value="Volvo AC Seater">Volvo AC Seater</option>
                  <option value="Sleeper Coach">Sleeper Coach</option>
                  <option value="Luxury SUV / Cab">Luxury SUV / Cab</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Capacity (Seats)</label>
                <input
                  type="number"
                  value={vCapacity}
                  onChange={(e) => setVCapacity(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-semibold"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Initial Deployment Assignment</label>
              <select
                value={vAssigned}
                onChange={(e) => setVAssigned(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl font-bold text-slate-700"
              >
                {assignments.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={() => setShowAddVehicle(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-brand-navy hover:bg-brand-steel text-white rounded-xl text-xs font-bold"
              >
                Save Vehicle
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ------------------ MODAL: ADD ROUTE ------------------ */}
      {showAddRoute && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form onSubmit={handleAddRouteSubmit} className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border shadow-xl animate-fade-in space-y-4">
            <h3 className="font-extrabold text-xl text-brand-navy">Schedule New Intercity Route</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">From</label>
                <input
                  type="text"
                  value={rFrom}
                  onChange={(e) => setRFrom(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">To</label>
                <input
                  type="text"
                  value={rTo}
                  onChange={(e) => setRTo(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-bold"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Dep Time</label>
                <input
                  type="text"
                  placeholder="e.g. 08:30 AM"
                  value={rDepTime}
                  onChange={(e) => setRDepTime(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-semibold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Arr Time</label>
                <input
                  type="text"
                  placeholder="e.g. 01:30 PM"
                  value={rArrTime}
                  onChange={(e) => setRArrTime(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-semibold"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Price (INR)</label>
              <input
                type="number"
                value={rPrice}
                onChange={(e) => setRPrice(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl font-bold text-brand-steel"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Assign Public Bus (Model & Plate)</label>
              <select
                value={rVehicle}
                onChange={(e) => setRVehicle(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl font-bold text-slate-700"
              >
                {publicVehicles.length > 0 ? (
                  publicVehicles.map(v => (
                    <option key={v._id} value={v._id}>
                      {v.modelName} ({v.plateNumber})
                    </option>
                  ))
                ) : (
                  <option value="">No public vehicles available. Reassign one first.</option>
                )}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={() => setShowAddRoute(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-brand-navy hover:bg-brand-steel text-white rounded-xl text-xs font-bold"
              >
                Schedule Route
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ------------------ MODAL: CONTRACT APPLICATION DETAIL ------------------ */}
      {selectedInquiry && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border shadow-xl animate-fade-in space-y-4">
            
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-xl text-brand-navy">Contract Application Profile</h3>
              <button 
                onClick={() => setSelectedInquiry(null)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase">Applying Organization</span>
                <span className="text-base font-extrabold text-slate-800">{selectedInquiry.orgName}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <span className="block text-xs font-bold text-slate-400 uppercase">Contact Person</span>
                  <span className="font-bold text-slate-800">{selectedInquiry.contactPerson}</span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-400 uppercase">Phone Number</span>
                  <span className="font-bold text-slate-800">{selectedInquiry.phone}</span>
                </div>
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase">Contact Email</span>
                <span className="font-bold text-slate-800">{selectedInquiry.email}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <span className="block text-xs font-bold text-slate-400 uppercase">Requested Fleet Size</span>
                  <span className="font-extrabold text-brand-steel">{selectedInquiry.requiredFleetSize} Vehicles</span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-400 uppercase">Vehicle Preference</span>
                  <span className="font-bold text-slate-800">{selectedInquiry.vehicleType}</span>
                </div>
              </div>

              <div className="pt-2">
                <span className="block text-xs font-bold text-slate-400 uppercase">Commute Route Description</span>
                <p className="p-3 bg-slate-50 border rounded-xl font-medium text-slate-700 mt-1 leading-relaxed">
                  {selectedInquiry.routeDescription}
                </p>
              </div>

              {selectedInquiry.notes && (
                <div>
                  <span className="block text-xs font-bold text-slate-400 uppercase">Inquirer Comments</span>
                  <p className="text-slate-600 font-semibold">{selectedInquiry.notes}</p>
                </div>
              )}

              {/* Status Update Form */}
              <div className="pt-4 border-t border-slate-200">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Update Application Status</label>
                <div className="flex gap-2">
                  <select
                    value={selectedInquiry.status}
                    onChange={(e) => {
                      onUpdateInquiryStatus(selectedInquiry._id, e.target.value);
                      setSelectedInquiry({ ...selectedInquiry, status: e.target.value });
                    }}
                    className="flex-1 p-2.5 border border-slate-200 rounded-xl font-bold text-slate-700 bg-white"
                  >
                    <option value="Pending">Pending Review</option>
                    <option value="Under Review">Under Active Review</option>
                    <option value="Approved">Approve Contract</option>
                    <option value="Rejected">Reject Contract</option>
                  </select>
                  <button
                    onClick={() => setSelectedInquiry(null)}
                    className="px-5 py-2.5 bg-brand-navy hover:bg-brand-steel text-white rounded-xl text-xs font-bold"
                  >
                    Done
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ------------------ MODAL: REASSIGNMENT DROPDOWN ------------------ */}
      {reassigningVehicle && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full border shadow-xl animate-fade-in space-y-4">
            <h3 className="font-extrabold text-lg text-brand-navy">Reassign Vehicle</h3>
            <p className="text-xs font-semibold text-slate-400">
              Set deployment assignment for <span className="font-bold font-mono text-slate-700">{reassigningVehicle.plateNumber}</span> ({reassigningVehicle.modelName}).
            </p>
            
            <select
              value={newAssignment}
              onChange={(e) => setNewAssignment(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl font-bold text-slate-700 bg-slate-50"
            >
              {assignments.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReassigningVehicle(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveReassignment}
                className="px-5 py-2 bg-brand-navy hover:bg-brand-steel text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Save Assignment
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Simple placeholder icons since we aren't importing everything from lucide
function GraduationCap(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
      <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
    </svg>
  );
}

function X(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
