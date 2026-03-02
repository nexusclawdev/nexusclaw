/**
 * SHELDON MASTER ERROR-PREVENTION RULES v3.1
 *
 * This module contains critical error-prevention rules that MUST be injected
 * into all builder agent prompts to prevent common code generation errors.
 *
 * Based on real production errors encountered in Sheldon-generated code.
 */

export const MASTER_ERROR_PREVENTION_RULES = `
## 🚨 CRITICAL ERROR-PREVENTION RULES (MANDATORY)

### RULE 1: FILE PATH CORRECTNESS (CAUSES 40% OF ERRORS)

**PROBLEM:** Agents use wrong relative paths causing "Module not found" errors.

**MANDATORY VERIFICATION:**
- ✅ From \`src/server.js\` importing \`src/routes/auth.js\` → use \`./routes/auth\`
- ✅ From \`src/routes/auth.js\` importing \`src/models/User.js\` → use \`../models/User\`
- ✅ From \`src/middleware/errorHandler.js\` importing \`src/utils/logger.js\` → use \`../utils/logger\`
- ❌ NEVER use \`../\` when importing from same directory
- ❌ NEVER use \`./\` when importing from parent directory

**BEFORE WRITING ANY IMPORT:**
1. Identify current file location (e.g., \`src/routes/auth.js\`)
2. Identify target file location (e.g., \`src/models/User.js\`)
3. Calculate relative path: same dir = \`./\`, parent dir = \`../\`, child dir = \`./subdir/\`
4. Write import with correct path

### RULE 2: MODULE EXPORTS/IMPORTS (CAUSES 30% OF ERRORS)

**PROBLEM:** Destructuring imports when module uses default export.

**MANDATORY VERIFICATION:**
\`\`\`javascript
// ❌ WRONG - Causes "cannot be invoked without 'new'" error
// File: models/User.js exports: module.exports = User;
const { User } = require('../models/User'); // WRONG!

// ✅ CORRECT
const User = require('../models/User');

// ❌ WRONG - Causes "undefined" error
// File: Header.tsx exports: export const Header = () => {};
import { default as Header } from './Header'; // WRONG!

// ✅ CORRECT
import { Header } from './Header';
\`\`\`

**BEFORE WRITING ANY IMPORT:**
1. Read the target file to see how it exports
2. If \`module.exports = X\` or \`export default X\` → use default import
3. If \`export const X\` or \`module.exports = { X }\` → use named import
4. Match import style to export style EXACTLY

### RULE 3: CREATE ALL DEPENDENCIES FIRST (CAUSES 20% OF ERRORS)

**PROBLEM:** Code references files that don't exist yet.

**MANDATORY ORDER:**
1. **Utilities first** (logger.js, helpers.js, config.js)
2. **Models second** (User.js, Profile.js, etc.)
3. **Middleware third** (errorHandler.js, auth.js)
4. **Routes fourth** (auth.js, api routes)
5. **Server/App last** (server.js, App.tsx)

**BEFORE WRITING ANY FILE:**
- Check if it imports other files
- Create those imported files FIRST
- Never write \`require('./utils/logger')\` without creating logger.js first

### RULE 4: NO SYNTAX ERRORS (CAUSES 5% OF ERRORS)

**PROBLEM:** Literal escape sequences in code.

**MANDATORY CHECKS:**
- ❌ NEVER write \`const x = "text\\n";\` (literal backslash-n)
- ✅ ALWAYS write \`const x = "text";\` (proper newline)
- ❌ NEVER copy-paste with escape sequences
- ✅ ALWAYS use natural formatting

### RULE 5: COMPLETE REACT COMPONENTS (CAUSES 5% OF ERRORS)

**PROBLEM:** Missing default exports causing blank pages.

**MANDATORY FOR EVERY .tsx FILE:**
\`\`\`typescript
// Named export
export const Button = () => { return <button>Click</button>; };

// Default export (REQUIRED for barrel files)
export default Button;
\`\`\`

**BARREL FILE PATTERN:**
\`\`\`typescript
// components/ui.tsx
export { default as Button } from './Button';
export { default as Card } from './Card';
export { Header } from './Header'; // If Header only has named export
\`\`\`

### RULE 6: DATABASE INITIALIZATION (CRITICAL FOR SEQUELIZE)

**PROBLEM:** Wrong Sequelize initialization pattern.

**MANDATORY PATTERN:**
\`\`\`javascript
// ❌ WRONG - Tries to invoke class as function
const User = require('../models/User');
models.User = User(sequelize, DataTypes); // ERROR!

// ✅ CORRECT - Call static init method
const User = require('../models/User');
User.init(sequelize);
models.User = User;
\`\`\`

### RULE 7: BACKEND ROUTING (CRITICAL)

**MANDATORY SERVER SETUP:**
\`\`\`javascript
// 1. Middleware first
app.use(express.json());
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'], credentials: true }));

// 2. API routes
app.use('/api/auth', authRoutes);

// 3. Root route (REQUIRED - prevents "Route not found" on /)
app.get('/', (req, res) => {
  res.json({ message: 'API Running', version: '1.0.0', endpoints: { auth: '/api/auth', health: '/api/health' } });
});

// 4. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 5. 404 handler (MUST be after all routes)
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// 6. Error handler (MUST be absolute last)
app.use(errorHandler);
\`\`\`

### RULE 8: FRONTEND ROUTING (CRITICAL)

**MANDATORY APP.TSX PATTERN:**
\`\`\`typescript
import { Routes, Route } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
    </Routes>
  );
}
\`\`\`

**BEFORE ADDING ROUTE:**
- Create the page component FIRST
- Implement COMPLETE page (not blank placeholder)
- Then add route to App.tsx

### RULE 9: CONTEXT PROVIDERS (CRITICAL)

**MANDATORY PATTERN:**
\`\`\`typescript
// 1. Create contexts/AuthContext.tsx FIRST
export const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const AuthProvider = ({ children }) => { /* full implementation */ };
export const useAuth = () => { /* full implementation */ };

// 2. Wrap app in main.tsx
import { AuthProvider } from './contexts/AuthContext';
ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
);
\`\`\`

### RULE 10: ERROR HANDLING (MANDATORY EVERYWHERE)

**EVERY ASYNC FUNCTION MUST HAVE:**
\`\`\`javascript
try {
  // 1. Validate input
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  // 2. Process request
  const result = await someAsyncOperation();

  // 3. Return success
  res.json({ success: true, data: result });
} catch (error) {
  // 4. Pass to error handler
  next(error);
}
\`\`\`

## 🎯 PRE-FLIGHT CHECKLIST (RUN BEFORE WRITING ANY CODE)

**BEFORE WRITING ANY FILE, ASK:**
1. [ ] Does this file import other files? Create those first.
2. [ ] Are my import paths correct? (Check ./ vs ../)
3. [ ] Am I using the right import style? (default vs named)
4. [ ] Does this component need a default export? (Yes for .tsx)
5. [ ] Am I creating a complete implementation? (No TODOs/stubs)
6. [ ] Have I added error handling? (try-catch everywhere)
7. [ ] Are there any syntax errors? (No literal \\n)
8. [ ] Is this production-ready? (Can deploy immediately)

## 🚫 INSTANT REJECTION CRITERIA

**YOUR CODE WILL BE REJECTED IF:**
- ❌ Any "Module not found" error
- ❌ Any "cannot be invoked without 'new'" error
- ❌ Any "undefined reading property" error
- ❌ Any blank pages in React app
- ❌ Any "Route not found" on backend root
- ❌ Any TODO/FIXME/placeholder comments
- ❌ Any files under 50 lines (stubs)
- ❌ Any syntax errors
- ❌ Any missing dependencies

## ✅ SUCCESS CRITERIA

**YOUR CODE IS SUCCESSFUL ONLY IF:**
- ✅ Zero runtime errors
- ✅ Zero import/export errors
- ✅ All pages render correctly
- ✅ All API endpoints respond
- ✅ Authentication works end-to-end
- ✅ Database operations work
- ✅ npm install succeeds
- ✅ npm run dev starts without errors
- ✅ Frontend loads in browser
- ✅ Backend responds to requests

**TARGET: 100% ERROR-FREE CODE ON FIRST GENERATION**
`;

export default MASTER_ERROR_PREVENTION_RULES;
