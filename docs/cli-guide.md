# NexusClaw CLI Guide

This guide covers how to install, configure, and run the NexusClaw CLI on your system.

## 🚀 1. Installation

There are two primary ways to run NexusClaw: globally linked via `npm` or locally via `tsx`.

### Option A: Install Globally (Recommended)
This method allows you to run `nexusclaw` from any terminal window.

```bash
# 1. Clone the repository
git clone https://github.com/your-repo/nexusclaw.git
cd nexusclaw

# 2. Install dependencies
npm install

# 3. Build the TypeScript files
npm run build

# 4. Link the package globally
npm link
```
Now you can simply use the `nexusclaw` command anywhere!

### Option B: Run Locally (For Development)
If you prefer not to build/link globally, you can execute the CLI using `npx tsx`:
```bash
npm install
npx tsx src/cli/index.ts [command]

# Alternatively, using the package.json scripts:
npm run onboard
npm run gateway
```

---

## 🛠️ 2. Core Commands

Here are the essential commands you will use to operate NexusClaw:

### `nexusclaw onboard`
**Description:** Starts the interactive terminal wizard to configure your LLM providers, active models, channel connections, and security settings.
**Usage:**
```bash
nexusclaw onboard
```

### `nexusclaw gateway`
**Description:** Boots up the main server. This starts the Fastify API, the Live View WebSocket, the Web Dashboard, and any enabled chat channels (Telegram, WhatsApp).
**Usage:**
```bash
nexusclaw gateway
```
*Note: The gateway must be running for the dashboard or external chat channels to work.*

### `nexusclaw agent`
**Description:** Starts an interactive, terminal-based chat session with the NexusClaw agent. This bypasses the web gateway and runs locally in your console.
**Usage:**
```bash
# Interactive chat
nexusclaw agent

# Single message mode
nexusclaw agent -m "Summarize the latest tech news"
```

### `nexusclaw doctor`
**Description:** Runs system diagnostics. It checks for missing API keys, ensures required ports are free, and validates your environment settings to troubleshoot errors.
**Usage:**
```bash
nexusclaw doctor
```

### `nexusclaw status`
**Description:** Prints out the current runtime connections, available network endpoints (like the dashboard URL), and active agents/models.
**Usage:**
```bash
nexusclaw status
```

### `nexusclaw config`
**Description:** View or manipulate your NexusClaw configuration without opening the `config.json` file manually.
**Usage:**
```bash
# View the current config
nexusclaw config show

# Set a specific value (dot notation)
nexusclaw config set providers.openai.apiKey sk-your-api-key
nexusclaw config set browser.headless false
```

### `nexusclaw channels login`
**Description:** Interactive prompt to securely input credentials or scan QR codes (e.g., WhatsApp Web) for your selected communication channels.
**Usage:**
```bash
nexusclaw channels login
```

---

## 🔒 Configuration Files
NexusClaw creates its sandbox and configuration in your user home directory: `~/.nexusclaw/`.
- **Config File:** `~/.nexusclaw/config.json`
- **Encrypted Session Vault:** `~/.nexusclaw/vault/`
- **Local Sandbox (if restricted):** `~/.nexusclaw/workspace/`

If you ever need to reset NexusClaw entirely, you can securely delete the `~/.nexusclaw` folder and run `nexusclaw onboard` again.
