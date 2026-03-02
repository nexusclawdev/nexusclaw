@echo off
echo Starting Legal Document Automation SaaS...

REM Start backend
echo Starting backend...
cd backend && npm install && npm run dev &

REM Start frontend
echo Starting frontend...
cd frontend && npm install && npm run dev &

REM Wait for processes to start
echo Backend: http://localhost:3000
echo Frontend: http://localhost:5173
echo Deployment package created successfully!
pause