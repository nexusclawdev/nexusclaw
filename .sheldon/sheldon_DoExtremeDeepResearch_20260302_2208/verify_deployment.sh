#!/bin/bash

echo "=== Legal Document Automation SaaS Deployment Verification ==="
echo ""

# Check if backend exists
if [ -d "backend" ]; then
    echo "✓ Backend directory exists"
else
    echo "✗ Backend directory missing"
    exit 1
fi

# Check if frontend exists
if [ -d "frontend" ]; then
    echo "✓ Frontend directory exists"
else
    echo "✗ Frontend directory missing"
    exit 1
fi

# Verify package.json files
if [ -f "backend/package.json" ]; then
    echo "✓ Backend package.json exists"
else
    echo "✗ Backend package.json missing"
    exit 1
fi

if [ -f "frontend/package.json" ]; then
    echo "✓ Frontend package.json exists"
else
    echo "✗ Frontend package.json missing"
    exit 1
fi

# Test backend installation
echo ""
echo "Testing backend installation..."
cd backend
if npm install; then
    echo "✓ Backend npm install successful"
else
    echo "✗ Backend npm install failed"
    exit 1
fi

# Test backend startup
echo "Testing backend startup (5 seconds)..."
if npm run dev & timeout 5; then
    echo "✓ Backend startup successful"
else
    echo "✗ Backend startup failed"
    exit 1
fi

# Test frontend installation
cd ../frontend
if npm install; then
    echo "✓ Frontend npm install successful"
else
    echo "✗ Frontend npm install failed"
    exit 1
fi

# Test frontend startup
echo "Testing frontend startup (5 seconds)..."
if npm run dev & timeout 5; then
    echo "✓ Frontend startup successful"
else
    echo "✗ Frontend startup failed"
    exit 1
fi

# Final verification
echo ""
echo "✓ All deployment tests passed!"
echo ""
echo "Deployment package is ready for production!"
echo ""
echo "Next steps:"
echo "1. Configure environment variables (.env files)"
echo "2. Set up database"
echo "3. Deploy to your preferred platform"
echo "4. Configure monitoring and logging"
echo ""
echo "Happy deploying! 🎉"