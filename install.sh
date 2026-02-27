#!/bin/bash
set -e

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║   ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗       ║"
echo "║   ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝       ║"
echo "║   ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗       ║"
echo "║   ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║       ║"
echo "║   ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║       ║"
echo "║   ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝       ║"
echo "║                                                       ║"
echo "║    ██████╗██╗      █████╗ ██╗    ██╗                ║"
echo "║   ██╔════╝██║     ██╔══██╗██║    ██║                ║"
echo "║   ██║     ██║     ███████║██║ █╗ ██║                ║"
echo "║   ██║     ██║     ██╔══██║██║███╗██║                ║"
echo "║   ╚██████╗███████╗██║  ██║╚███╔███╔╝                ║"
echo "║    ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝                 ║"
echo "║                                                       ║"
echo "║              🐾 AI Agent Platform 🐾                 ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

echo "  NexusClaw Installer"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is required but not installed."
    echo "        Install Node.js v20+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "[ERROR] Node.js v20+ is required. Current version: $(node -v)"
    exit 1
fi

echo "[OK] Node.js $(node -v) found"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    echo "[*] Installing pnpm..."
    npm install -g pnpm
fi

echo "[OK] pnpm found"

# Install dependencies
echo "[*] Installing dependencies..."
pnpm install

# Build project
echo "[*] Building project..."
pnpm build

echo "[OK] NexusClaw installed successfully!"
echo ""
echo "Finally unpacked. Now point me at your problems."
echo "Starting setup..."
echo ""

# Run onboarding
node --no-warnings ./dist/cli/index.js onboard
