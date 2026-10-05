/*
  Where a vehicle is assigned, as the owner reads it.

  The stored value for a vehicle that isn't working for any school or company
  is still 'Available for Public Booking' — existing records use it, and the
  website's "Rent Our Vehicles" section lists exactly these vehicles. In the
  admin panel it is shown as "Not on contract", because it has nothing to do
  with the Bus booking switch in Site Settings.
*/
export const PUBLIC = 'Available for Public Booking';
export const MAINTENANCE = 'Maintenance';

export const assignmentLabel = (value) => (value === PUBLIC ? 'Not on contract' : value);
