-- Add additional constraints and validations
-- This migration adds check constraints, unique constraints, and other validations

-- Add check constraints to documents table
ALTER TABLE documents ADD CONSTRAINT chk_document_type CHECK (document_type IN ('contract', 'agreement', 'letter', 'memo', 'brief', 'other'));
ALTER TABLE documents ADD CONSTRAINT chk_document_status CHECK (status IN ('draft', 'review', 'final', 'archived'));

-- Add check constraints to clauses table
ALTER TABLE clauses ADD CONSTRAINT chk_clause_type CHECK (clause_type IN ('liability', 'indemnification', 'confidentiality', 'termination', 'governing_law', 'dispute_resolution', 'other'));
ALTER TABLE clauses ADD CONSTRAINT chk_risk_level CHECK (risk_level IN ('low', 'medium', 'high', 'critical'));

-- Add check constraints to templates table
ALTER TABLE templates ADD CONSTRAINT chk_template_type CHECK (template_type IN ('contract', 'agreement', 'letter', 'memo', 'brief', 'other'));

-- Add check constraints to contract_reviews table
ALTER TABLE contract_reviews ADD CONSTRAINT chk_overall_risk_score CHECK (overall_risk_score BETWEEN 0 AND 10);
ALTER TABLE contract_reviews ADD CONSTRAINT chk_risk_score CHECK (risk_score BETWEEN 0 AND 10);

-- Add check constraints to ai_analysis_results table
ALTER TABLE ai_analysis_results ADD CONSTRAINT chk_confidence_score CHECK (confidence_score BETWEEN 0 AND 1);

-- Add check constraints to user_firm table
ALTER TABLE user_firm ADD CONSTRAINT chk_user_firm_role CHECK (role IN ('owner', 'admin', 'member', 'guest'));

-- Add check constraints to firm_practice_area table
ALTER TABLE firm_practice_area ADD CONSTRAINT chk_expertise_level CHECK (expertise_level BETWEEN 1 AND 5);

-- Add check constraints to api_keys table
ALTER TABLE api_keys ADD CONSTRAINT chk_permissions CHECK (jsonb_typeof(permissions) = 'object');

-- Add check constraints to settings table
ALTER TABLE settings ADD CONSTRAINT chk_settings_value CHECK (jsonb_typeof(value) = 'object' OR jsonb_typeof(value) = 'array' OR jsonb_typeof(value) = 'string' OR jsonb_typeof(value) = 'number' OR jsonb_typeof(value) = 'boolean' OR value IS NULL);

-- Add foreign key constraints with proper cascading
ALTER TABLE documents ADD CONSTRAINT fk_documents_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE documents ADD CONSTRAINT fk_documents_firm FOREIGN KEY (firm_id) REFERENCES firms(id) ON DELETE CASCADE;
ALTER TABLE documents ADD CONSTRAINT fk_documents_practice_area FOREIGN KEY (practice_area_id) REFERENCES practice_areas(id) ON DELETE SET NULL;

ALTER TABLE clauses ADD CONSTRAINT fk_clauses_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE templates ADD CONSTRAINT fk_templates_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE templates ADD CONSTRAINT fk_templates_firm FOREIGN KEY (firm_id) REFERENCES firms(id) ON DELETE CASCADE;
ALTER TABLE templates ADD CONSTRAINT fk_templates_practice_area FOREIGN KEY (practice_area_id) REFERENCES practice_areas(id) ON DELETE SET NULL;

ALTER TABLE audit_trail ADD CONSTRAINT fk_audit_trail_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE notifications ADD CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE api_keys ADD CONSTRAINT fk_api_keys_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE settings ADD CONSTRAINT fk_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;