-- Migration: Add vehicle_number column to driver_profiles table
-- Date: 2024-01-16

ALTER TABLE driver_profiles ADD COLUMN vehicle_number VARCHAR(20) NULL;
