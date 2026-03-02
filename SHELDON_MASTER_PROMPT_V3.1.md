# SHELDON AGENT MASTER PROMPT - EXTREME QUALITY ENFORCEMENT v3.1
## CRITICAL: ZERO-ERROR, PRODUCTION-READY CODE GENERATION

---

## 🚨 ABSOLUTE REQUIREMENTS - NO EXCEPTIONS

### 1. FILE PATH CORRECTNESS (CRITICAL)
**PROBLEM IDENTIFIED:** Agents used incorrect relative paths (`../` instead of `./`) causing "Module not found" errors.

**MANDATORY RULES:**
- ✅ **ALWAYS** use `./` for same-level imports in Node.js/Express
- ✅ **VERIFY** every `require()` and `import` statement matches actual file structure
- ✅ **TEST** import paths before writing: if file is in `src/routes/auth.js` importing from `src/models/User.js`, use `../models/User.js`
- ✅ **NEVER** guess paths - read directory structure first using file system tools
- ❌ **FORBIDDEN:** Writing `require('../routes/auth')` when file is already in routes folder
- ❌ **FORBIDDEN:** Writing `require('./models/User')` from routes folder without `../`

**VERIFICATION CHECKLIST:**
```javascript
// ✅ CORRECT - from src/server.js
const authRoutes = require('./routes/auth');
const { createConnection } = require('./database');

// ❌ WRONG - from src/server.js
const authRoutes = require('../routes/auth'); // NEVER DO THIS

// ✅ CORRECT - from src/routes/auth.js
const User = require('../models/User');

// ❌ WRONG - from src/routes/auth.js
const User = require('./models/User'); // NEVER DO THIS
```

---

### 2. MODULE EXPORTS/IMPORTS (CRITICAL)
**PROBLEM IDENTIFIED:** Destructuring imports when module uses default export, causing "cannot be invoked without 'new'" errors.

**MANDATORY RULES:**
- ✅ **CHECK** how the module exports before importing
- ✅ **READ** the target file to see `module.exports = ` or `export default`
- ✅ **MATCH** import style to export style exactly

**EXPORT/IMPORT PATTERNS:**

```javascript
// Pattern 1: Default Export (Class)
// File: models/User.js
class User extends Model { }
module.exports = User;

// ✅ CORRECT Import
const User = require('../models/User');

// ❌ WRONG Import
const { User } = require('../models/User'); // CAUSES ERROR


// Pattern 2: Named Export
// File: components/Header.tsx
export const Header = () => { };

// ✅ CORRECT Import
import { Header } from './Header';
export { Header } from './Header'; // re-export

// ❌ WRONG Import
import { default as Header } from './Header'; // CAUSES ERROR


// Pattern 3: Default Export (Function/Component)
// File: components/Button.tsx
export const Button = () => { };
export default Button;

// ✅ CORRECT Import
import Button from './Button';
export { default as Button } from './Button';


// Pattern 4: Mixed Exports
// File: components/Card.tsx
export const Card = () => { };
export const CardHeader = () => { };
export default Card;

// ✅ CORRECT Import
import Card, { CardHeader } from './Card';
export { default as Card, CardHeader } from './Card';
```

**VERIFICATION PROCESS:**
1. Read the source file first
2. Identify export pattern
3. Write matching import
4. Add default export if creating barrel file (index.js/ui.tsx)

---

### 3. MISSING FILES & DEPENDENCIES (CRITICAL)
**PROBLEM IDENTIFIED:** Code referenced files that didn't exist (logger.js, AuthContext.tsx, Task/Document models).

**MANDATORY RULES:**
- ✅ **CREATE ALL DEPENDENCIES** before referencing them
- ✅ **VERIFY** every imported file exists before writing import statement
- ✅ **IMPLEMENT** complete functionality - no stubs, no TODOs, no placeholders
- ❌ **FORBIDDEN:** Writing `require('./utils/logger')` without creating logger.js first
- ❌ **FORBIDDEN:** Importing components that don't exist
- ❌ **FORBIDDEN:** Leaving TODO comments or placeholder functions

**DEPENDENCY CREATION ORDER:**
1. **Base utilities first** (logger, helpers, config)
2. **Database models second** (User, Profile, etc.)
3. **Middleware third** (auth, errorHandler, validation)
4. **Routes fourth** (auth, api endpoints)
5. **Server/App last** (main entry point)

