#!/bin/bash

# Production start script for Legal Document Automation
# Usage: ./start_prod.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "backend/package.json" ] || [ ! -f "frontend/package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Starting Legal Document Automation in production mode..."

# Build applications
print_status "Building backend..."
cd backend
npm run build
cd ..

print_status "Building frontend..."
cd frontend
npm run build
cd ..

# Start backend
print_status "Starting backend server..."
cd backend
nohup npm start > backend.log 2>&1 &
BACKEND_PID=$!
cd ..

print_status "Backend started with PID: $BACKEND_PID"
print_status "Backend logs: backend/backend.log"

# Start frontend (static files)
print_status "Frontend is served as static files from dist/"
print_status "You can use nginx, apache, or a simple HTTP server"

print_status "Production servers started!"
print_status "Backend: http://localhost:3001"
print_status "Frontend: http://localhost:3000"
print_status "Check backend logs with: tail -f backend/backend.log"

# Wait for backend process
wait $BACKEND_PID