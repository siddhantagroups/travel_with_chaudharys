import React, { useState, useCallback } from 'react';
import { Bus, Plus, Trash2, Edit2, Landmark, Users, Tag, Clock, MapPin, Eye, FileText, CheckCircle2, LogOut, Settings } from 'lucide-react';
import FleetWorkspace from './FleetWorkspace';
import ConfirmDialog from './ConfirmDialog';
import Toasts from './Toasts';

export default function AdminPanel({
  vehicles, routes, bookings, inquiries, clients = [],
  adminUser, onLogout,
  onAddVehicle, onUpdateVehicle, onDeleteVehicle,
  onAddClient, onDeleteClient,
  onAddRoute, onUpdateRoute, onDeleteRoute,
  onUpdateInquiryStatus,
  serviceConfig, onUpdateServiceConfig
}) {
  const [activeTab, setActiveTab] = useState('fleet'); // fleet, assignments, routes, bookings, contracts, settings
  const [expandedGroup, setExpandedGroup] = useState(null); // Which school/corporate group is expanded
  
  // Modals / Form States
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showAddRoute, setShowAddRoute] = useState(false);
  const [showClients, setShowClients] = useState(false);
  const [cName, setCName] = useState('');
  const [cKind, setCKind] = useState('School');
  const [cError, setCError] = useState('');
  const [confirmAction, setConfirmAction] = useState(null); // { title, message, detail, confirmLabel, run }
  const [formNotice, setFormNotice] = useState(''); // inline validation, never window.alert
  const [toasts, setToasts] = useState([]);

  const notify = useCallback((title, detail, tone = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list.slice(-2), { id, title, detail, tone }]);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  // Runs a write handler and reports the outcome either way.
  const runWrite = async (promise, successTitle, successDetail, failTitle) => {
    const result = await promise;
    if (result?.ok === false) {
      notify(failTitle, result.error, 'error');
      return result;
    }
    notify(successTitle, successDetail);
    return result ?? { ok: true };
  };
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

  // Two fixed states plus whatever clients the owner has added. Any vehicle
  // still on a since-removed client keeps showing up, so nothing gets hidden.
  const orphaned = vehicles
    .map(v => v.assignedTo)
    .filter(a => a && a !== 'Available for Public Booking' && a !== 'Maintenance'
      && !clients.some(c => c.name === a));

  const assignments = [
    'Available for Public Booking',
    ...clients.map(c => c.name),
    ...[...new Set(orphaned)],
    'Maintenance'
  ];

  // Helper to group vehicles by assignment
  const getVehiclesByGroup = (group) => vehicles.filter(v => v.assignedTo === group);

  // Submits
  const handleAddVehicleSubmit = (e) => {
    e.preventDefault();
    if (!vModel || !vPlate) {
      setFormNotice('Add a model name and a plate number before saving.');
      return;
    }
    setFormNotice('');
    runWrite(
      onAddVehicle({
        modelName: vModel,
        plateNumber: vPlate,
        type: vType,
        capacity: parseInt(vCapacity),
        assignedTo: vAssigned,
        features: ['Air Conditioning', 'CCTV', 'GPS Tracking']
      }),
      'Vehicle added to your fleet',
      `${vPlate.toUpperCase()} · ${vModel} — ${vAssigned}`,
      'Could not add that vehicle'
    );
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
      setFormNotice('Mark at least one vehicle as “Available for Public Booking” first — an intercity route needs a bus to run on.');
      return;
    }
    setFormNotice('');
    runWrite(
      onAddRoute({
        departure: rFrom,
        destination: rTo,
        departureTime: rDepTime,
        arrivalTime: rArrTime,
        price: parseInt(rPrice),
        vehicle: vehicleId
      }),
      'Route scheduled',
      `${rFrom} → ${rTo} · ${rDepTime} · ₹${rPrice}`,
      'Could not schedule that route'
    );
    setShowAddRoute(false);
  };

  const handleAddClientSubmit = async (e) => {
    e.preventDefault();
    setCError('');
    const name = cName.trim();
    if (!name) return;
    const result = await onAddClient({ name, kind: cKind });
    if (result?.ok) {
      setCName('');
      setCKind('School');
      notify(
        `${name} added`,
        `Saved as a ${cKind.toLowerCase()}. You can now assign vehicles to them.`
      );
    } else {
      setCError(result?.error || 'Could not add that client.');
      notify('Could not add that client', result?.error, 'error');
    }
  };

  const handleRemoveClient = (client) => {
    const inUse = vehicles.filter(v => v.assignedTo === client.name).length;
    setCError('');
    setConfirmAction({
      title: 'Remove this contract?',
      message: inUse > 0
        ? `${inUse} vehicle${inUse === 1 ? '' : 's'} still run for them, so this will be refused until you move ${inUse === 1 ? 'it' : 'them'} elsewhere.`
        : 'They will no longer appear when assigning a vehicle.',
      detail: { primary: client.name, secondary: `${client.kind} · ${inUse} ${inUse === 1 ? 'vehicle' : 'vehicles'}` },
      confirmLabel: 'Remove',
      run: async () => {
        const result = await onDeleteClient(client._id);
        if (!result?.ok) {
          setCError(result?.error || 'Could not remove that client.');
          notify('Could not remove that contract', result?.error, 'error');
        } else {
          notify(`${client.name} removed`, 'They no longer appear when assigning a vehicle.');
        }
      },
    });
  };

  // Removing a contract from the assignments board. With buses still on it the
  // wording spells out exactly where they land, and the button says so too —
  // this is the one action that quietly rewrites other records.
  const askRemoveContract = (groupName) => {
    const client = clients.find(c => c.name === groupName);
    if (!client) return;
    const onIt = vehicles.filter(v => v.assignedTo === groupName);
    const count = onIt.length;

    setConfirmAction({
      title: count === 0 ? 'Remove this contract?' : `Remove contract and free ${count} vehicle${count === 1 ? '' : 's'}?`,
      message: count === 0
        ? 'They will no longer appear when assigning a vehicle.'
        : `${count === 1 ? 'This bus' : `All ${count} buses`} will move to “Available for Public Booking”, where you can reassign ${count === 1 ? 'it' : 'them'}. This can’t be undone.`,
      detail: {
        primary: groupName,
        secondary: count === 0
          ? `${client.kind} · no vehicles assigned`
          : onIt.map(v => v.plateNumber).join(', '),
      },
      confirmLabel: count === 0 ? 'Remove' : `Free ${count} & remove`,
      run: async () => {
        const result = await onDeleteClient(client._id, count > 0);
        if (!result?.ok) {
          notify('Could not remove that contract', result?.error, 'error');
          return;
        }
        if (expandedGroup === groupName) setExpandedGroup(null);
        notify(
          `${groupName} removed`,
          count === 0
            ? 'The contract is no longer listed.'
            : `${count} vehicle${count === 1 ? '' : 's'} moved to Available for Public Booking.`
        );
      },
    });
  };

  const askDeleteRoute = (route) => {
    setConfirmAction({
      title: 'Delete this route?',
      message: 'The scheduled service will be removed from the public site. This can’t be undone.',
      detail: {
        primary: `${route.departure} → ${route.destination}`,
        secondary: `${route.departureTime} – ${route.arrivalTime} · ₹${route.price}`,
      },
      confirmLabel: 'Delete route',
      run: () => runWrite(
        onDeleteRoute(route._id),
        'Route deleted',
        `${route.departure} → ${route.destination} is no longer offered.`,
        'Could not delete that route'
      ),
    });
  };

  const startReassignment = (vehicle) => {
    setReassigningVehicle(vehicle);
    setNewAssignment(vehicle.assignedTo);
  };

  const saveReassignment = () => {
    runWrite(
      onUpdateVehicle(reassigningVehicle._id, { ...reassigningVehicle, assignedTo: newAssignment }),
      'Vehicle reassigned',
      `${reassigningVehicle.plateNumber} now runs for ${newAssignment}.`,
      'Could not reassign that vehicle'
    );
    setReassigningVehicle(null);
  };

  // Filter Bookings by Vehicle plate
  const filteredBookings = bookingVehicleFilter === 'All'
    ? bookings
    : bookings.filter(b => b.route && b.route.vehicle && b.route.vehicle.plateNumber === bookingVehicleFilter);

  // Vehicles available for routes (only public booking ones)
  const publicVehicles = vehicles.filter(v => v.assignedTo === 'Available for Public Booking');

  const pendingInquiries = inquiries.filter(i => i.status === 'Pending').length;

  return (
    <div className="bg-slate-50 min-h-screen pt-20 sm:pt-24 pb-6 sm:pb-10 px-3 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Header Title */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4 mb-4 sm:mb-6">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-brand-navy tracking-tight font-sans">
              Owner Dashboard
            </h2>
            <p className="hidden sm:block text-sm font-semibold text-slate-500 mt-1">
              Manage routes, track vehicles, and review institutional service contracts.
            </p>
          </div>
          {/* Actions stay on one line at every width — they scroll sideways on
              a phone rather than stacking into a wall of buttons. */}
          <div className="flex w-full md:w-auto items-center gap-2 overflow-x-auto no-scrollbar -mx-3 px-3 md:mx-0 md:px-0">
            <button
              onClick={() => {
                // Auto-set the first available vehicle
                if (publicVehicles.length > 0) setRVehicle(publicVehicles[0]._id);
                setShowAddRoute(true);
              }}
              className="shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-2.5 bg-brand-steel hover:bg-brand-navy text-white text-xs font-bold rounded-xl transition-all shadow-sm"
            >
              <Plus size={16} />
              <span className="sm:hidden">Route</span>
              <span className="hidden sm:inline">Add New Route</span>
            </button>
            <button
              onClick={() => setShowAddVehicle(true)}
              className="shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-2.5 bg-brand-navy hover:bg-brand-steel text-white text-xs font-bold rounded-xl transition-all shadow-sm"
            >
              <Plus size={16} />
              <span className="sm:hidden">Vehicle</span>
              <span className="hidden sm:inline">Add Vehicle</span>
            </button>
            <button
              onClick={() => { setShowClients(true); setCError(''); }}
              className="shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-2.5 bg-brand-navy hover:bg-brand-steel text-white text-xs font-bold rounded-xl transition-all shadow-sm"
            >
              <Plus size={16} />
              <span className="sm:hidden">School</span>
              <span className="hidden sm:inline">Add School / Company</span>
            </button>
            {/* Not an "add" action, so it reads as a neutral control rather than
                sharing the solid navy of the create buttons beside it. */}
            <button
              onClick={() => setActiveTab('settings')}
              className="shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-2.5 bg-white hover:bg-slate-50 text-brand-navy border border-slate-200 text-xs font-bold rounded-xl transition-all shadow-sm"
            >
              <Settings size={16} />
              <span className="sm:hidden">Settings</span>
              <span className="hidden sm:inline">Site Settings</span>
            </button>

            {/* Signed-in admin + logout */}
            <div className="shrink-0 flex items-center gap-2 pl-2 ml-auto md:ml-1 border-l border-slate-200">
              {adminUser?.email && (
                <span className="hidden lg:inline text-[11px] font-bold text-slate-500 max-w-[180px] truncate" title={adminUser.email}>
                  {adminUser.email}
                </span>
              )}
              <button
                onClick={onLogout}
                aria-label="Sign out"
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-xl transition-all shadow-sm"
              >
                <LogOut size={15} />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation tabs — a single scrollable strip so they never stack into
            rows on a phone. Short labels below sm, full labels above. */}
        <div className="flex mb-4 sm:mb-6 gap-1.5 sm:gap-2 bg-white p-1.5 sm:p-2 rounded-2xl shadow-sm border border-slate-200 overflow-x-auto no-scrollbar">
          {[
            { id: 'fleet', short: 'Fleet', full: 'My Fleet' },
            { id: 'assignments', short: 'Schools', full: 'Assignments by School' },
            { id: 'routes', short: 'Routes', full: 'Route Manager' },
            { id: 'bookings', short: 'Bookings', full: 'Seat Bookings' },
            {
              id: 'contracts',
              short: `Inquiries${pendingInquiries ? ` (${pendingInquiries})` : ''}`,
              full: `Contract Inquiries (${pendingInquiries} New)`,
            },
            // Site Settings is reached from the header action row instead of
            // getting a tab here — it configures the site rather than being
            // another view of fleet data.
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`shrink-0 whitespace-nowrap px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === t.id
                  ? 'bg-brand-navy text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="sm:hidden">{t.short}</span>
              <span className="hidden sm:inline">{t.full}</span>
            </button>
          ))}
        </div>

        {/* ------------------ TAB CONTENT: MY FLEET (search → full picture) ------------------ */}
        {activeTab === 'fleet' && (
          <FleetWorkspace
            vehicles={vehicles}
            routes={routes}
            bookings={bookings}
            assignments={assignments}
            notify={notify}
            onAddVehicle={onAddVehicle}
            onUpdateVehicle={onUpdateVehicle}
            onDeleteVehicle={onDeleteVehicle}
          />
        )}

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
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs font-bold text-brand-steel hover:underline">
                          {isExpanded ? 'Collapse' : 'Click to View'}
                        </span>
                        {/* Only real contracts can be removed — the two fixed
                            states aren't clients. */}
                        {clients.some(c => c.name === group) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); askRemoveContract(group); }}
                            title={`Remove ${group}`}
                            aria-label={`Remove ${group}`}
                            className="ml-1 p-2 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Group Expanded list */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 p-6 bg-slate-50/50">
                        {groupVehicles.length === 0 ? (
                          <p className="text-slate-400 font-bold text-sm text-center py-6">No vehicles currently assigned here.</p>
                        ) : (
                          <>
                          {/* Phone: cards instead of a table inside the group */}
                          <ul className="sm:hidden space-y-2">
                            {groupVehicles.map(vehicle => (
                              <li key={vehicle._id} className="rounded-xl bg-white border border-slate-100 p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="font-mono text-sm font-bold text-brand-navy">{vehicle.plateNumber}</p>
                                    <p className="text-[11px] font-semibold text-slate-500 truncate">
                                      {vehicle.modelName} · {vehicle.capacity} seats
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => startReassignment(vehicle)}
                                    className="shrink-0 px-3 py-1.5 bg-brand-steel/10 hover:bg-brand-steel text-brand-steel hover:text-white rounded-lg text-[11px] font-bold transition-all"
                                  >
                                    Reassign
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>

                          <div className="hidden sm:block overflow-x-auto">
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
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ------------------ TAB CONTENT: ROUTE MANAGER ------------------ */}
        {activeTab === 'routes' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-100">
              <h3 className="font-bold text-base sm:text-lg text-brand-navy">Active Intercity Routes</h3>
            </div>

            {/* Phone: one card per route instead of a table you must drag sideways */}
            <ul className="sm:hidden divide-y divide-slate-100">
              {routes.length === 0 && (
                <li className="p-4 text-sm font-semibold text-slate-500">No routes yet.</li>
              )}
              {routes.map(route => (
                <li key={route._id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-sm">{route.departure} ➔ {route.destination}</p>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">
                        {route.departureTime} – {route.arrivalTime}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-extrabold text-brand-steel">₹{route.price}</span>
                      <button
                        onClick={() => askDeleteRoute(route)}
                        aria-label="Delete route"
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold text-slate-500">
                    <span className="font-mono font-bold text-slate-700">{route.vehicle?.plateNumber || 'No bus'}</span>
                    <span className="text-slate-300">·</span>
                    <span className="truncate">{route.vehicle?.modelName || 'No bus assigned'}</span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden sm:block overflow-x-auto">
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
                          onClick={() => askDeleteRoute(route)}
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
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div>
                <h4 className="font-bold text-brand-navy text-sm sm:text-base">Passenger Manifest Filter</h4>
                <p className="hidden sm:block text-xs font-semibold text-slate-400 mt-0.5">Select a specific vehicle plate number to see its travelers.</p>
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
              {/* Phone: each booking as a card */}
              <ul className="sm:hidden divide-y divide-slate-100">
                {filteredBookings.length === 0 && (
                  <li className="p-6 text-center text-sm font-bold text-slate-400">
                    No passenger bookings recorded for this vehicle.
                  </li>
                )}
                {filteredBookings.map(b => (
                  <li key={b._id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-sm truncate">{b.passengerName}</p>
                        <p className="text-[11px] font-semibold text-slate-400 truncate">{b.passengerPhone}</p>
                      </div>
                      <span className="shrink-0 text-sm font-extrabold text-slate-800">₹{b.amountPaid}</span>
                    </div>
                    <p className="mt-2 text-xs font-bold text-slate-700">
                      {b.route?.departure} ➔ {b.route?.destination}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-400">{b.date} | {b.route?.departureTime}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                      <span className="font-mono font-bold text-brand-navy">{b.route?.vehicle?.plateNumber || 'N/A'}</span>
                      <span className="font-mono font-bold text-brand-steel">Seat {b.seatNumbers.join(', ')}</span>
                      <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] rounded border border-emerald-100 uppercase font-bold">Paid</span>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="hidden sm:block overflow-x-auto">
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
            <div className="p-4 sm:p-6 border-b border-slate-100">
              <h3 className="font-bold text-base sm:text-lg text-brand-navy">Institutional Contract Inquiries</h3>
            </div>

            {/* Six columns don't fit a tablet either, so cards run up to lg */}
            <ul className="lg:hidden divide-y divide-slate-100">
              {inquiries.length === 0 && (
                <li className="p-6 text-center text-sm font-bold text-slate-400">No inquiries yet.</li>
              )}
              {inquiries.map(inq => (
                <li key={inq._id}>
                  <button onClick={() => setSelectedInquiry(inq)} className="w-full p-4 text-left active:bg-slate-50">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 font-bold text-slate-800 text-sm truncate">{inq.orgName}</p>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        inq.status === 'Approved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : inq.status === 'Pending'
                          ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {inq.status}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] font-semibold text-slate-500">
                      {inq.contactPerson} · {inq.phone}
                    </p>
                    <p className="mt-1.5 text-[11px] font-bold text-brand-steel">
                      {inq.requiredFleetSize} × {inq.vehicleType}
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold text-slate-400 truncate">{inq.routeDescription}</p>
                  </button>
                </li>
              ))}
            </ul>

            <div className="hidden lg:block overflow-x-auto">
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

        {/* ------------------ TAB CONTENT: SITE SETTINGS ------------------ */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-100">
              <h3 className="font-bold text-base sm:text-lg text-brand-navy">Service Availability</h3>
              <p className="text-xs text-slate-500 font-semibold mt-1">Toggle booking services on or off. When off, visitors see your custom message instead of the booking form.</p>
            </div>
            <div className="divide-y divide-slate-100">
              {[
                { id: 'buses', label: 'Bus Booking' },
                { id: 'cabs', label: 'Cab Booking' },
                { id: 'traveler', label: 'Traveller Booking' },
              ].map((svc) => {
                const cfg = serviceConfig?.[svc.id] || { enabled: true, message: '' };
                return (
                  <div key={svc.id} className="p-4 sm:p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-bold text-sm text-slate-800">{svc.label}</p>
                        <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                          {cfg.enabled ? 'Visible to visitors — booking form is active' : 'Hidden — visitors see unavailability message'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateServiceConfig({
                            [svc.id]: { enabled: !cfg.enabled, message: cfg.message }
                          });
                        }}
                        className={`relative w-12 h-7 rounded-full transition-colors duration-200 shrink-0 ${cfg.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${cfg.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                    {!cfg.enabled && (
                      <div className="mt-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Message shown to visitors</label>
                        <textarea
                          value={cfg.message}
                          onChange={(e) => {
                            onUpdateServiceConfig({
                              [svc.id]: { enabled: cfg.enabled, message: e.target.value }
                            });
                          }}
                          rows={2}
                          className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-brand-steel resize-none"
                          placeholder="e.g. Bus booking will resume next week."
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* ------------------ MODAL: ADD VEHICLE ------------------ */}
      {/* ---------- Schools & companies under contract ---------- */}
      {showClients && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border shadow-xl animate-fade-in">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-xl text-brand-navy">Schools &amp; companies</h3>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                  Add the organisations you hold contracts with. They become available when assigning a vehicle.
                </p>
              </div>
              <button
                onClick={() => setShowClients(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 shrink-0"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddClientSubmit} className="mt-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Name</label>
                <input
                  type="text"
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  placeholder="e.g. International Public School"
                  aria-label="New client name"
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-medium"
                  required
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Type</label>
                  <select
                    value={cKind}
                    onChange={(e) => setCKind(e.target.value)}
                    aria-label="Client type"
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-bold text-slate-700"
                  >
                    <option value="School">School</option>
                    <option value="Company">Company</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="self-end px-6 py-2.5 bg-brand-navy hover:bg-brand-steel text-white text-xs font-bold rounded-xl transition-all"
                >
                  Add
                </button>
              </div>
            </form>

            {cError && (
              <p className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold leading-relaxed">
                {cError}
              </p>
            )}

            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Current contracts ({clients.length})
              </p>
              {clients.length === 0 ? (
                <p className="text-xs text-slate-500 font-semibold py-2">No schools or companies added yet.</p>
              ) : (
                <ul className="space-y-1 max-h-56 overflow-y-auto">
                  {clients.map((c) => {
                    const inUse = vehicles.filter((v) => v.assignedTo === c.name).length;
                    return (
                      <li key={c._id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-bold text-slate-700">{c.name}</span>
                          <span className="text-[10px] font-semibold text-slate-400">
                            {c.kind} · {inUse} {inUse === 1 ? 'vehicle' : 'vehicles'}
                          </span>
                        </span>
                        <button
                          onClick={() => handleRemoveClient(c)}
                          title={inUse > 0 ? 'Move its vehicles first' : 'Remove'}
                          className="shrink-0 p-1.5 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <button
              onClick={() => setShowClients(false)}
              className="mt-5 w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {showAddVehicle && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form onSubmit={handleAddVehicleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border shadow-xl animate-fade-in space-y-4">
            <h3 className="font-extrabold text-xl text-brand-navy">Add New Fleet Vehicle</h3>
            {formNotice && (
              <p className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold leading-relaxed">
                {formNotice}
              </p>
            )}

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
            {formNotice && (
              <p className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold leading-relaxed">
                {formNotice}
              </p>
            )}

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

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.title}
        message={confirmAction?.message}
        detail={confirmAction?.detail}
        confirmLabel={confirmAction?.confirmLabel}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          const action = confirmAction;
          setConfirmAction(null);
          action?.run?.();
        }}
      />

      <Toasts toasts={toasts} onDismiss={dismissToast} />

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
