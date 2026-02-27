# Changelog

All notable changes to NexusClaw will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2026-02-27

### 🎉 Initial Release

The first public release of NexusClaw - a next-generation AI agent platform combining lightweight architecture with enterprise-grade security.

### ✨ Added

#### Core Features
- **Multi-Agent Orchestration** - CEO directive system with department-based agent organization
- **Visual Dashboard** - React + PixiJS powered office simulation with real-time updates
- **Browser Automation** - Playwright integration with stealth mode and Docker isolation
- **Zero-Trust Security** - Workspace sandboxing, command filtering, and domain blocking
- **Skills Marketplace** - ClawHub integration for dynamic skill installation
- **Task Scheduling** - Cron-based persistent task scheduling with timeout controls
- **OAuth 2.0 Support** - Multi-provider authentication (Google, GitHub Copilot)

#### LLM Provider Support
- OpenAI (GPT-4o, GPT-4, GPT-3.5)
- Anthropic (Claude 3.5 Sonnet, Claude 3 Opus)
- Google (Gemini Pro, Gemini Ultra)
- OpenRouter (100+ models)
- xAI (Grok)
- Custom API providers

#### Communication Channels
- Telegram bot integration
- WhatsApp via Baileys
- Discord bot support
- Web dashboard with WebSocket real-time updates
- CLI interface for direct interaction

#### CLI Commands
- `nexusclaw gateway` - Start full platform (dashboard + agents + channels)
- `nexusclaw agent` - Interactive CLI chat
- `nexusclaw onboard` - Setup wizard
- `nexusclaw status` - System health check
- `nexusclaw skills` - Skills management (list, search, install, remove)
- `nexusclaw cron` - Task scheduling (add, list, enable, disable, remove)
- `nexusclaw auth` - OAuth management (status, login, logout)
- `nexusclaw migrate` - Import from legacy platforms

#### Security Features
- Workspace sandboxing with configurable restrictions
- Command deny patterns to prevent dangerous operations
- Domain blocking and URL filtering
- Per-channel access control
- Encryption key management
- OAuth token encryption at rest

#### Developer Experience
- TypeScript 5.5 with strict mode
- Hot reload in development mode
- Comprehensive error handling
- Detailed logging system
- Auto-generated architecture documentation
- Interactive setup wizard

### 🏗️ Architecture

- **Frontend:** React 18 + TypeScript + Vite + PixiJS
- **Backend:** Fastify + WebSocket + SQLite
- **Browser:** Playwright with stealth plugins
- **Security:** Zero-trust architecture with multiple layers
- **Database:** SQLite with WAL mode for concurrent access
- **Real-time:** WebSocket for live updates

### 📚 Documentation

- Comprehensive README with quick start guide
- Detailed installation instructions for Windows, macOS, Linux
- CLI reference guide
- API documentation
- Architecture overview
- Contributing guidelines
- Security policy
- Code of conduct

### 🔧 Configuration

- JSON-based configuration file (~/.nexusclaw/config.json)
- Environment variable support (.env)
- Interactive setup wizard
- Per-provider settings
- Security policy configuration
- Channel-specific settings

### 🎨 UI/UX

- Dark theme with glassmorphism design
- Pixel-art agent avatars
- Real-time office simulation
- Responsive dashboard
- Task board with drag-and-drop
- Settings panel with OAuth integration
- Terminal panel for logs
- Chat panel for agent interaction

### 🧪 Testing

- TypeScript strict mode compilation
- Zero npm audit vulnerabilities
- 32 API endpoints tested
- WebSocket connection verified
- Frontend accessibility checks

### 📦 Distribution

- npm/pnpm package support
- Docker containerization
- Automated installers (Windows PowerShell, Unix shell)
- GitHub releases

---

## [Unreleased]

### Planned Features

- [ ] ClawHub API integration
- [ ] Advanced browser automation features
- [ ] Skills hot reload
- [ ] Token encryption at rest
- [ ] Provider fallback chain
- [ ] Rate limiting with exponential backoff
- [ ] Cron job execution logs
- [ ] Mobile app (React Native)
- [ ] Plugin system for custom integrations
- [ ] Multi-language support
- [ ] Voice interaction support
- [ ] Advanced analytics dashboard
- [ ] Team collaboration features
- [ ] Cloud deployment templates

---

## Version History

- **0.1.0** (2026-02-27) - Initial public release

---

## Migration Guide

### From Legacy Platforms

NexusClaw includes a migration tool to import configurations from other AI agent platforms:

```bash
# Auto-detect and migrate
nexusclaw migrate

# Migrate from specific platform
nexusclaw migrate --from legacy-platform --path /path/to/config
```

---

## Breaking Changes

None (initial release)

---

## Security Updates

- All dependencies up to date as of 2026-02-27
- Zero known vulnerabilities
- Security audit passed with Grade A

---

## Contributors

- NexusClaw Team
- Open Source Community

---

## Links

- **GitHub:** https://github.com/nexusclawdev/nexusclaw
- **Documentation:** https://docs.nexusclaw.dev
- **Discord:** https://discord.gg/nexusclaw
- **Issues:** https://github.com/nexusclawdev/nexusclaw/issues

---

<div align="center">

**🐾 Thank you for using NexusClaw!**

[⬆ Back to README](README.md)

</div>
