-- =====================================================
-- Migration: v1.4.0 - Add service_type to maintenance_tasks
-- =====================================================
-- Date: 2026-02-17
-- Description: Add service_type column to maintenance_tasks so the
--              type carries over when a service record is auto-created
--              upon task completion.
-- =====================================================

ALTER TABLE maintenance_tasks
  ADD COLUMN service_type TEXT DEFAULT 'Preventative Maintenance';
