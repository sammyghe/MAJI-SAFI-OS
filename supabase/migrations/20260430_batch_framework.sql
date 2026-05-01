-- Batch Framework: extend production_logs for UNBS sign-off chain
ALTER TABLE production_logs ADD COLUMN IF NOT EXISTS volume_raw_water_l       NUMERIC;
ALTER TABLE production_logs ADD COLUMN IF NOT EXISTS volume_treated_water_l   NUMERIC;
ALTER TABLE production_logs ADD COLUMN IF NOT EXISTS estimated_packing_l      NUMERIC;
ALTER TABLE production_logs ADD COLUMN IF NOT EXISTS actual_packaging_l       NUMERIC;
ALTER TABLE production_logs ADD COLUMN IF NOT EXISTS general_remarks          TEXT;
ALTER TABLE production_logs ADD COLUMN IF NOT EXISTS qc_signed_by             uuid REFERENCES team_members(id);
ALTER TABLE production_logs ADD COLUMN IF NOT EXISTS qc_signed_at             TIMESTAMPTZ;
ALTER TABLE production_logs ADD COLUMN IF NOT EXISTS quality_manager_signed_by uuid REFERENCES team_members(id);
ALTER TABLE production_logs ADD COLUMN IF NOT EXISTS quality_manager_signed_at TIMESTAMPTZ;

-- Batch state machine
-- Valid transitions: draft → pending_qc → qc_passed/qc_failed → pending_quality_manager → approved/rejected
-- 'approved' is the only state from which batch_id can be referenced in dispatch
ALTER TABLE production_logs DROP CONSTRAINT IF EXISTS production_logs_status_check;
ALTER TABLE production_logs ADD CONSTRAINT production_logs_status_check
  CHECK (status IN ('draft', 'created', 'pending_qc', 'qc_passed', 'qc_failed', 'pending_quality_manager', 'approved', 'rejected', 'halted', 'dispatched'));

-- batch_id format validation: BATCH-YYYYMMDD-NNN
ALTER TABLE production_logs DROP CONSTRAINT IF EXISTS production_logs_batch_id_format;
ALTER TABLE production_logs ADD CONSTRAINT production_logs_batch_id_format
  CHECK (batch_id ~ '^BATCH-[0-9]{8}-[0-9]{3}$');