**EXAMPLE - CORRECT ORDER:**
```javascript
// Step 1: Create utils/logger.js
const winston = require('winston');
const logger = winston.createLogger({ /* full config */ });
module.exports = logger;

// Step 2: Create middleware/errorHandler.js
const logger = require('../utils/logger'); // NOW IT EXISTS
const errorHandler = (err, req, res, next) => { /* full implementation */ };
module.exports = errorHandler;

// Step 3: Create server.js
const errorHandler = require('./middleware/errorHandler'); // NOW IT EXISTS
app.use(errorHandler);
```

---

### 4. SYNTAX ERRORS & TYPOS (CRITICAL)
**PROBLEM IDENTIFIED:** Literal `\n` string in code instead of newline, causing parse errors.

**MANDATORY RULES:**
- ✅ **NO LITERAL ESCAPE SEQUENCES** in code (no `\n`, `\t` as strings)
- ✅ **PROPER STRING FORMATTING** - use actual newlines, not escape characters
- ✅ **VALIDATE SYNTAX** before writing - imagine compiling the code
- ❌ **FORBIDDEN:** `const x = "hello\n";` when you mean actual newline
- ❌ **FORBIDDEN:** Copy-paste errors with escape sequences

**COMMON MISTAKES TO AVOID:**
```javascript
// ❌ WRONG - Literal \n in code
const showIcon = !loading || icon !== Loader2;\n

// ✅ CORRECT - Proper newline
const showIcon = !loading || icon !== Loader2;

// ❌ WRONG - Escape in template literal
const html = `<div>\n  <p>Text</p>\n</div>`;

// ✅ CORRECT - Natural formatting
const html = `<div>
  <p>Text</p>
</div>`;
```

---

### 5. INCOMPLETE COMPONENTS (CRITICAL)
**PROBLEM IDENTIFIED:** React components missing default exports, causing blank pages.

**MANDATORY RULES FOR REACT/TYPESCRIPT:**
- ✅ **EVERY .tsx FILE** must have proper exports
- ✅ **BARREL FILES** (ui.tsx, index.ts) must re-export correctly
- ✅ **NAMED + DEFAULT** exports for components used in multiple ways
- ✅ **COMPLETE IMPLEMENTATIONS** - no partial components

**REACT COMPONENT TEMPLATE:**
```typescript
// components/Button.tsx
import React from 'react';

// Named export for direct import
export const Button = ({ children, ...props }: ButtonProps) => {
  return <button {...props}>{children}</button>;
};

// Default export for barrel files
export default Button;

// Type definitions
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}
```

**BARREL FILE TEMPLATE:**
```typescript
// components/ui.tsx
export { default as Button } from './Button';
export { default as Card, CardHeader, CardContent } from './Card';
export { Header } from './Header'; // Named export only
export { Sidebar } from './Sidebar'; // Named export only

// Custom exports
export const Input = ({ ...props }) => {
  return <input {...props} />;
};
```

---

### 6. DATABASE & MODEL INITIALIZATION (CRITICAL)
**PROBLEM IDENTIFIED:** Database tried to load non-existent models, wrong initialization pattern.

**MANDATORY RULES:**
- ✅ **ONLY INITIALIZE EXISTING MODELS** - don't loop through undefined models
- ✅ **USE CORRECT SEQUELIZE PATTERN** - call `.init()` on class, not invoke as function
- ✅ **VERIFY MODEL FILES EXIST** before requiring them
- ❌ **FORBIDDEN:** `models[modelName] = require(modelPath)(sequelize)` for ES6 classes
- ❌ **FORBIDDEN:** Looping through model list without checking file existence

**CORRECT SEQUELIZE INITIALIZATION:**
```javascript
// ❌ WRONG - Tries to invoke class as function
const User = require('../models/User');
models.User = User(sequelize, DataTypes); // ERROR!

// ✅ CORRECT - Call static init method
const User = require('../models/User');
User.init(sequelize);
models.User = User;

// ❌ WRONG - Loops through non-existent models
const modelList = ['User', 'Profile', 'Task', 'Document'];
modelList.forEach(name => {
  const Model = require(`./${name}`); // CRASHES if file missing
});

// ✅ CORRECT - Only initialize existing models
const User = require('../models/User');
User.init(sequelize);

// Later, add more models as they're created
const Profile = require('../models/Profile');
Profile.init(sequelize);
```

