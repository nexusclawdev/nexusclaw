# Task Manager - Production-Ready Application

A modern, full-stack task management application built with React, Node.js, and SQLite. This application provides a comprehensive solution for managing tasks, projects, and team collaboration with a clean, intuitive interface.

## 🚀 Features

### Core Features
- ✅ **Task Management**: Create, edit, delete, and organize tasks with drag-and-drop functionality
- 📅 **Due Dates & Reminders**: Set due dates and receive notifications for upcoming deadlines
- 👥 **User Authentication**: Secure login system with JWT tokens
- 👤 **User Profiles**: Manage user information and preferences
- 📱 **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- 🔍 **Search & Filter**: Quickly find tasks using advanced search and filtering
- 📊 **Progress Tracking**: Visual progress bars and completion statistics
- 🔄 **Real-time Updates**: Live updates for task changes

### Technical Features
- 🔐 **Security**: Helmet.js protection, rate limiting, CORS configuration
- 📊 **Analytics**: Detailed logging with Winston for monitoring and debugging
- 🗄️ **Data Persistence**: SQLite database with Sequelize ORM
- 🔒 **API Documentation**: Comprehensive API endpoints with authentication
- 🚀 **Performance**: Optimized for fast loading and smooth interactions
- 🐛 **Error Handling**: Graceful error handling with user-friendly messages
- 📱 **Progressive Web App**: Installable on mobile devices

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.2.0 | UI Library |
| Vite | 4.5.0 | Build Tool & Dev Server |
| TypeScript | 5.3.2 | Type Safety |
| Tailwind CSS | 3.3.0 | Utility-First Styling |
| React Router | 6.8.1 | Client-Side Routing |
| Axios | 1.6.2 | HTTP Client |
| Lucide React | 0.263.1 | Icons |
| React Hook Form | 7.42.2 | Form Handling |
| React Hot Toast | 2.4.0 | Notifications |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime Environment |
| Express | 4.18.2 | Web Framework |
| TypeScript | 5.3.2 | Type Safety |
| SQLite3 | 5.1.6 | Database Engine |
| Sequelize | 6.35.1 | ORM |
| JWT | 9.0.2 | Authentication |
| Winston | 3.11.0 | Logging |
| Helmet | 7.1.0 | Security Headers |
| CORS | 2.8.5 | Cross-Origin Resource Sharing |
| Rate Limiter | 7.1.0 | API Rate Limiting |

## 📋 Prerequisites

Before getting started, ensure you have the following installed:

- **Node.js**: Version 18 or higher
- **npm**: Version 9 or higher (comes with Node.js)
- **Git**: For version control (optional)

You can verify your Node.js installation:
```bash
node --version
npm --version
```

## 🚀 Quick Start

### Development

1. **Clone the repository**
   ```bash
git clone <repository-url>
cd task-manager
```

2. **Install dependencies**
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

3. **Configure environment variables**
   ```bash
   # Copy environment files
   cd ../backend
   cp .env.example .env
   
   # Edit .env with your configuration
   # PORT=3000
   # JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   # DATABASE_TYPE=sqlite
   # DATABASE_FILE=./data/app.sqlite
   # NODE_ENV=development
   # CORS_ORIGIN=http://localhost:5173
   ```

