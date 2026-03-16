-- =====================================================
-- RentTrack Asset Manager - Supabase Database Schema
-- =====================================================
-- This schema includes all tables with proper relationships,
-- foreign keys, indexes, and Row Level Security (RLS) policies
-- =====================================================
--
-- VERSION: 1.0.3
-- DATE:    2026-02-17
--
-- VERSIONING SYSTEM:
--   MAJOR.MINOR.PATCH
--   MAJOR → breaking changes (table renamed, column removed, type changed)
--   MINOR → new tables, columns, or features added (non-breaking)
--   PATCH → fixes, seed data corrections, comment updates
--
-- CHANGELOG:
-- ─────────────────────────────────────────────────────
-- v1.0.3  (2026-02-17)  Documentation update
--   - Added commented DROP block back to full schema for from-scratch rebuilds
--   - Created migration file structure (migration_vX.X.X.sql)
--   - Updated documentation for dual-file approach (migration + full schema)
--
-- v1.0.2  (2026-02-17)  Security fix for views
--   - Added SECURITY INVOKER to all views (asset_lifecycle, upcoming_maintenance, service_history_detail)
--   - This ensures RLS policies are enforced based on the querying user, not the view creator
--   - Fixes Supabase security warnings about views bypassing RLS
--
-- v1.0.1  (2026-02-17)  Type casting fix
--   - Fixed INTEGER type inference error in asset_category_l3 INSERT statements
--   - Added explicit ::INTEGER casts to handle NULL maintenance intervals
--   - Quoted all numeric VALUES to ensure proper type casting
--
-- v1.0.0  (2026-02-17)  Initial release
--   - profiles, properties, units tables
--   - vendors table (parts/hardware distributors)
--   - contractors table (installation/repair services)
--   - assets table with 3-level FK-enforced category dropdowns
--   - asset_category_l1/l2/l3 tables fully seeded from Appendix B
--   - service_records table with separate labor_cost / parts_cost
--   - maintenance_tasks table (one-time and recurring)
--   - documents and budgets tables (future features)
--   - updated_at triggers on all tables
--   - Row Level Security policies on all tables
--   - Views: asset_lifecycle, upcoming_maintenance, service_history_detail
--   - DROP block at top for safe full re-runs
-- ─────────────────────────────────────────────────────
--
-- =====================================================
-- USAGE INSTRUCTIONS:
-- =====================================================
-- 
-- FOR EXISTING DATABASES (WITH DATA):
--   Use the migration scripts (migration_vX.X.X.sql) to update
--   your schema without losing data. DO NOT run this full file.
--
-- FOR FRESH DATABASE (FROM SCRATCH):
--   1. Uncomment the DROP block below (remove the -- before each DROP line)
--   2. Paste the entire file into Supabase SQL Editor
--   3. Run it
--   4. Re-comment the DROP block for safety
--
-- =====================================================

-- ── DROP EVERYTHING (COMMENTED OUT FOR SAFETY) ───────
-- ONLY UNCOMMENT THESE LINES IF CREATING FROM SCRATCH
-- Views first (no dependencies)
-- DROP VIEW IF EXISTS service_history_detail CASCADE;
-- DROP VIEW IF EXISTS upcoming_maintenance CASCADE;
-- DROP VIEW IF EXISTS asset_lifecycle CASCADE;

-- Leaf/child tables first, then parents
-- DROP TABLE IF EXISTS budgets CASCADE;
-- DROP TABLE IF EXISTS documents CASCADE;
-- DROP TABLE IF EXISTS maintenance_tasks CASCADE;
-- DROP TABLE IF EXISTS service_records CASCADE;
-- DROP TABLE IF EXISTS assets CASCADE;
-- DROP TABLE IF EXISTS asset_category_l3 CASCADE;
-- DROP TABLE IF EXISTS asset_category_l2 CASCADE;
-- DROP TABLE IF EXISTS asset_category_l1 CASCADE;
-- DROP TABLE IF EXISTS contractors CASCADE;
-- DROP TABLE IF EXISTS vendors CASCADE;
-- DROP TABLE IF EXISTS units CASCADE;
-- DROP TABLE IF EXISTS properties CASCADE;
-- DROP TABLE IF EXISTS profiles CASCADE;

-- Drop trigger function
-- DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
-- ─────────────────────────────────────────────────────

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PROFILES TABLE
-- =====================================================
-- Extends Supabase auth.users with additional user info
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  company_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- PROPERTIES TABLE
-- =====================================================
CREATE TABLE properties (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  property_type TEXT, -- single-family, duplex, apartment, condo, etc.
  number_of_units INTEGER DEFAULT 1,
  photo_url TEXT,
  notes TEXT,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_properties_user_id ON properties(user_id);
CREATE INDEX idx_properties_archived ON properties(is_archived);

-- Enable RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- RLS Policies for properties
CREATE POLICY "Users can view own properties"
  ON properties FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own properties"
  ON properties FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own properties"
  ON properties FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own properties"
  ON properties FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- UNITS TABLE
-- =====================================================
-- Optional: For multi-unit properties (apartments, duplexes)
CREATE TABLE units (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  unit_number TEXT NOT NULL, -- "1A", "Apt 201", "Unit B", etc.
  tenant_occupied BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, unit_number)
);

-- Indexes
CREATE INDEX idx_units_property_id ON units(property_id);
CREATE INDEX idx_units_user_id ON units(user_id);

-- Enable RLS
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

