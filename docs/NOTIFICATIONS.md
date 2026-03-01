# 📬 Notification Setup Guide

NexusClaw can send you notifications when agents complete tasks via Telegram, Discord, or WhatsApp.

## Setup Instructions

### 1. Create Configuration File

Copy the example config:
```bash
cp config/notifications.example.json config/notifications.json
```

### 2. Configure Your Channels

Edit `config/notifications.json` with your credentials:

#### Telegram Setup
1. Create a bot via [@BotFather](https://t.me/botfather)
2. Get your bot token
3. Get your chat ID by messaging [@userinfobot](https://t.me/userinfobot)

```json
{
  "telegram": {
    "botToken": "123456789:ABCdefGHIjklMNOpqrsTUVwxyz",
    "chatId": "123456789"
  }
}
```

#### Discord Setup
1. Go to your Discord server settings
2. Integrations → Webhooks → New Webhook
3. Copy the webhook URL

```json
{
  "discord": {
    "webhookUrl": "https://discord.com/api/webhooks/..."
  }
}
```

#### WhatsApp Setup (via Twilio)
1. Sign up at [Twilio](https://www.twilio.com/)
2. Get your Account SID and Auth Token
3. Enable WhatsApp sandbox or get approved number

```json
{
  "whatsapp": {
    "accountSid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "authToken": "your_auth_token",
    "from": "whatsapp:+14155238886",
    "to": "whatsapp:+1234567890"
  }
}
```

### 3. Enable Multiple Channels

You can enable all three at once:

```json
{
  "telegram": { ... },
  "discord": { ... },
  "whatsapp": { ... }
}
```

### 4. Start Gateway

```bash
nexusclaw gateway
```

You'll see: `✅ Notifications enabled`

## Notification Format

When an agent completes a task, you'll receive:

```
✅ Task Completed!

Agent: Elena
Task: Build landing page
Status: done
Completed: 3/1/2026, 12:45:30 PM
```

## Security Notes

- Keep `notifications.json` private (it's in `.gitignore`)
- Never commit API tokens to version control
- Use environment variables for production deployments

## Troubleshooting

**No notifications received?**
- Check `config/notifications.json` exists
- Verify credentials are correct
- Check console for error messages
- Test your webhook/bot manually first

**Partial failures?**
- Notifications use `Promise.allSettled()` - one failure won't block others
- Check individual service status in console logs
