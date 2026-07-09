-- ============================================================
-- fixOindia — Complete Supabase Schema Migration
-- ============================================================
-- Safe to run multiple times (idempotent).
-- Uses IF NOT EXISTS for tables and columns.
-- Run this in Supabase SQL Editor (Dashboard → SQL → New query).
-- ============================================================

-- ============================================================
-- 0. Helper: auto-update "updated_at" trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. USERS table
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text,
  email        text,
  phone        text,
  "userId"     text,
  password     text,
  address      text DEFAULT '',
  city         text DEFAULT '',
  latitude     double precision,
  longitude    double precision,
  role         text DEFAULT 'user',
  "authProvider" text DEFAULT 'password',
  "googleId"   text,
  "subscriptionStatus" text DEFAULT 'active',
  "otpCode"    text,
  "otpExpires" timestamptz,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- Add columns that might be missing if table already exists
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS name text;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS email text;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS "userId" text;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS password text;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS address text DEFAULT '';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS city text DEFAULT '';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude double precision;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude double precision;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS "authProvider" text DEFAULT 'password';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS "googleId" text;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS "subscriptionStatus" text DEFAULT 'active';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS "otpCode" text;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS "otpExpires" timestamptz;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
  ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
END $$;

-- Unique constraints (safe: won't fail if already exist)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_email_unique') THEN
    ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_phone_unique') THEN
    ALTER TABLE users ADD CONSTRAINT users_phone_unique UNIQUE (phone);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_userid_unique') THEN
    ALTER TABLE users ADD CONSTRAINT users_userid_unique UNIQUE ("userId");
  END IF;
END $$;

-- updated_at trigger
DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. SERVICES table
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text,
  price        numeric,
  category     text,
  description  text,
  image        text,
  duration     text,
  rating       numeric,
  region       text DEFAULT 'All Regions',
  enabled      boolean DEFAULT true,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE services ADD COLUMN IF NOT EXISTS title text;
  ALTER TABLE services ADD COLUMN IF NOT EXISTS price numeric;
  ALTER TABLE services ADD COLUMN IF NOT EXISTS category text;
  ALTER TABLE services ADD COLUMN IF NOT EXISTS description text;
  ALTER TABLE services ADD COLUMN IF NOT EXISTS image text;
  ALTER TABLE services ADD COLUMN IF NOT EXISTS duration text;
  ALTER TABLE services ADD COLUMN IF NOT EXISTS rating numeric;
  ALTER TABLE services ADD COLUMN IF NOT EXISTS region text DEFAULT 'All Regions';
  ALTER TABLE services ADD COLUMN IF NOT EXISTS enabled boolean DEFAULT true;
  ALTER TABLE services ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
  ALTER TABLE services ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
END $$;

DROP TRIGGER IF EXISTS services_updated_at ON services;
CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 3. BOOKINGS table
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "bookingId"         text,
  "userId"            uuid,
  "serviceId"         uuid,
  "serviceName"       text,
  "salonName"         text DEFAULT '',
  "customerName"      text,
  phone               text,
  address             text,
  date                text,
  time                text,
  amount              numeric,
  "paymentMethod"     text DEFAULT 'UPI',
  "paymentStatus"     text DEFAULT 'Pending',
  "bookingStatus"     text DEFAULT 'Confirmed',
  "professionalName"  text,
  "professionalPhone" text,
  "professionalPhoto" text,
  "estimatedArrival"  text,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "bookingId" text;
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "userId" uuid;
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "serviceId" uuid;
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "serviceName" text;
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "salonName" text DEFAULT '';
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "customerName" text;
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS phone text;
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS address text;
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS date text;
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS time text;
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS amount numeric;
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS subtotal_amount numeric;
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS coupon_code text DEFAULT '';
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "paymentMethod" text DEFAULT 'UPI';
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "paymentStatus" text DEFAULT 'Pending';
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "bookingStatus" text DEFAULT 'Confirmed';
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "professionalName" text;
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "professionalPhone" text;
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "professionalPhoto" text;
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "estimatedArrival" text;
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
END $$;

-- Unique constraint on bookingId
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_bookingid_unique') THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_bookingid_unique UNIQUE ("bookingId");
  END IF;
END $$;