-- RLS Policies for units
CREATE POLICY "Users can view own units"
  ON units FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own units"
  ON units FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own units"
  ON units FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own units"
  ON units FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- VENDORS TABLE
-- =====================================================
-- Vendors are distributors/suppliers for hardware, parts, and equipment
CREATE TABLE vendors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  address TEXT,
  products_sold TEXT[], -- Array: ['HVAC Parts', 'Plumbing Supplies', 'Appliances']
  account_number TEXT, -- User's account number with this vendor
  notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_vendors_user_id ON vendors(user_id);

-- Enable RLS
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendors
CREATE POLICY "Users can view own vendors"
  ON vendors FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vendors"
  ON vendors FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vendors"
  ON vendors FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vendors"
  ON vendors FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- CONTRACTORS TABLE
-- =====================================================
-- Contractors provide installation, repair, and maintenance services
CREATE TABLE contractors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  address TEXT,
  services_offered TEXT[], -- Array: ['HVAC', 'Plumbing', 'Electrical']
  license_number TEXT,
  insurance_expiration DATE,
  notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_contractors_user_id ON contractors(user_id);

-- Enable RLS
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contractors
CREATE POLICY "Users can view own contractors"
  ON contractors FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contractors"
  ON contractors FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contractors"
  ON contractors FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contractors"
  ON contractors FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- ASSET CATEGORY LOOKUP TABLES (3-Level Hierarchy)
-- =====================================================
-- Must be created before assets table so FKs can reference them.
-- All authenticated users can read; only service role can write.

