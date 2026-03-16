-- =====================================================
-- Migration: v1.1.0 - Replace tenant_occupied with description on units
-- =====================================================
-- Date: 2026-02-17
-- Description: Replace the boolean tenant_occupied column on the units
--              table with an optional text description column.
--              This is a BREAKING change (column removed + added).
-- =====================================================

-- Step 1: Add the new description column
ALTER TABLE units ADD COLUMN description TEXT;

-- Step 2: Drop the old tenant_occupied column
ALTER TABLE units DROP COLUMN tenant_occupied;
