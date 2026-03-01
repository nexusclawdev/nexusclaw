# NexusClaw Notifications System

## Overview
Agents automatically notify you when they complete tasks via Telegram, Discord, or WhatsApp.

## Quick Setup

1. **Copy example config:**
   ```bash
   cp config/notifications.example.json config/notifications.json
   ```

2. **Add your credentials** (choose one or more):
   - **Telegram**: Get bot token from @BotFather, chat ID from @userinfobot
   - **Discord**: Create webhook in server settings → Integrations
   - **WhatsApp**: Sign up for Twilio, get Account SID + Auth Token

3. **Start gateway:**
   ```bash
   nexusclaw gateway
   ```

## Notification Message
```
✅ Task Completed!

Agent: Elena
Task: Build landing page
Status: done
Completed: 3/1/2026, 12:45:30 PM
```

## Files
- `src/notifications/index.ts` - Notification service
- `src/agent/task-worker.ts` - Sends notifications on task completion
- `config/notifications.json` - Your credentials (gitignored)
- `docs/NOTIFICATIONS.md` - Full setup guide

## Preview PDF Scanner
Open in browser:
```
file:///C:/Users/THOR/.nexusclaw/workspace/pdf-scanner.html
```

Or run local server:
```bash
cd C:\Users\THOR\.nexusclaw\workspace
python -m http.server 8080
# Open: http://localhost:8080/pdf-scanner.html
```