-- Level 1: Top-level category  e.g. "HVAC Systems"
CREATE TABLE asset_category_l1 (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- Level 2: System/group within a category  e.g. "Central Air Conditioning"
CREATE TABLE asset_category_l2 (
  id SERIAL PRIMARY KEY,
  l1_id INTEGER REFERENCES asset_category_l1(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  UNIQUE(l1_id, name)
);

-- Level 3: Specific component  e.g. "Condenser Unit (outdoor)"
-- Also carries maintenance defaults since this is the most granular level.
CREATE TABLE asset_category_l3 (
  id SERIAL PRIMARY KEY,
  l2_id INTEGER REFERENCES asset_category_l2(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  default_lifespan_years INTEGER,
  default_maintenance_interval_months INTEGER,
  UNIQUE(l2_id, name)
);

-- RLS: readable by all authenticated users, not writable by users
ALTER TABLE asset_category_l1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_category_l2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_category_l3 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read l1" ON asset_category_l1 FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read l2" ON asset_category_l2 FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read l3" ON asset_category_l3 FOR SELECT TO authenticated USING (true);

-- =====================================================
-- SEED DATA: Asset Category Hierarchy (Appendix B)
-- =====================================================

-- ── L1 rows ──────────────────────────────────────────
INSERT INTO asset_category_l1 (name) VALUES
  ('HVAC Systems'),
  ('Water Systems'),
  ('Kitchen Appliances'),
  ('Laundry Appliances'),
  ('Plumbing Fixtures & Systems'),
  ('Electrical Systems'),
  ('Exterior & Structural'),
  ('Security & Safety'),
  ('Outdoor & Yard'),
  ('Climate Control - Other'),
  ('Other Systems'),
  ('Flooring'),
  ('General');

-- ── L2 rows ──────────────────────────────────────────
-- Helper: reference l1 by name for readability
INSERT INTO asset_category_l2 (l1_id, name)
SELECT id, unnest(ARRAY[
  'Central Air Conditioning',
  'Furnace / Heating',
  'Window / Wall Units'
]) FROM asset_category_l1 WHERE name = 'HVAC Systems';

INSERT INTO asset_category_l2 (l1_id, name)
SELECT id, unnest(ARRAY[
  'Water Heater',
  'Water Treatment'
]) FROM asset_category_l1 WHERE name = 'Water Systems';

-- L2 rows for categories whose items are leaves at L2 (no further grouping needed)
-- We still insert an L2 row so the UI stays consistent; L3 holds the actual items.
INSERT INTO asset_category_l2 (l1_id, name)
SELECT id, 'Kitchen Appliances' FROM asset_category_l1 WHERE name = 'Kitchen Appliances';

INSERT INTO asset_category_l2 (l1_id, name)
SELECT id, 'Laundry Appliances' FROM asset_category_l1 WHERE name = 'Laundry Appliances';

INSERT INTO asset_category_l2 (l1_id, name)
SELECT id, unnest(ARRAY[
  'Fixtures',
  'Piping & Main Lines'
]) FROM asset_category_l1 WHERE name = 'Plumbing Fixtures & Systems';

INSERT INTO asset_category_l2 (l1_id, name)
SELECT id, 'Electrical Systems' FROM asset_category_l1 WHERE name = 'Electrical Systems';

INSERT INTO asset_category_l2 (l1_id, name)
SELECT id, unnest(ARRAY[
  'Roof',
  'Exterior Envelope',
  'Garage',
  'Hardscape'
]) FROM asset_category_l1 WHERE name = 'Exterior & Structural';

INSERT INTO asset_category_l2 (l1_id, name)
SELECT id, 'Security & Safety' FROM asset_category_l1 WHERE name = 'Security & Safety';

INSERT INTO asset_category_l2 (l1_id, name)
SELECT id, unnest(ARRAY[
  'Sprinkler System',
  'Pool / Spa',
  'Outdoor Lighting'
]) FROM asset_category_l1 WHERE name = 'Outdoor & Yard';

INSERT INTO asset_category_l2 (l1_id, name)
SELECT id, 'Climate Control - Other' FROM asset_category_l1 WHERE name = 'Climate Control - Other';

INSERT INTO asset_category_l2 (l1_id, name)
SELECT id, unnest(ARRAY[
  'Septic System',
  'Well System',
  'Energy & Backup'
]) FROM asset_category_l1 WHERE name = 'Other Systems';

INSERT INTO asset_category_l2 (l1_id, name)
SELECT id, 'Flooring' FROM asset_category_l1 WHERE name = 'Flooring';

INSERT INTO asset_category_l2 (l1_id, name)
SELECT id, 'General' FROM asset_category_l1 WHERE name = 'General';

-- ── L3 rows ──────────────────────────────────────────
-- Format: (l2_id, name, default_lifespan_years, default_maintenance_interval_months)
-- Using ::INTEGER casts to handle NULL values properly

-- HVAC → Central Air Conditioning
INSERT INTO asset_category_l3 (l2_id, name, default_lifespan_years, default_maintenance_interval_months)
SELECT l2.id, vals.name, vals.life::INTEGER, vals.maint::INTEGER
FROM asset_category_l2 l2
JOIN asset_category_l1 l1 ON l2.l1_id = l1.id
CROSS JOIN (VALUES
  ('Condenser Unit (outdoor)',  '15', '6'),
  ('Air Handler (indoor)',      '15', '6'),
  ('Evaporator Coil',           '15', '12'),
  ('Thermostat',                '10', NULL),
  ('Ductwork',                  '25', '60')
) AS vals(name, life, maint)
WHERE l1.name = 'HVAC Systems' AND l2.name = 'Central Air Conditioning';

-- HVAC → Furnace / Heating
INSERT INTO asset_category_l3 (l2_id, name, default_lifespan_years, default_maintenance_interval_months)
SELECT l2.id, vals.name, vals.life::INTEGER, vals.maint::INTEGER
FROM asset_category_l2 l2
JOIN asset_category_l1 l1 ON l2.l1_id = l1.id
CROSS JOIN (VALUES
  ('Gas Furnace',     '20', '12'),
  ('Electric Furnace','20', '12'),
  ('Heat Pump',       '15', '6'),
  ('Boiler',          '20', '12')
) AS vals(name, life, maint)
WHERE l1.name = 'HVAC Systems' AND l2.name = 'Furnace / Heating';

-- HVAC → Window / Wall Units
INSERT INTO asset_category_l3 (l2_id, name, default_lifespan_years, default_maintenance_interval_months)
SELECT l2.id, vals.name, vals.life::INTEGER, vals.maint::INTEGER
FROM asset_category_l2 l2
JOIN asset_category_l1 l1 ON l2.l1_id = l1.id
CROSS JOIN (VALUES
  ('Window AC Unit',    '10', '12'),
  ('Mini-Split System', '15', '6'),
  ('Portable AC Unit',  '8',  '12')
) AS vals(name, life, maint)
WHERE l1.name = 'HVAC Systems' AND l2.name = 'Window / Wall Units';

-- Water Systems → Water Heater
INSERT INTO asset_category_l3 (l2_id, name, default_lifespan_years, default_maintenance_interval_months)
SELECT l2.id, vals.name, vals.life::INTEGER, vals.maint::INTEGER
FROM asset_category_l2 l2
JOIN asset_category_l1 l1 ON l2.l1_id = l1.id
CROSS JOIN (VALUES
  ('Tank Water Heater - Gas',      '10', '12'),
  ('Tank Water Heater - Electric', '12', '12'),
  ('Tankless Water Heater',        '20', '12'),
  ('Heat Pump Water Heater',       '15', '12')
) AS vals(name, life, maint)
WHERE l1.name = 'Water Systems' AND l2.name = 'Water Heater';

-- Water Systems → Water Treatment
INSERT INTO asset_category_l3 (l2_id, name, default_lifespan_years, default_maintenance_interval_months)
SELECT l2.id, vals.name, vals.life::INTEGER, vals.maint::INTEGER
FROM asset_category_l2 l2
JOIN asset_category_l1 l1 ON l2.l1_id = l1.id
CROSS JOIN (VALUES
  ('Water Softener',       '15', '6'),
  ('Whole House Filter',   '10', '3'),
  ('Reverse Osmosis System','10','6'),
  ('Sump Pump',            '10', '6')
) AS vals(name, life, maint)
WHERE l1.name = 'Water Systems' AND l2.name = 'Water Treatment';

-- Kitchen Appliances
INSERT INTO asset_category_l3 (l2_id, name, default_lifespan_years, default_maintenance_interval_months)
SELECT l2.id, vals.name, vals.life::INTEGER, vals.maint::INTEGER
FROM asset_category_l2 l2
JOIN asset_category_l1 l1 ON l2.l1_id = l1.id
CROSS JOIN (VALUES
  ('Refrigerator',         '13', NULL),
  ('Stove / Range',        '15', NULL),
  ('Oven (standalone)',     '15', NULL),
  ('Dishwasher',           '10', '6'),
  ('Microwave',            '9',  NULL),
  ('Garbage Disposal',     '12', NULL),
  ('Range Hood / Exhaust Fan', '15', '12')
) AS vals(name, life, maint)
WHERE l1.name = 'Kitchen Appliances' AND l2.name = 'Kitchen Appliances';

-- Laundry Appliances
INSERT INTO asset_category_l3 (l2_id, name, default_lifespan_years, default_maintenance_interval_months)
SELECT l2.id, vals.name, vals.life::INTEGER, vals.maint::INTEGER
FROM asset_category_l2 l2
JOIN asset_category_l1 l1 ON l2.l1_id = l1.id
CROSS JOIN (VALUES
  ('Washing Machine',       '11', '6'),
  ('Dryer - Gas',           '13', '6'),
  ('Dryer - Electric',      '13', '6'),
  ('Washer / Dryer Combo',  '10', '6')
) AS vals(name, life, maint)
WHERE l1.name = 'Laundry Appliances' AND l2.name = 'Laundry Appliances';

-- Plumbing → Fixtures
INSERT INTO asset_category_l3 (l2_id, name, default_lifespan_years, default_maintenance_interval_months)
SELECT l2.id, vals.name, vals.life::INTEGER, vals.maint::INTEGER
FROM asset_category_l2 l2
JOIN asset_category_l1 l1 ON l2.l1_id = l1.id
CROSS JOIN (VALUES
  ('Toilet',              '30', NULL),
  ('Sink Faucet',         '20', NULL),
  ('Shower / Tub Fixture','20', NULL),
  ('Bathtub',             '30', NULL),
  ('Shower Enclosure',    '20', NULL)
) AS vals(name, life, maint)
WHERE l1.name = 'Plumbing Fixtures & Systems' AND l2.name = 'Fixtures';

-- Plumbing → Piping & Main Lines
INSERT INTO asset_category_l3 (l2_id, name, default_lifespan_years, default_maintenance_interval_months)
SELECT l2.id, vals.name, vals.life::INTEGER, vals.maint::INTEGER
FROM asset_category_l2 l2
JOIN asset_category_l1 l1 ON l2.l1_id = l1.id
CROSS JOIN (VALUES
  ('Main Water Shutoff Valve', '20', NULL),
  ('Water Main Line',          '50', NULL),
  ('Sewer Line',               '40', '60')
) AS vals(name, life, maint)
WHERE l1.name = 'Plumbing Fixtures & Systems' AND l2.name = 'Piping & Main Lines';

-- Electrical Systems
INSERT INTO asset_category_l3 (l2_id, name, default_lifespan_years, default_maintenance_interval_months)
SELECT l2.id, vals.name, vals.life::INTEGER, vals.maint::INTEGER
FROM asset_category_l2 l2
JOIN asset_category_l1 l1 ON l2.l1_id = l1.id
CROSS JOIN (VALUES
  ('Electrical Panel / Breaker Box', '40', '60'),
  ('GFCI Outlets',                   '25', NULL),
  ('Smoke Detector',                 '10', '12'),
  ('Carbon Monoxide Detector',       '7',  '12'),
  ('Ceiling Fan',                    '15', NULL),
  ('Light Fixtures',                 '20', NULL)
) AS vals(name, life, maint)
WHERE l1.name = 'Electrical Systems' AND l2.name = 'Electrical Systems';

-- Exterior → Roof
INSERT INTO asset_category_l3 (l2_id, name, default_lifespan_years, default_maintenance_interval_months)
SELECT l2.id, vals.name, vals.life::INTEGER, vals.maint::INTEGER
FROM asset_category_l2 l2
JOIN asset_category_l1 l1 ON l2.l1_id = l1.id
CROSS JOIN (VALUES
  ('Shingles / Roofing Material', '20', '24'),
  ('Gutters',                     '20', '6'),
  ('Downspouts',                  '20', '6'),
  ('Flashing',                    '20', '24')
) AS vals(name, life, maint)
WHERE l1.name = 'Exterior & Structural' AND l2.name = 'Roof';

-- Exterior → Exterior Envelope
INSERT INTO asset_category_l3 (l2_id, name, default_lifespan_years, default_maintenance_interval_months)
SELECT l2.id, vals.name, vals.life::INTEGER, vals.maint::INTEGER
FROM asset_category_l2 l2
JOIN asset_category_l1 l1 ON l2.l1_id = l1.id
CROSS JOIN (VALUES
  ('Siding / Exterior Cladding', '25', '60'),
  ('Windows',                    '20', NULL),
  ('Exterior Doors',             '30', NULL),
  ('Deck / Patio',               '20', '12'),
  ('Fence / Gate',               '15', NULL)
) AS vals(name, life, maint)
WHERE l1.name = 'Exterior & Structural' AND l2.name = 'Exterior Envelope';

-- Exterior → Garage
INSERT INTO asset_category_l3 (l2_id, name, default_lifespan_years, default_maintenance_interval_months)
SELECT l2.id, vals.name, vals.life::INTEGER, vals.maint::INTEGER
FROM asset_category_l2 l2
JOIN asset_category_l1 l1 ON l2.l1_id = l1.id
CROSS JOIN (VALUES
  ('Garage Door Opener', '15', '12'),
  ('Garage Door Springs','7',  '12'),
  ('Garage Door Panels', '20', NULL)
) AS vals(name, life, maint)
WHERE l1.name = 'Exterior & Structural' AND l2.name = 'Garage';

-- Exterior → Hardscape
INSERT INTO asset_category_l3 (l2_id, name, default_lifespan_years, default_maintenance_interval_months)
SELECT l2.id, vals.name, vals.life::INTEGER, vals.maint::INTEGER
FROM asset_category_l2 l2
JOIN asset_category_l1 l1 ON l2.l1_id = l1.id
CROSS JOIN (VALUES
  ('Driveway', '20', NULL),
  ('Walkway',  '20', NULL)
) AS vals(name, life, maint)
WHERE l1.name = 'Exterior & Structural' AND l2.name = 'Hardscape';

-- Security & Safety
INSERT INTO asset_category_l3 (l2_id, name, default_lifespan_years, default_maintenance_interval_months)
SELECT l2.id, vals.name, vals.life::INTEGER, vals.maint::INTEGER
FROM asset_category_l2 l2
JOIN asset_category_l1 l1 ON l2.l1_id = l1.id
CROSS JOIN (VALUES
  ('Security System',       '10', '12'),
  ('Door Locks / Deadbolts','10', NULL),
  ('Video Doorbell / Camera','5', NULL),
  ('Fire Extinguisher',     '12', '12')
) AS vals(name, life, maint)
WHERE l1.name = 'Security & Safety' AND l2.name = 'Security & Safety';

-- Outdoor & Yard → Sprinkler System
INSERT INTO asset_category_l3 (l2_id, name, default_lifespan_years, default_maintenance_interval_months)
SELECT l2.id, vals.name, vals.life::INTEGER, vals.maint::INTEGER
FROM asset_category_l2 l2
JOIN asset_category_l1 l1 ON l2.l1_id = l1.id
CROSS JOIN (VALUES
  ('Sprinkler Controller / Timer', '10', '12'),
  ('Sprinkler Heads',              '10', '6'),
  ('Irrigation Lines',             '20', NULL),
  ('Backflow Preventer',           '10', '12')
) AS vals(name, life, maint)
WHERE l1.name = 'Outdoor & Yard' AND l2.name = 'Sprinkler System';

-- Outdoor & Yard → Pool / Spa
INSERT INTO asset_category_l3 (l2_id, name, default_lifespan_years, default_maintenance_interval_months)
SELECT l2.id, vals.name, vals.life::INTEGER, vals.maint::INTEGER
FROM asset_category_l2 l2
JOIN asset_category_l1 l1 ON l2.l1_id = l1.id
CROSS JOIN (VALUES
  ('Pool Pump',                 '8',  '3'),
  ('Pool Filter',               '8',  '6'),
  ('Pool Heater',               '10', '12'),
  ('Salt System / Chlorinator', '5',  '3'),
  ('Pool Cleaner (automatic)',  '5',  '6')
) AS vals(name, life, maint)
WHERE l1.name = 'Outdoor & Yard' AND l2.name = 'Pool / Spa';

-- Outdoor & Yard → Outdoor Lighting
INSERT INTO asset_category_l3 (l2_id, name, default_lifespan_years, default_maintenance_interval_months)
SELECT l2.id, vals.name, vals.life::INTEGER, vals.maint::INTEGER
FROM asset_category_l2 l2
JOIN asset_category_l1 l1 ON l2.l1_id = l1.id
CROSS JOIN (VALUES
  ('Landscape Lighting', '15', NULL)
) AS vals(name, life, maint)
WHERE l1.name = 'Outdoor & Yard' AND l2.name = 'Outdoor Lighting';

-- Climate Control - Other
INSERT INTO asset_category_l3 (l2_id, name, default_lifespan_years, default_maintenance_interval_months)
SELECT l2.id, vals.name, vals.life::INTEGER, vals.maint::INTEGER
FROM asset_category_l2 l2
JOIN asset_category_l1 l1 ON l2.l1_id = l1.id
CROSS JOIN (VALUES
  ('Attic Fan / Ventilation', '15', '12'),
  ('Dehumidifier',            '10', '6'),
  ('Humidifier',              '10', '12'),
  ('Bathroom Exhaust Fan',    '10', '12')
) AS vals(name, life, maint)
WHERE l1.name = 'Climate Control - Other' AND l2.name = 'Climate Control - Other';

-- Other Systems → Septic System
INSERT INTO asset_category_l3 (l2_id, name, default_lifespan_years, default_maintenance_interval_months)
SELECT l2.id, vals.name, vals.life::INTEGER, vals.maint::INTEGER
FROM asset_category_l2 l2
JOIN asset_category_l1 l1 ON l2.l1_id = l1.id
CROSS JOIN (VALUES
  ('Septic Tank',  '40', '36'),
  ('Drain Field',  '25', '60')
) AS vals(name, life, maint)
WHERE l1.name = 'Other Systems' AND l2.name = 'Septic System';

-- Other Systems → Well System
INSERT INTO asset_category_l3 (l2_id, name, default_lifespan_years, default_maintenance_interval_months)
SELECT l2.id, vals.name, vals.life::INTEGER, vals.maint::INTEGER
FROM asset_category_l2 l2
JOIN asset_category_l1 l1 ON l2.l1_id = l1.id
CROSS JOIN (VALUES
  ('Well Pump',      '15', '12'),
  ('Pressure Tank',  '15', '12')
) AS vals(name, life, maint)
WHERE l1.name = 'Other Systems' AND l2.name = 'Well System';

-- Other Systems → Energy & Backup
INSERT INTO asset_category_l3 (l2_id, name, default_lifespan_years, default_maintenance_interval_months)
SELECT l2.id, vals.name, vals.life::INTEGER, vals.maint::INTEGER
FROM asset_category_l2 l2
JOIN asset_category_l1 l1 ON l2.l1_id = l1.id
CROSS JOIN (VALUES
  ('Solar Panels',          '25', '12'),
  ('Solar Inverter',        '15', '12'),
  ('Whole House Generator', '20', '6'),
  ('Portable Generator',    '10', '12')
) AS vals(name, life, maint)
WHERE l1.name = 'Other Systems' AND l2.name = 'Energy & Backup';

-- Flooring
INSERT INTO asset_category_l3 (l2_id, name, default_lifespan_years, default_maintenance_interval_months)
SELECT l2.id, vals.name, vals.life::INTEGER, vals.maint::INTEGER
FROM asset_category_l2 l2
JOIN asset_category_l1 l1 ON l2.l1_id = l1.id
CROSS JOIN (VALUES
  ('Carpet',           '10', NULL),
  ('Hardwood Floors',  '25', NULL),
  ('Tile Floors',      '20', NULL),
  ('Vinyl / Laminate', '15', NULL)
) AS vals(name, life, maint)
WHERE l1.name = 'Flooring' AND l2.name = 'Flooring';

-- General / Other
INSERT INTO asset_category_l3 (l2_id, name, default_lifespan_years, default_maintenance_interval_months)
SELECT l2.id, vals.name, vals.life::INTEGER, vals.maint::INTEGER
FROM asset_category_l2 l2
JOIN asset_category_l1 l1 ON l2.l1_id = l1.id
CROSS JOIN (VALUES
  ('Other', NULL, NULL)
) AS vals(name, life, maint)
WHERE l1.name = 'General' AND l2.name = 'General';

-- =====================================================
-- ASSETS TABLE
-- =====================================================
CREATE TABLE assets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,

  -- Asset category (FK-enforced dropdowns)
  -- L1 is always required; L2/L3 required when available for that category
  category_l1_id INTEGER REFERENCES asset_category_l1(id) NOT NULL,  -- e.g. "HVAC Systems"
  category_l2_id INTEGER REFERENCES asset_category_l2(id),           -- e.g. "Central Air Conditioning"
  category_l3_id INTEGER REFERENCES asset_category_l3(id),           -- e.g. "Condenser Unit (outdoor)"
  custom_name TEXT, -- User-friendly label e.g. "Master Bedroom AC"
  
  -- Asset details
  location TEXT DEFAULT 'Not specified', -- 'Basement', 'Attic', 'Kitchen', etc.
  manufacturer TEXT,
  model_number TEXT,
  serial_number TEXT,
  install_date DATE,
  purchase_cost DECIMAL(10, 2),
  
  -- Vendor/Installer/Contractor references
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL, -- Where equipment was purchased
  installer_id UUID REFERENCES contractors(id) ON DELETE SET NULL, -- Who installed it
  
  -- Warranty
  parts_warranty_expiration DATE,
  labor_warranty_expiration DATE,
  
  -- Lifecycle
  expected_lifespan_years INTEGER, -- Auto-populated based on category, editable
  
  -- Photos
  photo_urls TEXT[], -- Array of photo URLs from Supabase Storage
  
  -- Additional info
  notes TEXT,
  is_archived BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_assets_user_id ON assets(user_id);
CREATE INDEX idx_assets_property_id ON assets(property_id);
CREATE INDEX idx_assets_unit_id ON assets(unit_id);
CREATE INDEX idx_assets_vendor_id ON assets(vendor_id);
CREATE INDEX idx_assets_installer_id ON assets(installer_id);
CREATE INDEX idx_assets_category_l1 ON assets(category_l1_id);
CREATE INDEX idx_assets_category_l2 ON assets(category_l2_id);
CREATE INDEX idx_assets_category_l3 ON assets(category_l3_id);
CREATE INDEX idx_assets_archived ON assets(is_archived);

-- Enable RLS
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assets
CREATE POLICY "Users can view own assets"
  ON assets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assets"
  ON assets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assets"
  ON assets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own assets"
  ON assets FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- SERVICE RECORDS TABLE
-- =====================================================
CREATE TABLE service_records (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE NOT NULL,
  contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL, -- Who performed the service
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL, -- Where parts were purchased (if applicable)
  
  -- Service details
  service_date DATE NOT NULL,
  service_type TEXT NOT NULL, -- 'Preventative Maintenance', 'Repair', 'Replacement', 'Inspection'
  description TEXT NOT NULL,
  
  -- Cost breakdown
  labor_cost DECIMAL(10, 2),
  parts_cost DECIMAL(10, 2),
  total_cost DECIMAL(10, 2), -- Can be auto-calculated or manually entered
  
  -- Warranty
  is_warranty_work BOOLEAN DEFAULT FALSE,
  repair_warranty_expiration DATE, -- Warranty on this specific repair
  
  -- Documents
  receipt_urls TEXT[], -- Array of receipt/invoice URLs from Supabase Storage
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_service_records_user_id ON service_records(user_id);
CREATE INDEX idx_service_records_asset_id ON service_records(asset_id);
CREATE INDEX idx_service_records_contractor_id ON service_records(contractor_id);
CREATE INDEX idx_service_records_vendor_id ON service_records(vendor_id);
CREATE INDEX idx_service_records_date ON service_records(service_date);
CREATE INDEX idx_service_records_type ON service_records(service_type);

-- Enable RLS
ALTER TABLE service_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_records
CREATE POLICY "Users can view own service records"
  ON service_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own service records"
  ON service_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own service records"
  ON service_records FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own service records"
  ON service_records FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- MAINTENANCE TASKS TABLE
-- =====================================================
CREATE TABLE maintenance_tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE, -- For property-wide tasks
  contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
  
  -- Task details
  task_name TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  
  -- Scheduling
  is_recurring BOOLEAN DEFAULT FALSE,
  frequency TEXT, -- 'monthly', 'quarterly', 'semi-annual', 'annual', 'custom'
  custom_interval_days INTEGER, -- For custom frequency
  
  -- Due date
  next_due_date DATE NOT NULL,
  last_completed_date DATE,
  
  -- Effort & Cost
  estimated_duration_minutes INTEGER,
  estimated_cost DECIMAL(10, 2),
  
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'overdue', 'snoozed'
  snoozed_until DATE,
  
  -- Completion tracking
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: Must have either asset_id OR property_id
  CONSTRAINT task_has_asset_or_property CHECK (
    (asset_id IS NOT NULL AND property_id IS NULL) OR
    (asset_id IS NULL AND property_id IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX idx_maintenance_tasks_user_id ON maintenance_tasks(user_id);
CREATE INDEX idx_maintenance_tasks_asset_id ON maintenance_tasks(asset_id);
CREATE INDEX idx_maintenance_tasks_property_id ON maintenance_tasks(property_id);
CREATE INDEX idx_maintenance_tasks_contractor_id ON maintenance_tasks(contractor_id);
CREATE INDEX idx_maintenance_tasks_due_date ON maintenance_tasks(next_due_date);
CREATE INDEX idx_maintenance_tasks_status ON maintenance_tasks(status);

-- Enable RLS
ALTER TABLE maintenance_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for maintenance_tasks
CREATE POLICY "Users can view own maintenance tasks"
  ON maintenance_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own maintenance tasks"
  ON maintenance_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own maintenance tasks"
  ON maintenance_tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own maintenance tasks"
  ON maintenance_tasks FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- DOCUMENTS TABLE (Future Feature)
-- =====================================================
-- For storing property documents, manuals, warranties, etc.
CREATE TABLE documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  
  -- Document details
  document_name TEXT NOT NULL,
  document_type TEXT, -- 'lease', 'permit', 'manual', 'warranty', 'receipt', 'other'
  file_url TEXT NOT NULL,
  file_size_bytes INTEGER,
  mime_type TEXT,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: Must have either property_id OR asset_id
  CONSTRAINT document_has_property_or_asset CHECK (
    (property_id IS NOT NULL AND asset_id IS NULL) OR
    (property_id IS NULL AND asset_id IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_property_id ON documents(property_id);
CREATE INDEX idx_documents_asset_id ON documents(asset_id);
CREATE INDEX idx_documents_type ON documents(document_type);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documents
CREATE POLICY "Users can view own documents"
  ON documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON documents FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- BUDGETS TABLE (Future Feature)
-- =====================================================
CREATE TABLE budgets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  
  -- Budget details
  year INTEGER NOT NULL,
  annual_budget DECIMAL(10, 2) NOT NULL,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(property_id, year)
);

-- Indexes
CREATE INDEX idx_budgets_user_id ON budgets(user_id);
CREATE INDEX idx_budgets_property_id ON budgets(property_id);
CREATE INDEX idx_budgets_year ON budgets(year);

-- Enable RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for budgets
CREATE POLICY "Users can view own budgets"
  ON budgets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budgets"
  ON budgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets"
  ON budgets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets"
  ON budgets FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contractors_updated_at BEFORE UPDATE ON contractors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_records_updated_at BEFORE UPDATE ON service_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_tasks_updated_at BEFORE UPDATE ON maintenance_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- USEFUL VIEWS
-- =====================================================

-- View: Assets with calculated age, remaining life, and resolved category names
CREATE OR REPLACE VIEW asset_lifecycle
WITH (security_invoker = true)
AS
SELECT
  a.*,
  l1.name  AS category_l1_name,
  l2.name  AS category_l2_name,
  l3.name  AS category_l3_name,
  l3.default_lifespan_years,
  l3.default_maintenance_interval_months,
  EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.install_date)) AS age_years,
  CASE
    WHEN a.expected_lifespan_years IS NOT NULL AND a.install_date IS NOT NULL
    THEN a.expected_lifespan_years - EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.install_date))
    ELSE NULL
  END AS remaining_life_years,
  p.address AS property_address,
  u.unit_number,
  v.company_name AS vendor_name,
  c.company_name AS installer_name
FROM assets a
LEFT JOIN asset_category_l1 l1 ON a.category_l1_id = l1.id
LEFT JOIN asset_category_l2 l2 ON a.category_l2_id = l2.id
LEFT JOIN asset_category_l3 l3 ON a.category_l3_id = l3.id
LEFT JOIN properties p ON a.property_id = p.id
LEFT JOIN units u ON a.unit_id = u.id
LEFT JOIN vendors v ON a.vendor_id = v.id
LEFT JOIN contractors c ON a.installer_id = c.id
WHERE a.is_archived = FALSE;

-- View: Upcoming maintenance tasks (next 90 days)
CREATE OR REPLACE VIEW upcoming_maintenance
WITH (security_invoker = true)
AS
SELECT
  mt.*,
  l1.name AS category_l1_name,
  l2.name AS category_l2_name,
  l3.name AS category_l3_name,
  a.custom_name AS asset_name,
  p.address AS property_address,
  c.company_name AS contractor_name,
  CURRENT_DATE - mt.next_due_date AS days_overdue
FROM maintenance_tasks mt
LEFT JOIN assets a ON mt.asset_id = a.id
LEFT JOIN asset_category_l1 l1 ON a.category_l1_id = l1.id
LEFT JOIN asset_category_l2 l2 ON a.category_l2_id = l2.id
LEFT JOIN asset_category_l3 l3 ON a.category_l3_id = l3.id
LEFT JOIN properties p ON COALESCE(mt.property_id, a.property_id) = p.id
LEFT JOIN contractors c ON mt.contractor_id = c.id
WHERE mt.status IN ('pending', 'overdue')
  AND mt.next_due_date <= CURRENT_DATE + INTERVAL '90 days'
ORDER BY mt.next_due_date ASC;

-- View: Service history with asset, contractor, and vendor details
CREATE OR REPLACE VIEW service_history_detail
WITH (security_invoker = true)
AS
SELECT
  sr.*,
  l1.name AS category_l1_name,
  l2.name AS category_l2_name,
  l3.name AS category_l3_name,
  a.custom_name AS asset_name,
  p.address AS property_address,
  c.company_name AS contractor_name,
  c.contact_name AS contractor_contact,
  v.company_name AS vendor_name,
  v.contact_name AS vendor_contact
FROM service_records sr
LEFT JOIN assets a ON sr.asset_id = a.id
LEFT JOIN asset_category_l1 l1 ON a.category_l1_id = l1.id
LEFT JOIN asset_category_l2 l2 ON a.category_l2_id = l2.id
LEFT JOIN asset_category_l3 l3 ON a.category_l3_id = l3.id
LEFT JOIN properties p ON a.property_id = p.id
LEFT JOIN contractors c ON sr.contractor_id = c.id
LEFT JOIN vendors v ON sr.vendor_id = v.id
ORDER BY sr.service_date DESC;

-- =====================================================
-- STORAGE BUCKETS
-- =====================================================
-- Note: You'll need to create these buckets in Supabase Dashboard or via API
-- Bucket names: 'asset-photos', 'receipts', 'documents'
-- Set appropriate RLS policies on storage buckets to match table policies

-- =====================================================
-- USEFUL QUERIES FOR YOUR APPLICATION
-- =====================================================

-- Get all assets for a property with lifecycle info (includes vendor and installer)
-- SELECT * FROM asset_lifecycle WHERE property_id = 'xxx' AND user_id = auth.uid();

-- Get overdue maintenance tasks
-- SELECT * FROM upcoming_maintenance WHERE days_overdue > 0 AND user_id = auth.uid();

-- Get total maintenance spend by property for current year
-- SELECT 
--   p.address,
--   SUM(sr.total_cost) as total_spent,
--   SUM(sr.labor_cost) as labor_spent,
--   SUM(sr.parts_cost) as parts_spent
-- FROM service_records sr
-- JOIN assets a ON sr.asset_id = a.id
-- JOIN properties p ON a.property_id = p.id
-- WHERE sr.user_id = auth.uid()
--   AND EXTRACT(YEAR FROM sr.service_date) = EXTRACT(YEAR FROM CURRENT_DATE)
-- GROUP BY p.id, p.address;

-- Get assets approaching end of life (< 1 year remaining)
-- SELECT * FROM asset_lifecycle 
-- WHERE user_id = auth.uid() 
--   AND remaining_life_years < 1 
--   AND remaining_life_years >= 0
-- ORDER BY remaining_life_years ASC;

-- Get all contractors with their total jobs and spend
-- SELECT 
--   c.company_name,
--   c.contact_name,
--   c.phone,
--   COUNT(sr.id) as total_jobs,
--   SUM(sr.labor_cost) as total_labor_cost
-- FROM contractors c
-- LEFT JOIN service_records sr ON c.id = sr.contractor_id
-- WHERE c.user_id = auth.uid()
-- GROUP BY c.id, c.company_name, c.contact_name, c.phone
-- ORDER BY total_jobs DESC;

-- Get all vendors with their total purchases
-- SELECT 
--   v.company_name,
--   v.contact_name,
--   v.phone,
--   COUNT(DISTINCT a.id) as equipment_purchased,
--   COUNT(sr.id) as parts_purchases,
--   SUM(sr.parts_cost) as total_parts_cost
-- FROM vendors v
-- LEFT JOIN assets a ON v.id = a.vendor_id
-- LEFT JOIN service_records sr ON v.id = sr.vendor_id
-- WHERE v.user_id = auth.uid()
-- GROUP BY v.id, v.company_name, v.contact_name, v.phone
-- ORDER BY total_parts_cost DESC NULLS LAST;

-- Get service records showing both contractor (labor) and vendor (parts)
-- SELECT 
--   sr.service_date,
--   a.asset_category,
--   a.custom_name,
--   sr.description,
--   c.company_name as contractor,
--   sr.labor_cost,
--   v.company_name as vendor,
--   sr.parts_cost,
--   sr.total_cost
-- FROM service_records sr
-- JOIN assets a ON sr.asset_id = a.id
-- LEFT JOIN contractors c ON sr.contractor_id = c.id
-- LEFT JOIN vendors v ON sr.vendor_id = v.id
-- WHERE sr.user_id = auth.uid()
-- ORDER BY sr.service_date DESC;
