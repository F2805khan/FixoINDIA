-- ============================================================
-- fixOindia — Cleanup duplicate camelCase columns
-- ============================================================
-- The migration added camelCase columns but the tables already
-- had snake_case equivalents. This drops the duplicates and
-- relaxes NOT NULL constraints where needed.
-- Run this in Supabase SQL Editor AFTER migrate_schema.sql.
-- ============================================================

-- USERS: drop duplicate camelCase columns (originals: full_name, username, provider, etc.)
ALTER TABLE users DROP COLUMN IF EXISTS "userId";
ALTER TABLE users DROP COLUMN IF EXISTS "authProvider";
ALTER TABLE users DROP COLUMN IF EXISTS "googleId";
ALTER TABLE users DROP COLUMN IF EXISTS "subscriptionStatus";
ALTER TABLE users DROP COLUMN IF EXISTS "otpCode";
ALTER TABLE users DROP COLUMN IF EXISTS "otpExpires";
-- Relax NOT NULL on full_name (some auth flows create user without name initially)
ALTER TABLE users ALTER COLUMN full_name DROP NOT NULL;
ALTER TABLE users ALTER COLUMN full_name SET DEFAULT '';

-- BOOKINGS: drop duplicate camelCase columns (originals: booking_number, user_id, etc.)
ALTER TABLE bookings DROP COLUMN IF EXISTS "bookingId";
ALTER TABLE bookings DROP COLUMN IF EXISTS "userId";
ALTER TABLE bookings DROP COLUMN IF EXISTS "serviceId";
ALTER TABLE bookings DROP COLUMN IF EXISTS "serviceName";
ALTER TABLE bookings DROP COLUMN IF EXISTS "salonName";
ALTER TABLE bookings DROP COLUMN IF EXISTS "customerName";
ALTER TABLE bookings DROP COLUMN IF EXISTS phone;
ALTER TABLE bookings DROP COLUMN IF EXISTS address;
ALTER TABLE bookings DROP COLUMN IF EXISTS date;
ALTER TABLE bookings DROP COLUMN IF EXISTS time;
ALTER TABLE bookings DROP COLUMN IF EXISTS "paymentMethod";
ALTER TABLE bookings DROP COLUMN IF EXISTS "paymentStatus";
ALTER TABLE bookings DROP COLUMN IF EXISTS "bookingStatus";
ALTER TABLE bookings DROP COLUMN IF EXISTS "professionalName";
ALTER TABLE bookings DROP COLUMN IF EXISTS "professionalPhone";
ALTER TABLE bookings DROP COLUMN IF EXISTS "professionalPhoto";
ALTER TABLE bookings DROP COLUMN IF EXISTS "estimatedArrival";
-- Relax NOT NULL on original columns where app can provide nulls
ALTER TABLE bookings ALTER COLUMN booking_number DROP NOT NULL;
ALTER TABLE bookings ALTER COLUMN service_name DROP NOT NULL;
ALTER TABLE bookings ALTER COLUMN customer_name DROP NOT NULL;
ALTER TABLE bookings ALTER COLUMN customer_phone DROP NOT NULL;
ALTER TABLE bookings ALTER COLUMN customer_address DROP NOT NULL;
ALTER TABLE bookings ALTER COLUMN booking_date DROP NOT NULL;
ALTER TABLE bookings ALTER COLUMN booking_time DROP NOT NULL;

-- PAYMENTS: drop duplicate camelCase columns
ALTER TABLE payments DROP COLUMN IF EXISTS "bookingId";
ALTER TABLE payments DROP COLUMN IF EXISTS "transactionId";
ALTER TABLE payments DROP COLUMN IF EXISTS "gatewayOrderId";
-- Add gateway_order_id if missing
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_order_id text;
-- Relax booking_id NOT NULL (app sometimes creates without FK)
ALTER TABLE payments ALTER COLUMN booking_id DROP NOT NULL;
ALTER TABLE payments ALTER COLUMN booking_number DROP NOT NULL;

-- AUTH_EVENTS: drop duplicate camelCase columns
ALTER TABLE auth_events DROP COLUMN IF EXISTS "userId";
ALTER TABLE auth_events DROP COLUMN IF EXISTS "eventType";
ALTER TABLE auth_events DROP COLUMN IF EXISTS "ipAddress";
ALTER TABLE auth_events DROP COLUMN IF EXISTS "userAgent";
-- Relax NOT NULL constraints
ALTER TABLE auth_events ALTER COLUMN event_type DROP NOT NULL;
ALTER TABLE auth_events ALTER COLUMN provider DROP NOT NULL;
-- Drop check constraints that restrict enum values
DO $$ BEGIN
  ALTER TABLE auth_events DROP CONSTRAINT IF EXISTS auth_events_event_type_check;
  ALTER TABLE auth_events DROP CONSTRAINT IF EXISTS auth_events_provider_check;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Constraint drop skipped: %', SQLERRM;
END $$;

-- SERVICES: drop duplicate camelCase columns (originals: service_name, image_url, etc.)
ALTER TABLE services DROP COLUMN IF EXISTS title;
ALTER TABLE services DROP COLUMN IF EXISTS image;
ALTER TABLE services DROP COLUMN IF EXISTS region;
ALTER TABLE services DROP COLUMN IF EXISTS enabled;
-- Relax NOT NULL
ALTER TABLE services ALTER COLUMN service_name DROP NOT NULL;
ALTER TABLE services ALTER COLUMN category DROP NOT NULL;

-- BEAUTY_ARTISTS: these only have our new columns, no cleanup needed

-- SUPPORT_MESSAGES: these only have our new columns, no cleanup needed

-- ============================================================
-- Done! Duplicates removed, constraints relaxed.
-- ============================================================
