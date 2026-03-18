-- =====================================================
-- Migration: v1.3.0 - Link service records to maintenance tasks
-- =====================================================
-- Date: 2026-02-17
-- Description:
--   1. Make asset_id nullable on service_records (property-level tasks
--      don't have an associated asset).
--   2. Add property_id FK so service records can reference a property
--      directly (not just through an asset).
--   3. Add maintenance_task_id FK so auto-created service records link
--      back to the maintenance task that spawned them.
--   4. Add CHECK constraint: at least one of asset_id / property_id
--      must be present.
--   5. Rebuild service_history_detail view to include the new columns.
-- =====================================================

-- 1. Make asset_id nullable
ALTER TABLE service_records ALTER COLUMN asset_id DROP NOT NULL;

-- 2. Add property_id column
ALTER TABLE service_records
  ADD COLUMN property_id UUID REFERENCES properties(id) ON DELETE CASCADE;

-- 3. Add maintenance_task_id column
ALTER TABLE service_records
  ADD COLUMN maintenance_task_id UUID REFERENCES maintenance_tasks(id) ON DELETE SET NULL;

-- 4. Constraint: must have at least one of asset_id or property_id
ALTER TABLE service_records
  ADD CONSTRAINT service_has_asset_or_property
  CHECK (asset_id IS NOT NULL OR property_id IS NOT NULL);

-- 5. Indexes
CREATE INDEX idx_service_records_property_id ON service_records(property_id);
CREATE INDEX idx_service_records_maintenance_task_id ON service_records(maintenance_task_id);

-- 6. Rebuild view (must DROP first — new columns in sr.* shift positions)
DROP VIEW IF EXISTS service_history_detail;
CREATE VIEW service_history_detail
WITH (security_invoker = true)
AS
SELECT
  sr.*,
  l1.name AS category_l1_name,
  l2.name AS category_l2_name,
  l3.name AS category_l3_name,
  a.custom_name AS asset_name,
  COALESCE(p_asset.address, p_direct.address) AS property_address,
  c.company_name AS contractor_name,
  c.contact_name AS contractor_contact,
  v.company_name AS vendor_name,
  v.contact_name AS vendor_contact,
  mt.task_name AS maintenance_task_name
FROM service_records sr
LEFT JOIN assets a ON sr.asset_id = a.id
LEFT JOIN asset_category_l1 l1 ON a.category_l1_id = l1.id
LEFT JOIN asset_category_l2 l2 ON a.category_l2_id = l2.id
LEFT JOIN asset_category_l3 l3 ON a.category_l3_id = l3.id
LEFT JOIN properties p_asset ON a.property_id = p_asset.id
LEFT JOIN properties p_direct ON sr.property_id = p_direct.id
LEFT JOIN contractors c ON sr.contractor_id = c.id
LEFT JOIN vendors v ON sr.vendor_id = v.id
LEFT JOIN maintenance_tasks mt ON sr.maintenance_task_id = mt.id
ORDER BY sr.service_date DESC;
