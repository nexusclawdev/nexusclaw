# Discord Bot Setup Guide

This guide will help you create and configure a Discord bot for NexusClaw.

## Step 1: Create a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"**
3. Enter a name (e.g., "NexusClaw Bot")
4. Click **"Create"**

## Step 2: Create a Bot User

1. In your application, go to the **"Bot"** tab (left sidebar)
2. Click **"Add Bot"**
3. Click **"Yes, do it!"** to confirm
4. Under the bot's username, click **"Reset Token"**
5. Click **"Yes, do it!"** and copy the token
6. **Save this token securely** - you'll need it for NexusClaw configuration

## Step 3: Configure Bot Permissions

### Required Intents (Important!)

In the **Bot** tab, scroll down to **"Privileged Gateway Intents"** and enable:

- ✅ **MESSAGE CONTENT INTENT** (required to read message content)
- ✅ **SERVER MEMBERS INTENT** (optional, for member info)

### Bot Permissions

In the **Bot** tab, under **"Bot Permissions"**, select:

- ✅ Send Messages
- ✅ Read Messages/View Channels
- ✅ Read Message History
- ✅ Add Reactions (optional)
- ✅ Embed Links (optional)
- ✅ Attach Files (optional)

## Step 4: Invite Bot to Your Server

1. Go to the **"OAuth2"** tab → **"URL Generator"**
2. Under **"Scopes"**, select:
   - ✅ `bot`
3. Under **"Bot Permissions"**, select the same permissions as Step 3
4. Copy the generated URL at the bottom
5. Open the URL in your browser
6. Select the server you want to add the bot to
7. Click **"Authorize"**

## Step 5: Configure NexusClaw

### Option 1: Using config.json

Edit `~/.nexusclaw/config.json`:

```json
{
  "channels": {
    "discord": {
      "enabled": true,
      "token": "YOUR_DISCORD_BOT_TOKEN",
      "allowFrom": ["*"]
    }
  }
}
```

### Option 2: Using .env file

Add to your `.env` file:

```bash
DISCORD_BOT_TOKEN=YOUR_DISCORD_BOT_TOKEN
```

Then update your config to read from environment:

```json
{
  "channels": {
    "discord": {
      "enabled": true,
      "token": "${DISCORD_BOT_TOKEN}",
      "allowFrom": ["*"]
    }
  }
}
```

## Step 6: Access Control (Optional)

To restrict bot access to specific users:

```json
{
  "channels": {
    "discord": {
      "enabled": true,
      "token": "YOUR_BOT_TOKEN",
      "allowFrom": [
        "123456789012345678",  // User ID
        "username#1234",       // Username with discriminator
        "username"             // Username only
      ]
    }
  }
}
```

### How to get Discord User ID:

1. Enable Developer Mode in Discord:
   - Settings → Advanced → Developer Mode (toggle on)
2. Right-click on a user → Copy ID

## Step 7: Start NexusClaw

```bash
pnpm cli gateway
```

You should see:

```
💬 Discord: connected as YourBotName#1234
```

## Step 8: Test the Bot

1. Go to your Discord server
2. Send a message in any channel where the bot has access
3. The bot will show "typing..." while processing
4. You'll receive a response from the AI agent

## Troubleshooting

### Bot doesn't respond

- ✅ Check that **MESSAGE CONTENT INTENT** is enabled
- ✅ Verify the bot has permission to read/send messages in the channel
- ✅ Check the bot token is correct
- ✅ Ensure the bot is online (green status)

### "Missing Access" error

- The bot needs **View Channel** and **Send Messages** permissions
- Check channel-specific permissions

### Bot goes offline immediately

- Invalid token - regenerate and update config
- Check console for error messages

### "Not authorized" message

- Your user ID is not in the `allowFrom` list
- Set `allowFrom: ["*"]` to allow everyone (testing only)

## Security Best Practices

1. **Never share your bot token** - treat it like a password
2. **Use allowFrom** to restrict access in production
3. **Regenerate token** if accidentally exposed
4. **Use environment variables** instead of hardcoding tokens
5. **Set up role-based permissions** in Discord server settings

## Example Configuration

Full example with all options:

```json
{
  "providers": {
    "openai": {
      "apiKey": "sk-..."
    }
  },
  "agents": {
    "defaults": {
      "model": "gpt-4o"
    }
  },
  "channels": {
    "discord": {
      "enabled": true,
      "token": "YOUR_DISCORD_BOT_TOKEN",
      "allowFrom": ["*"],
      "dmPolicy": "open"
    },
    "telegram": {
      "enabled": false
    },
    "whatsapp": {
      "enabled": false
    },
    "web": {
      "enabled": true,
      "port": 3100
    }
  }
}
```

## Features

- ✅ Real-time typing indicator
- ✅ Automatic message splitting (2000 char limit)
- ✅ Suppresses internal reasoning/thinking blocks
- ✅ Access control per user
- ✅ DM and server channel support
- ✅ Graceful error handling

## Links

- [Discord Developer Portal](https://discord.com/developers/applications)
- [Discord.js Documentation](https://discord.js.org/)
- [Discord Bot Best Practices](https://discord.com/developers/docs/topics/community-resources)

---

Need help? Open an issue on GitHub or check the [NexusClaw Documentation](https://github.com/nexusclaw/nexusclaw).
