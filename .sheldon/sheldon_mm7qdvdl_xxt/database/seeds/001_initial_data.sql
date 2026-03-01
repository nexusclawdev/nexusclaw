-- Seed data for AI SaaS platform
-- Creates sample users, projects, AI models, and tasks

-- Insert sample users
INSERT INTO users (id, email, name) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'john.doe@example.com', 'John Doe'),
('550e8400-e29b-41d4-a716-446655440001', 'jane.smith@example.com', 'Jane Smith'),
('550e8400-e29b-41d4-a716-446655440002', 'bob.jones@example.com', 'Bob Jones');

-- Insert sample AI models
INSERT INTO ai_models (id, name, provider, model_id, description) VALUES 
('550e8400-e29b-41d4-a716-446655440003', 'GPT-4 Turbo', 'OpenAI', 'gpt-4-turbo', 'Latest OpenAI model for general purpose tasks'),
('550e8400-e29b-41d4-a716-446655440004', 'Claude 3 Sonnet', 'Anthropic', 'claude-3-sonnet', 'Anthropic''s powerful reasoning model'),
('550e8400-e29b-41d4-a716-446655440005', 'GPT-3.5 Turbo', 'OpenAI', 'gpt-3.5-turbo', 'Cost-effective model for simpler tasks'),
('550e8400-e29b-41d4-a716-446655440006', 'DALL-E 3', 'OpenAI', 'dall-e-3', 'Advanced image generation model');

-- Insert sample projects for John Doe
INSERT INTO projects (id, user_id, name, description, status) VALUES 
('550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440000', 'Content Marketing Suite', 'AI-powered content creation and optimization', 'active'),
('550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440000', 'Customer Support Automation', 'AI chatbot and ticket routing system', 'active');

-- Insert sample projects for Jane Smith
INSERT INTO projects (id, user_id, name, description, status) VALUES 
('550e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440001', 'E-commerce Product Descriptions', 'AI-generated product descriptions and SEO', 'active'),
('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440001', 'Social Media Content Generator', 'AI-powered social media post creation', 'active');

-- Link AI models to projects
INSERT INTO projects_ai_models (project_id, ai_model_id) VALUES 
('550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440003'),
('550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440004'),
('550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440003'),
('550e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440005'),
('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440006');

-- Insert sample tasks
INSERT INTO tasks (id, project_id, name, description, status, priority, due_date) VALUES 
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440007', 'Blog Post Generator', 'AI-powered blog post creation tool', 'completed', 'high', '2024-01-10'),
('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440007', 'SEO Optimizer', 'AI-powered SEO analysis and recommendations', 'in_progress', 'high', '2024-01-15'),
('550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440008', 'Chatbot Setup', 'Configure AI chatbot for customer support', 'pending', 'medium', '2024-01-20'),
('550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440009', 'Product Description Template', 'Create AI templates for product descriptions', 'completed', 'high', '2024-01-12'),
('550e8400-e29b-41d4-a716-446655440015', '550e8400-e29b-41d4-a716-446655440010', 'Instagram Post Generator', 'AI tool for creating Instagram content', 'in_progress', 'medium', '2024-01-18');

-- Insert sample task executions
INSERT INTO task_executions (id, task_id, ai_model_id, input_data, output_data, status, execution_time_ms, error_message) VALUES 
('550e8400-e29b-41d4-a716-446655440016', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440003', 
'{"topic": "AI in marketing", "length": "1000 words"}', 
'{"status": "success", "content": "AI is revolutionizing marketing by..."}', 'completed', 2500, NULL),
('550e8400-e29b-41d4-a716-446655440017', '550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440004', 
'{"url": "https://example.com", "keyword": "AI SaaS"}', 
'{"status": "success", "seo_score": 85, "recommendations": ["Add more keywords", "Improve meta description"]}', 'completed', 1800, NULL),
('550e8400-e29b-41d4-a716-446655440018', '550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440005', 
'{"product_type": "laptop", "features": ["16GB RAM", "1TB SSD", "RTX 4080"]}', 
'{"status": "success", "description": "Powerful gaming laptop with..."}', 'completed', 800, NULL);

-- Insert sample usage metrics
INSERT INTO usage_metrics (id, user_id, task_execution_id, metric_type, value) VALUES 
('550e8400-e29b-41d4-a716-446655440019', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440016', 'tokens_used', 1250.50),
('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440017', 'tokens_used', 980.25),
('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440018', 'tokens_used', 450.75);

-- Insert sample subscriptions
INSERT INTO subscriptions (id, user_id, plan, status, current_period_start, current_period_end) VALUES 
('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440000', 'pro', 'active', '2024-01-01', '2024-02-01'),
('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440001', 'starter', 'active', '2024-01-05', '2024-02-05'),
('550e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440002', 'enterprise', 'active', '2024-01-10', '2024-02-10');