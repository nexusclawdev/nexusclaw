#!/bin/bash

# Start script for Legal Document Automation
# Usage: ./start.sh [dev|prod]

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

# Check if environment variables are set
if [ ! -f "backend/.env" ]; then
    print_warning "Backend .env file not found. Using defaults..."
    cp backend/.env.example backend/.env
fi

# Parse command line arguments
MODE="dev"
if [ "$1" = "prod" ]; then
    MODE="prod"
fi

print_status "Starting Legal Document Automation in ${MODE} mode..."

# Function to check dependencies
check_dependencies() {
    print_status "Checking dependencies..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    # Check Docker (optional)
    if command -v docker &> /dev/null; then
        print_status "Docker is available for container deployment"
    fi
}

# Function to start in development mode
start_dev() {
    print_status "Starting development servers..."
    
    # Start backend
    print_status "Starting backend server..."
    cd backend
    npm run dev &
    BACKEND_PID=$!
    cd ..
    
    # Wait a moment for backend to start
    sleep 3
    
    # Start frontend
    print_status "Starting frontend development server..."
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    
    print_status "Development servers started!"
    print_status "Backend: http://localhost:3001"
    print_status "Frontend: http://localhost:3000"
    print_status "Press Ctrl+C to stop all servers"
    
    # Wait for processes
    wait $BACKEND_PID $FRONTEND_PID
}

# Function to start in production mode
start_prod() {
    print_status "Starting production servers..."
    
    # Build applications
    print_status "Building applications..."
    cd backend
    npm run build
    cd ..
    
    cd frontend
    npm run build
    cd ..
    
    # Start backend
    print_status "Starting backend server..."
    cd backend
    npm start &
    BACKEND_PID=$!
    cd ..
    
    # Start frontend (static files)
    print_status "Frontend is served as static files from dist/"
    print_status "You can use a simple HTTP server or nginx"
    
    print_status "Production servers started!"
    print_status "Backend: http://localhost:3001"
    print_status "Frontend: http://localhost:3000"
    print_status "Press Ctrl+C to stop servers"
    
    # Wait for backend process
    wait $BACKEND_PID
}

# Function to start with Docker
start_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    
    print_status "Starting services with Docker Compose..."
    
    # Copy environment variables if needed
    if [ ! -f "backend/.env" ]; then
        cp backend/.env.example backend/.env
    fi
    
    # Start services
    docker-compose up --build
}

# Main execution
main() {
    print_status "Legal Document Automation Deployment Script"
    print_status "============================================"
    
    check_dependencies
    
    case $MODE in
        "dev")
            start_dev
            ;;
        "prod")
            start_prod
            ;;
        "docker")
            start_docker
            ;;
        *)
            print_error "Unknown mode: $MODE"
            print_status "Usage: $0 [dev|prod|docker]"
            exit 1
            ;;
    esac
}

# Trap Ctrl+C to clean up
cleanup() {
    print_status "Shutting down servers..."
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    print_status "Servers stopped"
}

trap cleanup EXIT

# Run main function
main "$@"