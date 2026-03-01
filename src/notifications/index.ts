import type { Task, Agent } from '../db/database.js';

export interface NotificationConfig {
  telegram?: {
    botToken: string;
    chatId: string;
  };
  discord?: {
    webhookUrl: string;
  };
  whatsapp?: {
    accountSid: string;
    authToken: string;
    from: string;
    to: string;
  };
}

export class NotificationService {
  private config: NotificationConfig;

  constructor(config: NotificationConfig) {
    this.config = config;
  }

  async notifyTaskComplete(task: Task, agent: Agent): Promise<void> {
    const message = this.formatCompletionMessage(task, agent);

    const promises: Promise<void>[] = [];

    if (this.config.telegram) {
      promises.push(this.sendTelegram(message));
    }

    if (this.config.discord) {
      promises.push(this.sendDiscord(message));
    }

    if (this.config.whatsapp) {
      promises.push(this.sendWhatsApp(message));
    }

    await Promise.allSettled(promises);
  }

  private formatCompletionMessage(task: Task, agent: Agent): string {
    return `✅ Task Completed!\n\n` +
           `Agent: ${agent.name}\n` +
           `Task: ${task.title}\n` +
           `Status: ${task.status}\n` +
           `Completed: ${new Date().toLocaleString()}`;
  }

  private async sendTelegram(message: string): Promise<void> {
    if (!this.config.telegram) return;

    const { botToken, chatId } = this.config.telegram;
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });
  }

  private async sendDiscord(message: string): Promise<void> {
    if (!this.config.discord) return;

    await fetch(this.config.discord.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: message,
        username: 'NexusClaw Agent'
      })
    });
  }

  private async sendWhatsApp(message: string): Promise<void> {
    if (!this.config.whatsapp) return;

    const { accountSid, authToken, from, to } = this.config.whatsapp;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        From: from,
        To: to,
        Body: message
      })
    });
  }
}
