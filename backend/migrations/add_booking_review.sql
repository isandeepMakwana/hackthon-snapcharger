-- Add rating and review columns to bookings table
ALTER TABLE bookings ADD COLUMN rating INTEGER;
ALTER TABLE bookings ADD COLUMN review TEXT;