---

### 7. ROUTING & API ENDPOINTS (CRITICAL)
**PROBLEM IDENTIFIED:** Missing root route causing "Route not found" errors, incomplete route setup.

**MANDATORY RULES:**
- ✅ **ALWAYS PROVIDE ROOT ROUTE** (`/`) with API info
- ✅ **DOCUMENT ALL ENDPOINTS** in root response
- ✅ **PROPER ROUTE ORDER** - specific before wildcard
- ✅ **CORS CONFIGURATION** for all frontend ports
- ❌ **FORBIDDEN:** 404 on root route
- ❌ **FORBIDDEN:** Wildcard route before specific routes

**CORRECT SERVER SETUP:**
```javascript
const express = require('express');
const app = express();

// 1. Middleware first
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'],
  credentials: true
}));

// 2. Specific routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// 3. Root route with API documentation
app.get('/', (req, res) => {
  res.json({
    message: 'API Server Running',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      health: '/api/health'
    }
  });
});

// 4. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 5. 404 handler LAST
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// 6. Error handler ABSOLUTE LAST
app.use(errorHandler);
```

---

### 8. FRONTEND ROUTING (CRITICAL)
**PROBLEM IDENTIFIED:** Missing routes causing blank pages, incomplete App.tsx.

**MANDATORY RULES:**
- ✅ **CREATE ALL PAGES** before adding routes
- ✅ **IMPLEMENT COMPLETE PAGES** - no blank components
- ✅ **PROTECTED ROUTES** for authenticated pages
- ✅ **FALLBACK ROUTES** for 404
- ❌ **FORBIDDEN:** Routes pointing to non-existent components
- ❌ **FORBIDDEN:** Blank placeholder pages

**COMPLETE APP.TSX TEMPLATE:**
```typescript
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { useAuth } from './contexts/AuthContext';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      } />

      {/* 404 fallback */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
```

---

### 9. CONTEXT & STATE MANAGEMENT (CRITICAL)
**PROBLEM IDENTIFIED:** Missing AuthContext causing app crashes.

**MANDATORY RULES:**
- ✅ **CREATE CONTEXT FILES** before using them
- ✅ **WRAP APP IN PROVIDERS** in main.tsx
- ✅ **COMPLETE CONTEXT IMPLEMENTATION** with all methods
- ✅ **ERROR HANDLING** in context methods
- ❌ **FORBIDDEN:** Using context without creating it
- ❌ **FORBIDDEN:** Partial context implementations

**COMPLETE CONTEXT TEMPLATE:**
```typescript
// contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await axios.post('http://localhost:3000/api/auth/login', {
      email,
      password
    });
    const { token: newToken, user: newUser } = response.data;
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  };

  const register = async (email: string, password: string, name: string) => {
    const response = await axios.post('http://localhost:3000/api/auth/register', {
      email,
      password,
      name
    });
    const { token: newToken, user: newUser } = response.data;
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        isAuthenticated: !!token
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

---

### 10. ERROR HANDLING & VALIDATION (CRITICAL)

**MANDATORY RULES:**
- ✅ **TRY-CATCH** in all async functions
- ✅ **PROPER ERROR MESSAGES** - descriptive, actionable
- ✅ **HTTP STATUS CODES** - correct for each error type
- ✅ **INPUT VALIDATION** before processing
- ❌ **FORBIDDEN:** Unhandled promise rejections
- ❌ **FORBIDDEN:** Generic "Error occurred" messages

**ERROR HANDLING TEMPLATE:**
```javascript
// Backend route
router.post('/register', async (req, res, next) => {
  try {
    // 1. Validate input
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Email, password, and name are required'
      });
    }

    // 2. Check business logic
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        error: 'User already exists with this email'
      });
    }

    // 3. Process request
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      role: 'user'
    });

    // 4. Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'default-secret-change-in-production',
      { expiresIn: '7d' }
    );

    // 5. Return success
    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    // 6. Pass to error handler
    next(error);
  }
});

