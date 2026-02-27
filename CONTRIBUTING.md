# Contributing to NexusClaw 🐾

First off, thank you for considering contributing to NexusClaw! Every contribution helps make this project better.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Branch Model](#branch-model)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Testing](#testing)

## 🤝 Code of Conduct

This project and everyone participating in it is governed by our commitment to fostering an open and welcoming environment. Please be respectful and constructive in all interactions.

## 🎯 How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** the behavior
- **Expected vs actual behavior**
- **Environment details** (OS, Node version, etc.)
- **Logs or screenshots** if applicable

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Clear use case** - Why is this enhancement needed?
- **Proposed solution** - How should it work?
- **Alternatives considered** - What other approaches did you think about?

### Pull Requests

We actively welcome your pull requests! See the [Pull Request Process](#pull-request-process) section below.

## 🛠️ Development Setup

### Prerequisites

- Node.js 22+
- pnpm (via corepack)
- Git

### Setup Steps

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/nexusclaw.git
cd nexusclaw

# Install dependencies
corepack enable
pnpm install

# Copy environment file
cp .env.example .env

# Build the project
pnpm build

# Run in development mode
pnpm dev
```

### Project Structure

```
nexusclaw/
├── src/
│   ├── agent/          # Agent loop and orchestration
│   ├── channels/       # Telegram, WhatsApp, Web channels
│   ├── cli/            # CLI commands
│   ├── config/         # Configuration schemas
│   ├── db/             # Database layer
│   ├── providers/      # LLM provider integrations
│   ├── server/         # API server
│   ├── skills/         # Built-in skills
│   └── tools/          # Agent tools
├── scripts/            # Setup and utility scripts
├── docs/               # Documentation
└── tests/              # Test files
```

## 🌿 Branch Model

- `main`: release/stable branch (maintainers only, protected)
- `dev`: integration branch for day-to-day PRs (protected)
- `feature/*`, `fix/*`, `docs/*`, `chore/*`: working branches from contributors/forks
- `hotfix/*`: emergency production fixes (maintainers), merged to `main` first, then back-merged to `dev`

## 📝 PR Target Rules

- External contributors: open PRs to `dev`
- Maintainer normal work: open PRs to `dev`
- Maintainer emergency hotfix: PR to `main` allowed only for production incidents
- After any hotfix to `main`, back-merge `main -> dev` immediately

## 🔄 Pull Request Process

1. **Update documentation** - If you change APIs or add features, update the README and relevant docs
2. **Add tests** - Ensure your changes are covered by tests
3. **Follow coding standards** - Run `pnpm typecheck` and fix any issues
4. **Write clear commit messages** - Follow our commit guidelines below
5. **Request review** - Tag maintainers for review

### PR Checklist

- [ ] Code follows the project's style guidelines
- [ ] Self-review of code completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated and passing
- [ ] Dependent changes merged and published

## 📐 Coding Standards

### TypeScript

- Use TypeScript strict mode
- Prefer `interface` over `type` for object shapes
- Use explicit return types for public functions
- Avoid `any` - use `unknown` if type is truly unknown

### Code Style

```typescript
// ✅ Good
export async function processMessage(
  message: string,
  userId: string
): Promise<Response> {
  const sanitized = sanitizeInput(message);
  return await agent.process(sanitized, userId);
}

// ❌ Bad
export async function processMessage(message, userId) {
  return await agent.process(message, userId);
}
```

### Naming Conventions

- **Files**: `kebab-case.ts`
- **Classes**: `PascalCase`
- **Functions**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Interfaces**: `PascalCase` (no `I` prefix)

### Error Handling

```typescript
// ✅ Good - Specific error handling
try {
  await provider.chat(messages);
} catch (error) {
  if (error instanceof RateLimitError) {
    logger.warn('Rate limit hit, retrying...');
    await sleep(1000);
  } else {
    throw error;
  }
}

// ❌ Bad - Silent failures
try {
  await provider.chat(messages);
} catch (error) {
  console.log('Error:', error);
}
```

## 💬 Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

### Examples

```bash
feat(channels): add Discord channel support

Implements Discord bot integration with message handling
and command support.

Closes #123

---

fix(agent): prevent memory leak in message processing

The agent loop was not properly cleaning up event listeners,
causing memory to grow over time.

---

docs(readme): update installation instructions

Add Windows-specific notes and troubleshooting section.
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test agent.test.ts

# Run with coverage
pnpm test:coverage
```

### Writing Tests

```typescript
import { describe, it, expect } from 'vitest';
import { AgentLoop } from '../agent/loop';

describe('AgentLoop', () => {
  it('should process messages correctly', async () => {
    const agent = new AgentLoop(/* ... */);
    const response = await agent.process('Hello');
    expect(response).toBeDefined();
  });
});
```

## Review and Merge Rules

- Use PR-only merges for both `main` and `dev` (no direct pushes)
- Require at least 1 approval before merge
- Require CI checks to pass before merge
- Prefer `Squash and merge` for a clean history

## 🚀 Release Flow

1. Feature/fix PRs merge into `dev`
2. When stable, open release PR `dev -> main`
3. After merge to `main`, tag/release as needed
4. Keep `dev` synced with any direct hotfix merged to `main`

## 🔒 GitHub Branch Protection

Configure both `main` and `dev`:

- `Require a pull request before merging`
- `Require approvals` (recommended: 1+)
- `Require status checks to pass before merging`
- `Restrict direct pushes`

## ⚡ Quick Commands

Create a working branch:

```bash
git checkout dev
git pull origin dev
git checkout -b feature/my-change
```

Push and open PR to `dev`:

```bash
git push origin feature/my-change
gh pr create --base dev --fill
```

Hotfix back-merge (`main -> dev`):

```bash
git checkout dev
git pull origin dev
git merge origin/main
git push origin dev
```

## 📚 Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for public APIs
- Update architecture docs for structural changes
- Add examples for new features

## ❓ Questions?

- Open an issue with the `question` label
- Join our community discussions
- Check existing documentation

## 🎉 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project website (when available)

---

Thank you for contributing to NexusClaw! 🐾