-- Foreign keys (safe — won't error if already exist)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_userid_fk') THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_userid_fk
      FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_serviceid_fk') THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_serviceid_fk
      FOREIGN KEY ("serviceId") REFERENCES services(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Foreign key creation skipped: %', SQLERRM;
END $$;

DROP TRIGGER IF EXISTS bookings_updated_at ON bookings;
CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. PAYMENTS table
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "bookingId"     text,
  amount          numeric,
  method          text,
  status          text DEFAULT 'Pending',
  "transactionId" text,
  "gatewayOrderId" text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS "bookingId" text;
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount numeric;
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS method text;
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS status text DEFAULT 'Pending';
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS "transactionId" text;
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS "gatewayOrderId" text;
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
END $$;

DROP TRIGGER IF EXISTS payments_updated_at ON payments;
CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 5. AUTH_EVENTS table
-- ============================================================
CREATE TABLE IF NOT EXISTS auth_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"    uuid,
  "eventType" text,
  provider    text,
  email       text,
  "ipAddress" text,
  "userAgent" text,
  created_at  timestamptz DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE auth_events ADD COLUMN IF NOT EXISTS "userId" uuid;
  ALTER TABLE auth_events ADD COLUMN IF NOT EXISTS "eventType" text;
  ALTER TABLE auth_events ADD COLUMN IF NOT EXISTS provider text;
  ALTER TABLE auth_events ADD COLUMN IF NOT EXISTS email text;
  ALTER TABLE auth_events ADD COLUMN IF NOT EXISTS "ipAddress" text;
  ALTER TABLE auth_events ADD COLUMN IF NOT EXISTS "userAgent" text;
  ALTER TABLE auth_events ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auth_events_userid_fk') THEN
    ALTER TABLE auth_events ADD CONSTRAINT auth_events_userid_fk
      FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'FK creation skipped: %', SQLERRM;
END $$;

-- ============================================================
-- 6. BEAUTY_ARTISTS table
-- ============================================================
CREATE TABLE IF NOT EXISTS beauty_artists (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text,
  specialty       text DEFAULT 'Beauty Artist',
  "salonName"     text DEFAULT '',
  region          text DEFAULT 'All Regions',
  phone           text,
  email           text,
  image           text,
  bio             text,
  photo           text,
  rating          numeric,
  experience      text,
  services        jsonb DEFAULT '[]'::jsonb,
  "videoTitle"    text,
  "videoUrl"      text,
  "videoThumbnail" text,
  enabled         boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE beauty_artists ADD COLUMN IF NOT EXISTS name text;
  ALTER TABLE beauty_artists ADD COLUMN IF NOT EXISTS specialty text DEFAULT 'Beauty Artist';
  ALTER TABLE beauty_artists ADD COLUMN IF NOT EXISTS "salonName" text DEFAULT '';
  ALTER TABLE beauty_artists ADD COLUMN IF NOT EXISTS region text DEFAULT 'All Regions';
  ALTER TABLE beauty_artists ADD COLUMN IF NOT EXISTS phone text;
  ALTER TABLE beauty_artists ADD COLUMN IF NOT EXISTS email text;
  ALTER TABLE beauty_artists ADD COLUMN IF NOT EXISTS image text;
  ALTER TABLE beauty_artists ADD COLUMN IF NOT EXISTS bio text;
  ALTER TABLE beauty_artists ADD COLUMN IF NOT EXISTS photo text;
  ALTER TABLE beauty_artists ADD COLUMN IF NOT EXISTS rating numeric;
  ALTER TABLE beauty_artists ADD COLUMN IF NOT EXISTS experience text;
  ALTER TABLE beauty_artists ADD COLUMN IF NOT EXISTS services jsonb DEFAULT '[]'::jsonb;
  ALTER TABLE beauty_artists ADD COLUMN IF NOT EXISTS "videoTitle" text;
  ALTER TABLE beauty_artists ADD COLUMN IF NOT EXISTS "videoUrl" text;
  ALTER TABLE beauty_artists ADD COLUMN IF NOT EXISTS "videoThumbnail" text;
  ALTER TABLE beauty_artists ADD COLUMN IF NOT EXISTS enabled boolean DEFAULT true;
  ALTER TABLE beauty_artists ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
  ALTER TABLE beauty_artists ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
END $$;

DROP TRIGGER IF EXISTS beauty_artists_updated_at ON beauty_artists;
CREATE TRIGGER beauty_artists_updated_at
  BEFORE UPDATE ON beauty_artists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 7. SUPPORT_MESSAGES table
-- ============================================================
CREATE TABLE IF NOT EXISTS support_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"    uuid,
  "ticketId"  text,
  name        text,
  email       text,
  message     text,
  reply       text,
  status      text DEFAULT 'Pending',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS "userId" uuid;
  ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS "ticketId" text;
  ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS name text;
  ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS email text;
  ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS message text;
  ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS reply text;
  ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS status text DEFAULT 'Pending';
  ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
  ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_messages_userid_fk') THEN
    ALTER TABLE support_messages ADD CONSTRAINT support_messages_userid_fk
      FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'FK creation skipped: %', SQLERRM;
END $$;

DROP TRIGGER IF EXISTS support_messages_updated_at ON support_messages;
CREATE TRIGGER support_messages_updated_at
  BEFORE UPDATE ON support_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 8. PAYMENT_METHOD_SETTINGS table
-- ============================================================
-- NOTE: Uses 'method' (text) as PK, not UUID.
CREATE TABLE IF NOT EXISTS payment_method_settings (
  method      text PRIMARY KEY,
  enabled     boolean DEFAULT true,
  label       text,
  details     text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE payment_method_settings ADD COLUMN IF NOT EXISTS enabled boolean DEFAULT true;
  ALTER TABLE payment_method_settings ADD COLUMN IF NOT EXISTS label text;
  ALTER TABLE payment_method_settings ADD COLUMN IF NOT EXISTS details text;
  ALTER TABLE payment_method_settings ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
  ALTER TABLE payment_method_settings ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
END $$;

DROP TRIGGER IF EXISTS payment_method_settings_updated_at ON payment_method_settings;
CREATE TRIGGER payment_method_settings_updated_at
  BEFORE UPDATE ON payment_method_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 9. COUPONS table
-- ============================================================
CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_type text CHECK (discount_type IN ('flat', 'percentage')) NOT NULL,
  discount_value numeric NOT NULL,
  min_order_amount numeric DEFAULT 0,
  max_discount numeric,
  usage_limit integer DEFAULT 1,
  used_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE coupons ADD COLUMN IF NOT EXISTS code text;
  ALTER TABLE coupons ADD COLUMN IF NOT EXISTS discount_type text;
  ALTER TABLE coupons ADD COLUMN IF NOT EXISTS discount_value numeric;
  ALTER TABLE coupons ADD COLUMN IF NOT EXISTS min_order_amount numeric DEFAULT 0;
  ALTER TABLE coupons ADD COLUMN IF NOT EXISTS max_discount numeric;
  ALTER TABLE coupons ADD COLUMN IF NOT EXISTS usage_limit integer DEFAULT 1;
  ALTER TABLE coupons ADD COLUMN IF NOT EXISTS used_count integer DEFAULT 0;
  ALTER TABLE coupons ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
  ALTER TABLE coupons ADD COLUMN IF NOT EXISTS expires_at timestamptz;
  ALTER TABLE coupons ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
  ALTER TABLE coupons ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'coupons_code_unique') THEN
    ALTER TABLE coupons ADD CONSTRAINT coupons_code_unique UNIQUE (code);
  END IF;
END $$;

DROP TRIGGER IF EXISTS coupons_updated_at ON coupons;
CREATE TRIGGER coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Active schema add-ons for snake_case booking tables.
DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS subtotal_amount numeric;
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS coupon_code text DEFAULT '';
END $$;

-- ============================================================
-- 10. AUTH_METHOD_SETTINGS table (per-method signup/login switches)
-- ============================================================
-- NOTE: Uses 'method' (text) as PK, not UUID.
CREATE TABLE IF NOT EXISTS auth_method_settings (
  method          text PRIMARY KEY,
  signup_enabled  boolean DEFAULT true,
  login_enabled   boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE auth_method_settings ADD COLUMN IF NOT EXISTS signup_enabled boolean DEFAULT true;
  ALTER TABLE auth_method_settings ADD COLUMN IF NOT EXISTS login_enabled boolean DEFAULT true;
  ALTER TABLE auth_method_settings ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
  ALTER TABLE auth_method_settings ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
END $$;

DROP TRIGGER IF EXISTS auth_method_settings_updated_at ON auth_method_settings;
CREATE TRIGGER auth_method_settings_updated_at
  BEFORE UPDATE ON auth_method_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed the three auth methods (all enabled by default). The backend will
-- also auto-create these rows on first use, this is just for convenience.
INSERT INTO auth_method_settings (method, signup_enabled, login_enabled) VALUES
  ('Password', true, true),
  ('OTP', true, true),
  ('Google', true, true)
ON CONFLICT (method) DO NOTHING;

-- ============================================================
-- Done! All 10 tables are ready.
-- ============================================================
-- Next: restart the backend server. The admin bootstrap will
-- create/update the owner account automatically.
-- ============================================================