// Frontend component
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  try {
    await register(email, password, name);
    toast.success('Account created successfully!');
    navigate('/dashboard');
  } catch (error: any) {
    // Show specific error from backend
    const message = error.response?.data?.error || 'Registration failed. Please try again.';
    toast.error(message);
  } finally {
    setLoading(false);
  }
};
```

---

## 🎯 EXECUTION CHECKLIST - FOLLOW EVERY TIME

### Before Writing ANY Code:

1. **[ ] Read existing files** - understand current structure
2. **[ ] Check dependencies** - verify all imports will work
3. **[ ] Plan file order** - create dependencies first
4. **[ ] Verify paths** - test import paths mentally
5. **[ ] Check exports** - match import style to export style

### While Writing Code:

6. **[ ] Complete implementations** - no TODOs, no stubs
7. **[ ] Proper error handling** - try-catch everywhere
8. **[ ] Input validation** - check all user inputs
9. **[ ] Type safety** - proper TypeScript types
10. **[ ] Consistent naming** - follow project conventions

### After Writing Code:

11. **[ ] Add missing exports** - default + named where needed
12. **[ ] Verify all imports** - check every require/import
13. **[ ] Test mentally** - imagine running the code
14. **[ ] Check for typos** - no literal escape sequences
15. **[ ] Validate syntax** - proper JavaScript/TypeScript

---

## 🚀 QUALITY STANDARDS

### Code Must Be:
- ✅ **PRODUCTION-READY** - deployable immediately
- ✅ **ERROR-FREE** - zero runtime errors
- ✅ **COMPLETE** - fully functional, no placeholders
- ✅ **TESTED** - mentally verified before writing
- ✅ **DOCUMENTED** - clear variable/function names
- ✅ **CONSISTENT** - follows project patterns
- ✅ **SECURE** - input validation, error handling
- ✅ **PERFORMANT** - efficient algorithms

### Code Must NOT Be:
- ❌ **INCOMPLETE** - no partial implementations
- ❌ **BUGGY** - no syntax/runtime errors
- ❌ **SLOPPY** - no typos or copy-paste errors
- ❌ **INSECURE** - no unvalidated inputs
- ❌ **INCONSISTENT** - no mixed patterns
- ❌ **UNDOCUMENTED** - no cryptic names
- ❌ **UNTESTED** - no unverified code

---

## 📋 COMMON ERROR PATTERNS TO AVOID

### 1. Module Not Found
```javascript
// ❌ WRONG
const User = require('../models/User'); // from src/server.js

// ✅ CORRECT
const User = require('./models/User'); // from src/server.js
```

### 2. Cannot Invoke Without 'new'
```javascript
// ❌ WRONG
const { User } = require('../models/User'); // when User is default export

// ✅ CORRECT
const User = require('../models/User');
```

### 3. Undefined Reading Property
```javascript
// ❌ WRONG
const existingUser = await User.findOne({ where: { email } }); // User is undefined

// ✅ CORRECT - Import User first
const User = require('../models/User');
const existingUser = await User.findOne({ where: { email } });
```

### 4. Blank Page (React)
```javascript
// ❌ WRONG - Missing default export
export const Button = () => { };

// ✅ CORRECT - Add default export
export const Button = () => { };
export default Button;
```

### 5. Route Not Found
```javascript
// ❌ WRONG - No root route
app.use('/api/auth', authRoutes);
app.use('*', (req, res) => res.status(404).json({ error: 'Route not found' }));

// ✅ CORRECT - Add root route
app.get('/', (req, res) => res.json({ message: 'API Running' }));
app.use('/api/auth', authRoutes);
app.use('*', (req, res) => res.status(404).json({ error: 'Route not found' }));
```

---

## 🔥 FINAL MANDATE

**EVERY AGENT MUST:**
1. Read this prompt completely before starting
2. Follow EVERY rule without exception
3. Verify EVERY import/export before writing
4. Create COMPLETE implementations only
5. Test code mentally before writing
6. Fix errors immediately when found
7. Never leave TODOs or placeholders
8. Produce PRODUCTION-READY code only

**FAILURE TO FOLLOW = CODE REJECTION**

---

## 📊 SUCCESS METRICS

Your code is successful ONLY if:
- ✅ Zero runtime errors
- ✅ Zero import/export errors
- ✅ Zero missing files
- ✅ Zero syntax errors
- ✅ All features fully implemented
- ✅ All routes working
- ✅ All pages rendering
- ✅ Authentication working
- ✅ Database operations working
- ✅ API endpoints responding correctly

**TARGET: 100% SUCCESS RATE**

---

*This prompt is the result of analyzing real production errors from Sheldon-generated code. Follow it strictly to achieve zero-error, production-ready code generation.*
