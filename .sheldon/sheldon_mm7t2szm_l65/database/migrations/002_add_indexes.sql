-- Add indexes for better query performance
-- This migration adds additional indexes to frequently queried columns

-- Add indexes to document_clauses table
CREATE INDEX idx_document_clauses_document ON document_clauses(document_id);
CREATE INDEX idx_document_clauses_clause ON document_clauses(clause_id);
CREATE INDEX idx_document_clauses_position ON document_clauses(position);

-- Add indexes to contract_reviews table
CREATE INDEX idx_contract_reviews_reviewed_by ON contract_reviews(reviewed_by);
CREATE INDEX idx_contract_reviews_review_date ON contract_reviews(review_date);

-- Add indexes to user_firm table
CREATE INDEX idx_user_firm_user ON user_firm(user_id);
CREATE INDEX idx_user_firm_firm ON user_firm(firm_id);

-- Add indexes to firm_practice_area table
CREATE INDEX idx_firm_practice_area_firm ON firm_practice_area(firm_id);
CREATE INDEX idx_firm_practice_area_practice_area ON firm_practice_area(practice_area_id);

-- Add indexes to templates table
CREATE INDEX idx_templates_firm ON templates(firm_id);
CREATE INDEX idx_templates_practice_area ON templates(practice_area_id);

-- Add indexes to notifications table
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_type ON notifications(type);

-- Add indexes to api_keys table
CREATE INDEX idx_api_keys_expires ON api_keys(expires_at);

-- Add indexes to audit_trail table
CREATE INDEX idx_audit_trail_action ON audit_trail(action);
CREATE INDEX idx_audit_trail_resource ON audit_trail(resource_type, resource_id);

-- Add composite indexes for common query patterns
CREATE INDEX idx_documents_firm_status ON documents(firm_id, status);
CREATE INDEX idx_documents_created_by ON documents(created_by);
CREATE INDEX idx_clauses_type_risk ON clauses(clause_type, risk_level);
CREATE INDEX idx_templates_type_firm ON templates(template_type, firm_id);