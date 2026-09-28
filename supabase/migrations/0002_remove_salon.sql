-- Salon has been removed from the product. Drop booking data first because it
-- references salon services, then remove the no-longer-used enum.
drop table if exists salon_bookings;
drop table if exists salon_services;
drop type if exists booking_status;
