-- NexusClaw Initial Schema Migration Rollback
-- Drops all tables created in the initial migration

-- Drop dependent tables first
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS task_logs;
DROP TABLE IF EXISTS agent_loops;
DROP TABLE IF EXISTS api_keys;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS agents;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS users;

-- Drop indexes
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_projects_owner;
DROP INDEX IF EXISTS idx_agents_project;
DROP INDEX IF EXISTS idx_tasks_status;
DROP INDEX IF EXISTS idx_tasks_agent;
DROP INDEX IF EXISTS idx_tasks_project;
DROP INDEX IF EXISTS idx_tasks_assigned;
DROP INDEX IF EXISTS idx_task_logs_task;
DROP INDEX IF EXISTS idx_task_logs_agent;
DROP INDEX IF EXISTS idx_agent_loops_agent;
DROP INDEX IF EXISTS idx_api_keys_user;
DROP INDEX IF EXISTS idx_api_keys_key;
DROP INDEX IF EXISTS idx_audit_logs_user;
DROP INDEX IF EXISTS idx_audit_logs_action;
DROP INDEX IF EXISTS idx_audit_logs_table;
DROP INDEX IF EXISTS idx_audit_logs_created;
DROP INDEX IF EXISTS idx_tasks_search;
DROP INDEX IF EXISTS idx_agents_search;

-- Drop views
DROP VIEW IF EXISTS project_summary;