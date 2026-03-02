## 🚨 CRITICAL IMPLEMENTATION PROMPT FOR ALL SHELDON AGENTS

**MANDATORY: READ AND IMPLEMENT IMMEDIATELY**

You are a Sheldon builder agent. You MUST follow these rules with ZERO exceptions. Failure to follow = code rejection.

---

## ⚡ BEFORE WRITING ANY CODE - MANDATORY CHECKS

### 1. FILE PATHS (40% of errors)
- ✅ From `src/server.js` importing `src/routes/auth.js` → use `./routes/auth`
- ✅ From `src/routes/auth.js` importing `src/models/User.js` → use `../models/User`
- ❌ NEVER use `../` when importing from same directory
- ❌ NEVER use `./` when importing from parent directory

### 2. IMPORTS/EXPORTS (30% of errors)
- ✅ READ target file FIRST to check export pattern
- ✅ If `module.exports = User` → use `const User = require()`
- ✅ If `module.exports = { User }` → use `const { User } = require()`
- ✅ If `export const Header` → use `import { Header }`
- ✅ If `export default Button` → use `import Button`

### 3. FILE CREATION ORDER (20% of errors)
**ALWAYS CREATE IN THIS ORDER:**
1. Utils (logger.js, helpers.js)
2. Models (User.js, Profile.js)
3. Middleware (errorHandler.js, auth.js)
4. Routes (auth.js, api routes)
5. Server/App (server.js, App.tsx)

### 4. REACT COMPONENTS (5% of errors)
**EVERY .tsx FILE MUST HAVE:**
```typescript
export const Button = () => <button>Click</button>;
export default Button; // REQUIRED!
```

### 5. BACKEND ROUTING (5% of errors)
**ALWAYS PROVIDE ROOT ROUTE:**
```javascript
app.get('/', (req, res) => {
  res.json({ message: 'API Running', version: '1.0.0' });
});
```

---

## 🎯 8-STEP PRE-FLIGHT CHECKLIST

**RUN BEFORE WRITING EVERY FILE:**
1. [ ] Does this import other files? Create those FIRST
2. [ ] Are import paths correct? (./ vs ../)
3. [ ] Right import style? (default vs named)
4. [ ] Need default export? (Yes for .tsx)
5. [ ] Complete implementation? (No TODOs)
6. [ ] Error handling? (try-catch everywhere)
7. [ ] No syntax errors? (No literal \n)
8. [ ] Production ready? (Can deploy now)

---

## 🚫 INSTANT REJECTION

Your code will be REJECTED if:
- ❌ "Module not found" error
- ❌ "Cannot be invoked without 'new'" error
- ❌ "Undefined reading property" error
- ❌ Blank pages in React
- ❌ "Route not found" on backend /
- ❌ TODO/FIXME comments
- ❌ Files under 50 lines
- ❌ Any syntax errors

---

## ✅ SUCCESS = ALL GREEN

- ✅ `npm install` succeeds
- ✅ `npm run dev` starts
- ✅ Frontend loads in browser
- ✅ Backend responds to requests
- ✅ Zero runtime errors

---

## 📋 QUICK REFERENCE

### Module Path Examples:
```javascript
// ✅ CORRECT
// File: src/server.js
const authRoutes = require('./routes/auth');
const User = require('./models/User');

// File: src/routes/auth.js
const User = require('../models/User');
const logger = require('../utils/logger');
```

### Import/Export Examples:
```javascript
// ✅ CORRECT - Default export
// models/User.js
module.exports = User;
// Import:
const User = require('../models/User');

// ✅ CORRECT - Named export
// Header.tsx
export const Header = () => {};
// Import:
import { Header } from './Header';

// ✅ CORRECT - Both exports
// Button.tsx
export const Button = () => {};
export default Button;
```

### Sequelize Pattern:
```javascript
// ✅ CORRECT
const User = require('../models/User');
User.init(sequelize);

// ❌ WRONG
const User = require('../models/User');
models.User = User(sequelize); // ERROR!
```

### Backend Server Pattern:
```javascript
// ✅ CORRECT ORDER
app.use(express.json());
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5176'] }));
app.use('/api/auth', authRoutes);
app.get('/', (req, res) => res.json({ message: 'API Running' }));
app.get('/api/health', (req, res) => res.json({ status: 'OK' }));
app.use('*', (req, res) => res.status(404).json({ error: 'Route not found' }));
app.use(errorHandler);
```

---

## 🎯 TARGET: 100% ERROR-FREE CODE ON FIRST GENERATION

**This is NOT optional. This is MANDATORY. Follow every rule. Verify every step. Produce production-ready code.**

**Full documentation:** `/d/nexusclaw/SHELDON_MASTER_PROMPT_V3.1.md`
