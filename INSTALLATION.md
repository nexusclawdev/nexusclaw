# NexusClaw Installation Guide - Fresh PC Setup

## Prerequisites

### Required Software
1. **Node.js 20+** - JavaScript runtime
2. **pnpm** - Fast package manager
3. **Git** - Version control (optional, for cloning)

---

## Step-by-Step Installation

### 1. Install Node.js

**Windows:**
```bash
# Download and install from nodejs.org
# Or use winget:
winget install OpenJS.NodeJS.LTS

# Verify installation
node --version  # Should show v20.x.x or higher
npm --version
```

**macOS:**
```bash
# Using Homebrew
brew install node@20

# Verify installation
node --version
npm --version
```

**Linux:**
```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# Or using apt (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 2. Install pnpm

```bash
# Using npm
npm install -g pnpm

# Or using standalone script (recommended)
curl -fsSL https://get.pnpm.io/install.sh | sh -

# Verify installation
pnpm --version  # Should show v10.x.x or higher
```

### 3. Clone or Download NexusClaw

**Option A: Using Git (Recommended)**
```bash
# Clone the repository
git clone https://github.com/your-org/nexusclaw.git
cd nexusclaw
```

**Option B: Download ZIP**
```bash
# Download from GitHub and extract
# Then navigate to the directory
cd nexusclaw
```

**Option C: If you already have the code**
```bash
# Navigate to your NexusClaw directory
cd D:/Claw  # Windows
cd ~/Claw   # macOS/Linux
```

### 4. Install Dependencies

```bash
# Install all dependencies
pnpm install

# This will install:
# - TypeScript and build tools
# - AI provider SDKs (OpenAI, Anthropic, etc.)
# - Channel integrations (Telegram, WhatsApp)
# - Browser automation (Playwright)
# - Cron scheduler
# - All other dependencies
```

### 5. Build the Project

```bash
# Compile TypeScript to JavaScript
pnpm build

# This creates the dist/ directory with compiled code
```

### 6. Run the Onboarding Wizard

```bash
# Start interactive setup
pnpm cli onboard

# Or using the built CLI
node dist/cli/index.js onboard
```

The wizard will guide you through:
- ✅ Selecting AI providers (OpenAI, Anthropic, etc.)
- ✅ Entering API keys
- ✅ Choosing default model
- ✅ Configuring channels (Telegram, WhatsApp, Web)
- ✅ Setting up security options
- ✅ Configuring dashboard port

### 7. Verify Installation

```bash
# Check status
pnpm cli status

# You should see:
# ✅ Config found
# ✅ Providers configured
# ✅ Model selected
# ✅ Channels enabled
```

### 8. Start NexusClaw

```bash
# Start the gateway (all channels + dashboard)
pnpm cli gateway

# Or start individual components:
pnpm cli agent        # Interactive chat mode
pnpm cli agent -m "Hello"  # Single message mode
```

---

## Quick Start Commands

### After Installation

```bash
# 1. Navigate to project directory
cd nexusclaw

# 2. Install dependencies
pnpm install

# 3. Build project
pnpm build

# 4. Run onboarding
pnpm cli onboard

# 5. Start gateway
pnpm cli gateway
```

---

## Configuration

### Get API Keys

**OpenAI:**
1. Go to https://platform.openai.com/api-keys
2. Create new API key
3. Copy and save it

**Anthropic (Claude):**
1. Go to https://console.anthropic.com/settings/keys
2. Create new API key
3. Copy and save it

**Google (Gemini):**
1. Go to https://aistudio.google.com/app/apikey
2. Create new API key
3. Copy and save it

**OpenRouter:**
1. Go to https://openrouter.ai/keys
2. Create new API key
3. Copy and save it

**xAI (Grok):**
1. Go to https://console.x.ai/
2. Create new API key
3. Copy and save it

### Telegram Bot Setup

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Follow the prompts to create your bot
4. Copy the HTTP API token
5. Enter it during onboarding

### WhatsApp Setup

1. Enable WhatsApp during onboarding
2. When you start the gateway, a QR code will appear
3. Open WhatsApp → Settings → Linked Devices
4. Scan the QR code

---

## Directory Structure

After installation, you'll have:

```
nexusclaw/
├── node_modules/          # Dependencies (auto-generated)
├── dist/                  # Compiled JavaScript (auto-generated)
├── src/                   # TypeScript source code
│   ├── cli/              # CLI commands
│   ├── agent/            # Agent logic
│   ├── channels/         # Telegram, WhatsApp, etc.
│   ├── skills/           # Skills system
│   ├── cron/             # Scheduled tasks
│   ├── auth/             # Authentication
│   └── ...
├── templates/            # Workspace templates
│   ├── AGENT.md
│   ├── IDENTITY.md
│   ├── SOUL.md
│   └── USER.md
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript config
└── README.md

