# Legal Document Automation - AI-Powered Document Processing

An AI-powered legal document automation platform that transforms raw legal documents into structured, actionable data using advanced AI models.

## 🚀 Features

- **AI-Powered Document Processing**: Extract key information from legal documents using GPT-4 Vision
- **Structured Data Extraction**: Convert unstructured text into organized JSON data
- **Smart Analysis**: Generate insights and summaries from legal documents
- **User-Friendly Interface**: Modern React frontend with Tailwind CSS
- **Secure Backend**: Node.js/Express with proper authentication and security measures

## 📁 Project Structure

```
.
├── backend/          # Node.js/Express API server
├── frontend/         # React frontend application
├── database/         # Database schema and migrations
└── README.md        # This file
```

## 🛠️ Tech Stack

### Backend
- **Node.js** with TypeScript
- **Express.js** for API routing
- **SQLite/PostgreSQL** for database
- **OpenAI API** for AI processing
- **JWT** for authentication
- **Winston** for logging

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Lucide React** for icons

## 📦 Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key
- Database (SQLite or PostgreSQL)

## 🛠️ Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd legal-document-automation

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Configuration

#### Backend Environment Variables

Copy the example environment file:
```bash
cd backend
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Database
DATABASE_URL=sqlite:./database.db
# DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# OpenAI
OPENAI_API_KEY=your-openai-api-key-here

# JWT
JWT_SECRET=your-jwt-secret-here

# Server
PORT=3001
NODE_ENV=development

# Security
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MINUTES=15
RATE_LIMIT_MAX_REQUESTS=100
```

#### Frontend Environment Variables

Create a `.env` file in the frontend directory:
```env
# API URL
VITE_API_URL=http://localhost:3001
```

### 3. Build the Applications

```bash
# Build backend
cd backend
npm run build

# Build frontend
cd ../frontend
npm run build
```

### 4. Start the Services

#### Option 1: Development Mode

```bash
# Start backend in development mode
cd backend
npm run dev

# Start frontend in development mode (in another terminal)
cd ../frontend
npm run dev
```

#### Option 2: Production Mode

```bash
# Start backend in production
cd backend
npm start

# Serve frontend (static files)
cd ../frontend
# Files are served from dist/ directory
```

## 🚀 API Documentation

### Base URL
- Development: `http://localhost:3001`
- Production: `http://your-domain.com`

### Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh JWT token

#### Document Processing
- `POST /api/documents/upload` - Upload document for processing
- `GET /api/documents/:id` - Get document details
- `GET /api/documents` - List all documents
- `DELETE /api/documents/:id` - Delete document

#### Analysis
- `POST /api/analyze` - Analyze document content
- `GET /api/insights` - Get analysis insights

## 📦 Deployment Options

### Option 1: Docker Deployment

```bash
# Build and run with Docker
cd backend
docker build -t legal-document-automation .
docker run -p 3001:3001 legal-document-automation
```

### Option 2: Vercel (Frontend Only)

```bash
# Deploy frontend to Vercel
cd frontend
vercel --prod
```

### Option 3: Traditional Hosting

Deploy the built files to any Node.js hosting provider (Heroku, AWS, Digital Ocean, etc.).

## 🔧 Configuration Options

### Database Configuration

#### SQLite (Default)
```env
DATABASE_URL=sqlite:./database.db
```

#### PostgreSQL
```env
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
```

### Security Configuration

- **JWT Secret**: Use a strong, random string for production
- **CORS**: Configure allowed origins for your frontend domain
- **Rate Limiting**: Adjust rate limits based on your expected traffic

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 📊 Monitoring and Logging

The application uses Winston for structured logging. Logs are output to the console and can be configured to write to files or external services.

## 🔧 Troubleshooting

### Common Issues

1. **OpenAI API Key Not Working**
   - Ensure your API key is valid and has sufficient credits
   - Check that your account has access to GPT-4 Vision

2. **Database Connection Issues**
   - Verify database URL is correctly formatted
   - Ensure database server is running
   - Check file permissions for SQLite databases

3. **CORS Errors**
   - Verify CORS_ORIGIN matches your frontend domain
   - Check that you're making requests from the correct origin

4. **Build Errors**
   - Ensure all dependencies are installed
   - Check for TypeScript compilation errors
   - Verify environment variables are set

### Debug Mode

Enable debug logging by setting:
```env
DEBUG=legal-document-automation:*
```

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🙏 Acknowledgments

- OpenAI for their powerful AI models
- React and TypeScript communities for excellent tools
- Tailwind CSS for utility-first styling

---

**Built with ❤️ by NexusClaw AI**
© 2024 NexusClaw. All rights reserved.