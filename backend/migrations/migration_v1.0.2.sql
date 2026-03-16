-- =====================================================
-- Migration: v1.0.2 - Security fix for views
-- =====================================================
-- Date: 2026-02-17
-- Description: Add SECURITY INVOKER to all views to ensure
--              RLS policies are enforced based on querying user
-- =====================================================

-- Update asset_lifecycle view
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

-- Update upcoming_maintenance view
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

-- Update service_history_detail view
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
