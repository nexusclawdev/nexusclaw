# 🚀 Quick Start Guide

Get NexusClaw up and running in under 5 minutes!

---

## Prerequisites

Before you begin, ensure you have:

- **Node.js 20.0.0+** installed
- **pnpm** package manager (recommended)
- An **API key** from at least one LLM provider (OpenAI, Anthropic, Google, etc.)

---

## Installation

### Option 1: Automated Installer (Recommended)

**Windows:**
```powershell
git clone https://github.com/nexusclawdev/nexusclaw.git
cd nexusclaw
.\install.ps1
```

**macOS/Linux:**
```bash
git clone https://github.com/nexusclawdev/nexusclaw.git
cd nexusclaw
./install.sh
```

### Option 2: Manual Installation

```bash
# Clone the repository
git clone https://github.com/nexusclawdev/nexusclaw.git
cd nexusclaw

# Install pnpm (if not already installed)
npm install -g pnpm

# Install dependencies
pnpm install

# Build the project
pnpm build
```

---

## Configuration

### 1. Run the Setup Wizard

```bash
pnpm cli onboard
```

The interactive wizard will guide you through:
- Choosing your LLM provider
- Entering your API key
- Configuring security settings
- Setting up channels (Telegram, Discord, WhatsApp)

### 2. Manual Configuration (Alternative)

Create a `.env` file in the project root:

```bash
# LLM Provider
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-api-key-here

# Model Selection
LLM_MODEL=gpt-4o

# Server Configuration
PORT=3100
HOST=0.0.0.0

# Encryption Key (generate with: openssl rand -hex 32)
ENCRYPTION_KEY=your-256-bit-hex-key-here
```

---

## Launch NexusClaw

### Start the Full Platform

```bash
pnpm cli gateway
```

This starts:
- ✅ Web Dashboard at http://localhost:3100
- ✅ REST API at http://localhost:3100/api
- ✅ WebSocket server at ws://localhost:3100/ws
- ✅ All configured channels (Telegram, Discord, etc.)

### Alternative: CLI-Only Mode

```bash
pnpm cli agent
```

Chat directly with your AI agent via command line.

---

## First Steps

### 1. Access the Dashboard

Open your browser and navigate to:
```
http://localhost:3100
```

You'll see:
- 🏢 **Office View** - Visual representation of your agents
- 📊 **Dashboard** - System metrics and analytics
- 📋 **Task Board** - Manage tasks and workflows
- ⚙️ **Settings** - Configure providers and channels

### 2. Chat with Your Agent

**Via Web Dashboard:**
- Click the chat icon in the sidebar
- Type your message and press Enter

**Via CLI:**
```bash
pnpm cli agent
```

**Via Telegram (if configured):**
- Message your bot on Telegram
- Start with `/start`

### 3. Install Your First Skill

```bash
# Search for skills
pnpm cli skills search web

# Install a skill
pnpm cli skills install web-search

# Use the skill
pnpm cli agent
> Search the web for latest AI news
```

### 4. Schedule Your First Task

```bash
# Add a daily summary at 9 AM
pnpm cli cron add "0 9 * * *" "Daily Summary" "Send me a summary of today's tasks"

# List all scheduled tasks
pnpm cli cron list
```

---

## Essential Commands

```bash
# System Status
pnpm cli status                    # Check system health

# Agent Interaction
pnpm cli agent                     # Chat with agent (CLI)
pnpm cli gateway                   # Start full platform

# Skills Management
pnpm cli skills list               # List installed skills
pnpm cli skills search <query>     # Search marketplace
pnpm cli skills install <name>     # Install a skill

# Task Scheduling
pnpm cli cron list                 # List scheduled tasks
pnpm cli cron add <schedule> <name> <command>

# Authentication
pnpm cli auth status               # Check OAuth status
pnpm cli auth login --provider google

# Development
pnpm dev                           # Development mode with hot reload
pnpm build                         # Build for production
pnpm typecheck                     # Run TypeScript checks
```

---

## Example Workflows

### Workflow 1: Daily News Digest

```bash
# Install news skill
pnpm cli skills install news-aggregator

# Schedule daily digest
pnpm cli cron add "0 8 * * *" "Morning News" "Fetch and summarize top tech news"
```

### Workflow 2: Code Review Assistant

```bash
# Install code review skill
pnpm cli skills install code-reviewer

# Start gateway
pnpm cli gateway

# Use via web dashboard or Telegram
```

### Workflow 3: Browser Automation

```bash
# Configure browser in settings
# Enable stealth mode and Docker isolation

# Use agent to automate tasks
pnpm cli agent
> Take a screenshot of https://example.com
> Fill out the contact form on https://example.com
```

---

## Troubleshooting

### Port Already in Use

```bash
# Change port in .env
PORT=3200
```

### API Key Not Working

```bash
# Verify your key
pnpm cli auth status

# Re-run setup wizard
pnpm cli onboard
```

### Build Errors

```bash
# Clean and rebuild
rm -rf dist node_modules
pnpm install
pnpm build
```

### Playwright Issues

```bash
# Install browsers
npx playwright install

# Install system dependencies (Linux)
npx playwright install-deps
```

---

## Next Steps

- 📖 Read the [Full Documentation](INSTALLATION.md)
- 🎯 Explore [Advanced Configuration](docs/QUICK_REFERENCE.md)
- 🔧 Check out [API Documentation](docs/api.md)
- 💬 Join our [Discord Community](https://discord.gg/nexusclaw)
- 🐛 Report issues on [GitHub](https://github.com/nexusclawdev/nexusclaw/issues)

---

## Getting Help

- **GitHub Issues:** [Report bugs](https://github.com/nexusclawdev/nexusclaw/issues)
- **Discussions:** [Ask questions](https://github.com/nexusclawdev/nexusclaw/discussions)
- **Discord:** [Join community](https://discord.gg/nexusclaw)
- **Email:** support@nexusclaw.dev

---

<div align="center">

**🐾 Happy Coding with NexusClaw!**

[⬆ Back to README](README.md)

</div>
