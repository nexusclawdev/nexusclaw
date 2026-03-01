-- Migration: 001_initial_schema
-- Rollback script for initial schema

BEGIN;

-- Drop all tables in reverse order of creation
DROP TABLE IF EXISTS usage_metrics;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS task_executions;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS projects_ai_models;
DROP TABLE IF EXISTS ai_models;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS users;

COMMIT;