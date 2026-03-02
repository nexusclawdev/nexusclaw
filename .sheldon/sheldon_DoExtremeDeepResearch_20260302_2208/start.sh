#!/bin/bash

echo "Starting Legal Document Automation SaaS..."

# Start backend
echo "Starting backend..."
cd backend && npm install && npm run dev &

# Start frontend
echo "Starting frontend..."
cd frontend && npm install && npm run dev &

# Wait for processes to start
echo "Backend: http://localhost:3000"
echo "Frontend: http://localhost:5173"
echo "Deployment package created successfully!"
wait