-- Legal Document Automation Database Schema
-- Normalized schema with proper relationships and indexes

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'lawyer', 'client')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Firms table
CREATE TABLE firms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE NOT NULL,
    size_category VARCHAR(50) NOT NULL CHECK (size_category IN ('solo', 'small', 'medium', 'large')),
    subscription_tier VARCHAR(50) NOT NULL CHECK (subscription_tier IN ('basic', 'pro', 'enterprise')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User-Firm relationships
CREATE TABLE user_firm (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    firm_id INTEGER REFERENCES firms(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, firm_id)
);

-- Practice Areas
CREATE TABLE practice_areas (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Firm-Practice Area relationships
CREATE TABLE firm_practice_area (
    id SERIAL PRIMARY KEY,
    firm_id INTEGER REFERENCES firms(id) ON DELETE CASCADE,
    practice_area_id INTEGER REFERENCES practice_areas(id) ON DELETE CASCADE,
    expertise_level INTEGER CHECK (expertise_level BETWEEN 1 AND 5),
    UNIQUE(firm_id, practice_area_id)
);

-- Documents table
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT,
    document_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('draft', 'review', 'final', 'archived')),
    created_by INTEGER REFERENCES users(id),
    firm_id INTEGER REFERENCES firms(id),
    practice_area_id INTEGER REFERENCES practice_areas(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP,
    INDEX idx_documents_status (status),
    INDEX idx_documents_firm (firm_id),
    INDEX idx_documents_practice_area (practice_area_id)
);

-- Document Versions
CREATE TABLE document_versions (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_document_versions_document (document_id),
    UNIQUE(document_id, version_number)
);

-- Clauses table
CREATE TABLE clauses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    clause_type VARCHAR(100) NOT NULL,
    risk_level VARCHAR(50) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    jurisdiction VARCHAR(100),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_clauses_type (clause_type),
    INDEX idx_clauses_risk (risk_level)
);

-- Document-Clauses relationships
CREATE TABLE document_clauses (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    clause_id INTEGER REFERENCES clauses(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    modified_content TEXT,
    risk_score DECIMAL(3,2),
    UNIQUE(document_id, clause_id),
    INDEX idx_document_clauses_document (document_id)
);

-- Contract Reviews
CREATE TABLE contract_reviews (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    reviewed_by INTEGER REFERENCES users(id),
    review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    risk_summary TEXT,
    overall_risk_score DECIMAL(3,2),
    flagged_clauses JSONB,
    recommendations TEXT,
    INDEX idx_contract_reviews_document (document_id)
);

-- Templates table
CREATE TABLE templates (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    content TEXT,
    template_type VARCHAR(100) NOT NULL,
    practice_area_id INTEGER REFERENCES practice_areas(id),
    firm_id INTEGER REFERENCES firms(id),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_templates_type (template_type),
    INDEX idx_templates_practice_area (practice_area_id)
);

-- Template-Clauses relationships
CREATE TABLE template_clauses (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES templates(id) ON DELETE CASCADE,
    clause_id INTEGER REFERENCES clauses(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    UNIQUE(template_id, clause_id),
    INDEX idx_template_clauses_template (template_id)
);

-- AI Analysis Results
CREATE TABLE ai_analysis_results (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    analysis_type VARCHAR(100) NOT NULL,
    results JSONB,
    confidence_score DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ai_analysis_document (document_id),
    INDEX idx_ai_analysis_type (analysis_type)
);

-- Audit Trail
CREATE TABLE audit_trail (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_trail_user (user_id),
    INDEX idx_audit_trail_resource (resource_type, resource_id),
    INDEX idx_audit_trail_timestamp (timestamp)
);

-- Notifications
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
    related_resource_type VARCHAR(100),
    related_resource_id INTEGER,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notifications_user (user_id),
    INDEX idx_notifications_read (is_read),
    INDEX idx_notifications_created (created_at)
);

-- API Keys for integrations
CREATE TABLE api_keys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    key_hash VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    permissions JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    INDEX idx_api_keys_user (user_id),
    INDEX idx_api_keys_expires (expires_at)
);

-- Settings table
CREATE TABLE settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    key VARCHAR(100) NOT NULL,
    value JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, key),
    INDEX idx_settings_user (user_id)
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_firms_domain ON firms(domain);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_clauses_created_at ON clauses(created_at);
CREATE INDEX idx_templates_created_at ON templates(created_at);

-- Foreign key constraints with cascading deletes where appropriate
ALTER TABLE document_versions ADD CONSTRAINT fk_document_versions_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE document_clauses ADD CONSTRAINT fk_document_clauses_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE document_clauses ADD CONSTRAINT fk_document_clauses_clause FOREIGN KEY (clause_id) REFERENCES clauses(id) ON DELETE CASCADE;
ALTER TABLE contract_reviews ADD CONSTRAINT fk_contract_reviews_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE template_clauses ADD CONSTRAINT fk_template_clauses_template FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE;
ALTER TABLE template_clauses ADD CONSTRAINT fk_template_clauses_clause FOREIGN KEY (clause_id) REFERENCES clauses(id) ON DELETE CASCADE;
ALTER TABLE ai_analysis_results ADD CONSTRAINT fk_ai_analysis_results_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE audit_trail ADD CONSTRAINT fk_audit_trail_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE notifications ADD CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE api_keys ADD CONSTRAINT fk_api_keys_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE settings ADD CONSTRAINT fk_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;