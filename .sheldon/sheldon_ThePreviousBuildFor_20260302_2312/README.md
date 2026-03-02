# AI Research SaaS

## Overview

AI Research SaaS is a comprehensive platform for conducting deep research using multiple AI models. It provides researchers, analysts, and businesses with tools to perform complex research tasks, analyze data, and generate insights using state-of-the-art AI models.

## Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn
- PostgreSQL (or SQLite for development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sheldon_ThePreviousBuildFor_20260302_2312
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

## Environment Variables

Create a `.env` file based on `.env.example` with the following variables:

### Backend Configuration
```bash
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/ai_research_db
# For SQLite: DATABASE_URL=sqlite:./data/database.sqlite

# JWT Configuration
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# API Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# Auth Rate Limiting
AUTH_RATE_LIMIT_WINDOW=15
AUTH_RATE_LIMIT_MAX_REQUESTS=10

# CORS
CORS_ORIGIN=http://localhost:5173

# OpenAI API
OPENAI_API_KEY=your_openai_api_key_here

# Claude API
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Google AI API
GOOGLE_AI_API_KEY=your_google_ai_api_key_here

# Server Configuration
PORT=3000
NODE_ENV=development
```

### Frontend Configuration
```bash
# Vite Configuration
VITE_API_URL=http://localhost:3000
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key_here
VITE_GOOGLE_AI_API_KEY=your_google_ai_api_key_here
```

## API Reference

### Authentication

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

### Research

#### Create Research Project
```http
POST /api/research/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Market Research",
  "description": "Research on AI trends",
  "model": "gpt-4"
}
```

#### Get Research Projects
```http
GET /api/research/projects
Authorization: Bearer <token>
```

#### Get Project Details
```http
GET /api/research/projects/:id
Authorization: Bearer <token>
```

#### Update Project
```http
PUT /api/research/projects/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "description": "Updated Description"
}
```

#### Delete Project
```http
DELETE /api/research/projects/:id
Authorization: Bearer <token>
```

### Models

#### Available Models
```http
GET /api/models
Authorization: Bearer <token>
```

#### Set Default Model
```http
PUT /api/users/default-model
Authorization: Bearer <token>
Content-Type: application/json

{
  "model": "claude-3-sonnet"
}
```

### Data

#### Upload Data
```http
POST /api/data/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "file": <file>
}
```

#### Get Uploaded Files
```http
GET /api/data/files
Authorization: Bearer <token>
```

## Tech Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **PostgreSQL** - Primary database
- **Sequelize** - ORM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Joi** - Input validation
- **helmet** - Security headers
- **cors** - Cross-origin resource sharing
- **express-rate-limit** - Rate limiting

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **React Query** - Server state management
- **Zustand** - Client state management

### AI Integration
- **OpenAI API** - GPT models
- **Anthropic API** - Claude models
- **Google AI API** - Gemini models

## User Manual

### Getting Started

1. **Register an account**
   - Navigate to the registration page
   - Enter your email and password
   - Verify your email (if required)

2. **Create your first research project**
   - Click "New Project" in the dashboard
   - Enter project title and description
   - Select your preferred AI model
   - Click "Create"

3. **Configure your project**
   - Set research parameters
   - Upload any relevant data files
   - Configure model-specific settings

4. **Run your research**
   - Click "Start Research"
   - Monitor progress in real-time
   - View results when complete

### Features

#### Multi-Model Support
- Switch between different AI models
- Compare results across models
- Set default model preferences

#### Data Management
- Upload various file formats
- Organize data into projects
- Manage file versions

#### Real-time Results
- Live progress tracking
- Interactive result visualization
- Export results in multiple formats

#### Collaboration
- Share projects with team members
- Assign roles and permissions
- Collaborative editing

### Best Practices

1. **Data Preparation**
   - Clean and structure your data
   - Use appropriate file formats
   - Organize data logically

2. **Model Selection**
   - Choose the right model for your task
   - Consider cost vs. performance
   - Test with different models

3. **Result Analysis**
   - Review results critically
   - Cross-reference with other sources
   - Document findings thoroughly

## Deployment

### Docker

1. **Build the Docker image**
   ```bash
   docker build -t ai-research-saas .
   ```

2. **Run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

### Environment Variables for Production

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=your_production_secret
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
```

## Troubleshooting

### Common Issues

1. **Database Connection**
   - Check database credentials
   - Verify database server is running
   - Check network connectivity

2. **API Key Issues**
   - Verify API keys are correctly set
   - Check API key permissions
   - Test API endpoints directly

3. **Frontend Build Issues**
   - Clear browser cache
   - Check console for errors
   - Verify environment variables

### Debug Mode

Enable debug mode by setting:
```bash
DEBUG=ai-research:*
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Contact the development team

---

**Last Updated:** 2026-03-02
**Version:** 1.0.0