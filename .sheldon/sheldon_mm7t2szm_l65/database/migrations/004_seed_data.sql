-- Seed Data Migration
-- This migration inserts initial data for the Legal Document Automation platform

-- Insert practice areas
INSERT INTO practice_areas (name, description) VALUES
('Corporate Law', 'Business formation, governance, and compliance'),
('Intellectual Property', 'Patents, trademarks, and copyrights'),
('Employment Law', 'Workplace policies, contracts, and disputes'),
('Real Estate', 'Property transactions and leases'),
('Family Law', 'Divorce, custody, and related matters'),
('Criminal Law', 'Defense and prosecution services'),
('Tax Law', 'Tax planning and dispute resolution'),
('Litigation', 'Civil and criminal litigation services'),
('Immigration', 'Visa and citizenship services'),
('Environmental Law', 'Compliance and regulatory matters');

-- Insert sample clauses
INSERT INTO clauses (title, content, clause_type, risk_level, jurisdiction, created_by) VALUES
('Confidentiality Clause', 'The parties agree to keep all confidential information strictly confidential...', 'confidentiality', 'medium', 'US', 1),
('Indemnification Clause', 'Party A agrees to indemnify and hold harmless Party B from any claims...', 'indemnification', 'high', 'US', 1),
('Governing Law Clause', 'This agreement shall be governed by and construed in accordance with the laws of...', 'governing_law', 'low', 'US', 1),
('Termination Clause', 'Either party may terminate this agreement upon written notice...', 'termination', 'medium', 'US', 1),
('Liability Limitation', 'In no event shall the total liability exceed the fees paid...', 'liability', 'high', 'US', 1);

-- Insert sample templates
INSERT INTO templates (title, description, content, template_type, practice_area_id, firm_id, created_by) VALUES
('NDA Template', 'Standard Non-Disclosure Agreement', 'This Non-Disclosure Agreement ("Agreement") is entered into by and between...', 'agreement', 1, 1, 1),
('Employment Contract', 'Standard Employment Agreement', 'This Employment Agreement ("Agreement") is made and entered into as of...', 'contract', 3, 1, 1),
('Lease Agreement', 'Commercial Lease Template', 'This Lease Agreement ("Agreement") is made and entered into as of...', 'agreement', 4, 1, 1);

-- Insert sample firms
INSERT INTO firms (name, domain, size_category, subscription_tier) VALUES
('Smith & Associates', 'smithlaw.com', 'small', 'pro'),
('Johnson Legal Group', 'johnsonlegal.com', 'medium', 'enterprise'),
('Wilson & Partners', 'wilsonpartners.com', 'large', 'enterprise'),
('Davis Law Firm', 'davislaw.com', 'solo', 'basic');

-- Insert sample users
INSERT INTO users (email, first_name, last_name, password_hash, role) VALUES
('admin@smithlaw.com', 'John', 'Smith', '$2b$12$somehashedpassword', 'admin'),
('lawyer@smithlaw.com', 'Sarah', 'Johnson', '$2b$12$somehashedpassword', 'lawyer'),
('client@smithlaw.com', 'Michael', 'Wilson', '$2b$12$somehashedpassword', 'client');

-- Insert user-firm relationships
INSERT INTO user_firm (user_id, firm_id, role) VALUES
(1, 1, 'owner'),
(2, 1, 'admin'),
(3, 1, 'member');

-- Insert firm-practice area relationships
INSERT INTO firm_practice_area (firm_id, practice_area_id, expertise_level) VALUES
(1, 1, 5),
(1, 3, 4),
(2, 1, 5),
(2, 2, 4),
(3, 1, 5),
(3, 4, 5),
(4, 1, 3);

-- Insert sample documents
INSERT INTO documents (title, content, document_type, status, created_by, firm_id, practice_area_id, due_date) VALUES
('Client NDA', 'This NDA is entered into by and between...', 'agreement', 'final', 1, 1, 1, '2024-01-15'),
('Employment Agreement - John Doe', 'This employment agreement is made and entered into as of...', 'contract', 'draft', 2, 1, 3, '2024-01-20'),
('Office Lease', 'This lease agreement is made and entered into as of...', 'agreement', 'review', 1, 1, 4, '2024-01-25');

-- Insert document versions
INSERT INTO document_versions (document_id, version_number, content, created_by) VALUES
(1, 1, 'Initial version of Client NDA', 1),
(1, 2, 'Updated with client feedback', 1),
(2, 1, 'Initial draft of employment agreement', 2),
(3, 1, 'First version of office lease', 1);

-- Insert document-clauses relationships
INSERT INTO document_clauses (document_id, clause_id, position, modified_content, risk_score) VALUES
(1, 1, 1, 'Standard confidentiality clause', 2.5),
(1, 4, 2, 'Standard termination clause', 3.0),
(2, 2, 1, 'Standard indemnification clause', 4.5),
(3, 3, 1, 'Standard governing law clause', 1.5);

-- Insert contract reviews
INSERT INTO contract_reviews (document_id, reviewed_by, review_date, risk_summary, overall_risk_score, flagged_clauses, recommendations) VALUES
(1, 1, '2024-01-10', 'Document is ready for signature', 2.0, '[]', 'No changes needed'),
(3, 2, '2024-01-18', 'Minor issues with liability clause', 3.5, '[{"clause_id": 3, "risk": "medium", "reason": "Needs clarification"}]', 'Review liability section');

-- Insert AI analysis results
INSERT INTO ai_analysis_results (document_id, analysis_type, results, confidence_score) VALUES
(1, 'risk_analysis', '{"overall_risk": "low", "key_risks": [], "recommendations": "Document is low risk"}', 0.95),
(2, 'compliance_check', '{"compliant": false, "issues": ["Missing termination clause"], "suggestions": ["Add termination clause"]}', 0.85),
(3, 'clause_extraction', '{"clauses_extracted": 5, "accuracy": 0.92, "missing_clauses": []}', 0.90);