4. **Start the application**
   ```bash
   # Option 1: Using start scripts (recommended)
   ./start.sh  # Unix/Mac
   # or
   start.bat  # Windows
   
   # Option 2: Manual start
   # Terminal 1 (Backend)
   cd backend && npm run dev
   
   # Terminal 2 (Frontend)
   cd frontend && npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - Health Check: http://localhost:3000/health

### Production

For production deployment, we recommend using Docker:

1. **Build Docker images**
   ```bash
   docker-compose build
   ```

2. **Start services**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - Frontend: http://localhost:80
   - Backend API: http://localhost:80/api

## 📦 Environment Variables

### Backend (.env)
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| PORT | Server port | 3000 | No |
| JWT_SECRET | Secret key for JWT tokens | (none) | Yes |
| DATABASE_TYPE | Database type (sqlite, postgres, mysql) | sqlite | No |
| DATABASE_FILE | SQLite database file path | ./data/app.sqlite | No |
| NODE_ENV | Environment mode | development | No |
| CORS_ORIGIN | Allowed CORS origins | http://localhost:5173 | No |
| LOG_LEVEL | Winston log level | info | No |
| RATE_LIMIT_WINDOW | Rate limit window (minutes) | 15 | No |
| RATE_LIMIT_MAX | Max requests per window | 100 | No |

### Frontend (.env)
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| VITE_API_URL | Backend API URL | http://localhost:3000/api | No |
| VITE_APP_NAME | Application name | Task Manager | No |

## 🔧 API Endpoints

### Authentication
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | /api/auth/register | Register new user | No |
| POST | /api/auth/login | User login | No |
| POST | /api/auth/refresh | Refresh JWT token | Yes |
| POST | /api/auth/logout | User logout | Yes |

### Tasks
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | /api/tasks | Get all tasks | Yes |
| POST | /api/tasks | Create new task | Yes |
| GET | /api/tasks/:id | Get task by ID | Yes |
| PUT | /api/tasks/:id | Update task | Yes |
| DELETE | /api/tasks/:id | Delete task | Yes |
| PATCH | /api/tasks/:id/complete | Toggle task completion | Yes |

### Users
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | /api/users/profile | Get user profile | Yes |
| PUT | /api/users/profile | Update profile | Yes |
| GET | /api/users/tasks | Get user's tasks | Yes |

### System
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | /health | Health check | No |
| GET | /api/status | System status | No |

## 📁 Project Structure

```
task-manager/
├── backend/
│   ├── src/
│   │   ├── database/          # Database configuration
│   │   ├── middleware/        # Express middleware
│   │   ├── models/            # Database models
│   │   ├── routes/            # API routes
│   │   ├── services/          # Business logic
│   │   └── server.ts          # Main server file
│   ├── data/                 # SQLite database files
│   ├── logs/                 # Application logs
│   ├── .env                 # Environment variables
│   ├── .env.example         # Environment template
│   ├── package.json         # Dependencies
│   ├── tsconfig.json        # TypeScript config
│   └── dist/                # Compiled JavaScript
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom hooks
│   │   ├── services/        # API services
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # Utility functions
│   ├── public/              # Static assets
│   ├── .env                 # Frontend environment
│   ├── .env.example         # Frontend template
│   ├── package.json         # Dependencies
│   ├── tsconfig.json        # TypeScript config
│   ├── vite.config.ts       # Vite configuration
│   └── tailwind.config.js   # Tailwind configuration
├── database/               # Database migrations
├── docs/                  # Documentation
├── logs/                 # Combined logs
├── .gitignore            # Git ignore rules
├── docker-compose.yml    # Docker Compose config
├── Dockerfile           # Docker configuration
└── README.md            # This file
```

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
git checkout -b feature/amazing-feature
```
3. **Make your changes**
4. **Test thoroughly**
5. **Submit a pull request**

### Code Style
- Use TypeScript for type safety
- Follow Prettier formatting
- Write comprehensive tests
- Include proper error handling
- Add meaningful comments for complex logic

### Development Workflow
1. Create feature branch
2. Write tests first (TDD)
3. Implement functionality
4. Run linting and tests
5. Update documentation
6. Submit PR for review

## 🔧 Troubleshooting

### Common Issues

**Backend won't start**
```bash
# Check if port 3000 is available
netstat -tulpn | grep :3000
# Kill conflicting processes if needed
```

**Frontend build fails**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Database connection issues**
```bash
# Check if data directory exists
mkdir -p data
# Check file permissions
ls -la data/
```

**CORS errors**
```bash
# Verify CORS_ORIGIN in .env matches your frontend URL
# Check for typos in the URL
```

### Debug Mode
Enable debug logging:
```bash
# Backend
DEBUG=task-manager:* npm run dev

# Frontend
VITE_DEBUG=true npm run dev
```

## 🔒 Security Best Practices

### Production Deployment
- Change JWT_SECRET to a strong, random value
- Use HTTPS in production
- Set appropriate CORS policies
- Implement proper rate limiting
- Keep dependencies updated
- Use environment variables for sensitive data

### API Security
- Never expose sensitive data in responses
- Validate all input data
- Use parameterized queries
- Implement proper authentication
- Log security events

### Data Protection
- Encrypt sensitive data at rest
- Use secure password hashing
- Implement data retention policies
- Regular security audits

## 📊 Monitoring & Logging

The application includes comprehensive logging:

- **Error logs**: `backend/logs/error.log`
- **Combined logs**: `backend/logs/combined.log`
- **Frontend console**: Browser developer tools
- **Health checks**: `/health` endpoint

### Log Levels
- **error**: System errors, failures
- **warn**: Potential issues, warnings
- **info**: General information, requests
- **debug**: Detailed debugging information
- **verbose**: Extra verbose output

## 🚀 Performance Optimization

### Frontend
- Code splitting with dynamic imports
- Image optimization
- Lazy loading components
- Service worker for caching

### Backend
- Database connection pooling
- Response compression
- Caching strategies
- Efficient database queries

## 📱 Mobile Support

The application is fully responsive and includes:

- Touch-friendly interfaces
- Mobile-optimized layouts
- Progressive Web App capabilities
- Offline support (coming soon)
- Push notifications (coming soon)

## 🔄 Continuous Integration

Recommended CI/CD setup:

1. **Automated testing** on every commit
2. **Build verification** in staging environment
3. **Security scanning** for dependencies
4. **Performance testing** before deployment
5. **Automated deployment** to production

## 📚 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:
- Check the documentation
- Review the FAQ section
- Search existing issues
- Create a new issue with detailed information

## 🙏 Acknowledgments

- React team for the amazing library
- Vite for blazing fast builds
- Tailwind CSS for utility-first styling
- All contributors and maintainers of dependencies

---

**Built with ❤️ by Sheldon AI**

*Last updated: March 2024*

---

*This README is automatically generated and will be updated as the project evolves.*