~/.nexusclaw/             # User data directory (auto-created)
├── config.json           # Configuration
├── workspace/            # Agent workspace
│   ├── AGENT.md         # Agent behavior
│   ├── IDENTITY.md      # Agent identity
│   ├── SOUL.md          # Core principles
│   ├── USER.md          # User preferences
│   ├── skills/          # Installed skills
│   └── cron/            # Cron jobs
└── auth/                # Auth tokens
```

---

## Available Commands

### Core Commands
```bash
nexusclaw onboard        # Interactive setup wizard
nexusclaw gateway        # Start all channels + dashboard
nexusclaw agent          # Interactive chat mode
nexusclaw agent -m "Hi"  # Single message mode
nexusclaw status         # Show configuration status
nexusclaw doctor         # Diagnose issues
```

### Skills Management
```bash
nexusclaw skills list              # List installed skills
nexusclaw skills search <query>    # Search ClawHub
nexusclaw skills install <id>      # Install a skill
nexusclaw skills show <id>         # Show skill details
nexusclaw skills remove <id>       # Remove a skill
```

### Cron/Scheduled Tasks
```bash
nexusclaw cron list                           # List all cron jobs
nexusclaw cron add "<schedule>" "<desc>"      # Add new job
nexusclaw cron remove <id>                    # Remove job
nexusclaw cron enable <id>                    # Enable job
nexusclaw cron disable <id>                   # Disable job
```

### Authentication
```bash
nexusclaw auth status              # Show auth status
nexusclaw auth login --provider <name>  # OAuth login
nexusclaw auth logout --provider <name> # Logout
nexusclaw auth logout --all        # Logout all
```

### Migration
```bash
nexusclaw migrate                  # Auto-detect installations
nexusclaw migrate --from picoclaw  # Migrate from PicoClaw
nexusclaw migrate --from openclaw  # Migrate from OpenClaw
```

### Configuration
```bash
nexusclaw config get <key>         # Get config value
nexusclaw config set <key> <value> # Set config value
nexusclaw config list              # List all config
```

---

## Troubleshooting

### Build Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm build
```

### Permission Errors (Linux/macOS)

```bash
# Fix permissions
sudo chown -R $USER ~/.nexusclaw
chmod -R 755 ~/.nexusclaw
```

### Port Already in Use

```bash
# Change dashboard port
nexusclaw config set channels.web.port 3200

# Or edit config manually
nano ~/.nexusclaw/config.json
```

### Missing API Keys

```bash
# Run onboarding again
nexusclaw onboard

# Or set manually
nexusclaw config set providers.openai.apiKey "sk-..."
```

### Playwright Installation (Browser Automation)

```bash
# Install browser binaries
npx playwright install chromium

# Or install all browsers
npx playwright install
```

---

## Production Deployment

### Using PM2 (Process Manager)

```bash
# Install PM2
npm install -g pm2

# Start NexusClaw
pm2 start "pnpm cli gateway" --name nexusclaw

# Save configuration
pm2 save

# Setup auto-start on boot
pm2 startup
```

### Using systemd (Linux)

Create `/etc/systemd/system/nexusclaw.service`:

```ini
[Unit]
Description=NexusClaw AI Agent
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/nexusclaw
ExecStart=/usr/bin/pnpm cli gateway
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable nexusclaw
sudo systemctl start nexusclaw
sudo systemctl status nexusclaw
```

### Using Docker (Optional)

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build
RUN pnpm build

# Expose port
EXPOSE 3100

# Start
CMD ["pnpm", "cli", "gateway"]
```

Build and run:
```bash
docker build -t nexusclaw .
docker run -p 3100:3100 -v ~/.nexusclaw:/root/.nexusclaw nexusclaw
```

---

## Environment Variables (Optional)

You can set API keys via environment variables instead of config file:

```bash
# Add to ~/.bashrc or ~/.zshrc
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
export GEMINI_API_KEY="..."
export OPENROUTER_API_KEY="sk-or-..."
export XAI_API_KEY="xai-..."

# Telegram
export TELEGRAM_BOT_TOKEN="123456:ABC..."

# Reload shell
source ~/.bashrc
```

---

## Updating NexusClaw

```bash
# Pull latest changes (if using git)
git pull origin main

# Reinstall dependencies
pnpm install

# Rebuild
pnpm build

# Restart
pm2 restart nexusclaw  # If using PM2
# Or restart manually
```

---

## Uninstallation

```bash
# Stop NexusClaw
pm2 stop nexusclaw  # If using PM2
# Or Ctrl+C if running manually

# Remove project directory
rm -rf /path/to/nexusclaw

# Remove user data (optional)
rm -rf ~/.nexusclaw

# Uninstall global packages (optional)
npm uninstall -g pnpm pm2
```

---

## Next Steps

After installation:

1. **Customize workspace files:**
   ```bash
   nano ~/.nexusclaw/workspace/AGENT.md
   nano ~/.nexusclaw/workspace/IDENTITY.md
   nano ~/.nexusclaw/workspace/SOUL.md
   nano ~/.nexusclaw/workspace/USER.md
   ```

2. **Install skills:**
   ```bash
   nexusclaw skills search weather
   nexusclaw skills install weather
   ```

3. **Set up scheduled tasks:**
   ```bash
   nexusclaw cron add "0 9 * * *" "Daily summary"
   ```

4. **Access dashboard:**
   - Open browser: http://localhost:3100
   - View agents, tasks, and logs

5. **Test channels:**
   - Send message to Telegram bot
   - Send message to WhatsApp
   - Use web interface

---

## Support

- **Documentation:** See `IMPLEMENTATION_SUMMARY.md`, `QUICK_REFERENCE.md`, `COMPARISON.md`
- **Issues:** Report bugs on GitHub
- **Help:** Run `nexusclaw --help` or `nexusclaw <command> --help`

---

## Summary

**Complete installation in 5 commands:**

```bash
cd nexusclaw
pnpm install
pnpm build
pnpm cli onboard
pnpm cli gateway
```

That's it! NexusClaw is now running. 🎉
