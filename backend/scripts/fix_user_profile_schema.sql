-- Run in Supabase SQL Editor if profile fields fail to save.

ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name text DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS name text DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address text DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS city text DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS "subscriptionStatus" text DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE users
SET full_name = COALESCE(NULLIF(full_name, ''), NULLIF(name, ''), '')
WHERE full_name IS NULL OR full_name = '';

UPDATE users
SET name = COALESCE(NULLIF(name, ''), NULLIF(full_name, ''), '')
WHERE name IS NULL OR name = '';

NOTIFY pgrst, 'reload schema';
