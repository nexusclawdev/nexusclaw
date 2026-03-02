# SHELDON ERROR-PREVENTION QUICK REFERENCE CARD

## 🚨 TOP 5 ERRORS & FIXES

### 1️⃣ MODULE NOT FOUND (40% of errors)
```javascript
// ❌ WRONG
// File: src/server.js
const authRoutes = require('../routes/auth');

// ✅ CORRECT
const authRoutes = require('./routes/auth');

// RULE: From src/X importing src/Y → use ./Y
//       From src/X importing src/sub/Y → use ./sub/Y
//       From src/sub/X importing src/Y → use ../Y
```

### 2️⃣ CANNOT INVOKE WITHOUT 'NEW' (30% of errors)
```javascript
// ❌ WRONG
const { User } = require('../models/User'); // When User is default export

// ✅ CORRECT
const User = require('../models/User');

// RULE: Read target file first!
//       If exports: module.exports = User → import without {}
//       If exports: module.exports = { User } → import with {}
```

### 3️⃣ UNDEFINED READING PROPERTY (20% of errors)
```javascript
// ❌ WRONG - Created server.js before logger.js
const logger = require('./utils/logger'); // File doesn't exist!

// ✅ CORRECT - Create logger.js FIRST, then server.js
// 1. Create utils/logger.js
// 2. Then create server.js with require

// RULE: Create dependencies BEFORE files that use them
//       Order: utils → models → middleware → routes → server
```

### 4️⃣ BLANK REACT PAGE (5% of errors)
```typescript
// ❌ WRONG
export const Button = () => <button>Click</button>;

// ✅ CORRECT
export const Button = () => <button>Click</button>;
export default Button; // ADD THIS!

// RULE: Every .tsx component needs BOTH named AND default export
```

### 5️⃣ ROUTE NOT FOUND (5% of errors)
```javascript
// ❌ WRONG - No root route
app.use('/api/auth', authRoutes);
app.use('*', (req, res) => res.status(404).json({ error: 'Route not found' }));

// ✅ CORRECT - Add root route
app.get('/', (req, res) => res.json({ message: 'API Running' }));
app.use('/api/auth', authRoutes);
app.use('*', (req, res) => res.status(404).json({ error: 'Route not found' }));

// RULE: Always provide root route with API info
```

---

## ⚡ QUICK CHECKLIST (30 SECONDS)

Before writing ANY file:
- [ ] Does it import other files? **Create those first**
- [ ] Are paths correct? **Check ./ vs ../**
- [ ] Right import style? **Default vs named**
- [ ] Need default export? **Yes for .tsx**
- [ ] Complete code? **No TODOs**
- [ ] Error handling? **Try-catch everywhere**
- [ ] No syntax errors? **No literal \n**
- [ ] Production ready? **Can deploy now**

---

## 🎯 FILE CREATION ORDER

**ALWAYS CREATE IN THIS ORDER:**
1. **Utils** (logger.js, helpers.js, config.js)
2. **Models** (User.js, Profile.js, etc.)
3. **Middleware** (errorHandler.js, auth.js)
4. **Routes** (auth.js, api routes)
5. **Server/App** (server.js, App.tsx)

**NEVER create server.js before models!**

---

## 📝 IMPORT/EXPORT PATTERNS

### Pattern 1: Default Export (Class)
```javascript
// File: models/User.js
class User extends Model {}
module.exports = User;

// Import:
const User = require('../models/User'); // ✅
const { User } = require('../models/User'); // ❌
```

### Pattern 2: Named Export
```typescript
// File: Header.tsx
export const Header = () => {};

// Import:
import { Header } from './Header'; // ✅
import Header from './Header'; // ❌
```

### Pattern 3: Both Exports
```typescript
// File: Button.tsx
export const Button = () => {};
export default Button;

// Import (default):
import Button from './Button'; // ✅

// Import (named):
import { Button } from './Button'; // ✅
```

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
- ✅ All pages render
- ✅ All API endpoints work
- ✅ Auth works end-to-end
- ✅ Database operations work
- ✅ Zero runtime errors
- ✅ Zero console errors

---

## 🔧 DEBUGGING TIPS

### "Module not found"
→ Check file path: ./ vs ../
→ Verify file actually exists
→ Check spelling and case

### "Cannot be invoked"
→ Read target file's exports
→ Remove {} if default export
→ Add {} if named export

### "Undefined reading property"
→ Create dependency file first
→ Check import path is correct
→ Verify export exists in target

### Blank React page
→ Add `export default ComponentName;`
→ Check barrel file (ui.tsx) exports
→ Verify component is imported in App.tsx

### "Route not found"
→ Add root route: `app.get('/', ...)`
→ Check route order (specific before wildcard)
→ Verify route is registered before 404 handler

---

## 💡 PRO TIPS

1. **Read before write**: Always read target file to check exports
2. **Build bottom-up**: Create dependencies before dependents
3. **Test mentally**: Imagine running the code before writing
4. **Complete everything**: No stubs, no TODOs, no placeholders
5. **Verify paths**: Double-check every import path
6. **Add error handling**: Try-catch in every async function
7. **Export properly**: Named + default for React components
8. **Document endpoints**: Root route should list all API endpoints

---

## 📚 FULL DOCUMENTATION

For complete details, see:
- `/d/nexusclaw/SHELDON_MASTER_PROMPT_V3.1.md` (4,500 words)
- `/d/nexusclaw/SHELDON_ERROR_PREVENTION_IMPLEMENTATION.md` (summary)

---

**TARGET: 100% ERROR-FREE CODE ON FIRST GENERATION**

*Keep this card handy when reviewing Sheldon-generated code*
