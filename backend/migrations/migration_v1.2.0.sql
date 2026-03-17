-- =====================================================
-- Migration: v1.2.0 - Add recurrence_mode to maintenance_tasks
-- =====================================================
-- Date: 2026-02-17
-- Description: Add recurrence_mode column to control how the next
--              due date is calculated when a recurring task is completed.
--              'fixed'           = next date based on the original schedule
--              'from_completion' = next date based on actual completion date
-- =====================================================

ALTER TABLE maintenance_tasks
  ADD COLUMN recurrence_mode TEXT DEFAULT 'fixed';

-- Ensure only valid values
ALTER TABLE maintenance_tasks
  ADD CONSTRAINT valid_recurrence_mode
  CHECK (recurrence_mode IN ('fixed', 'from_completion'));
