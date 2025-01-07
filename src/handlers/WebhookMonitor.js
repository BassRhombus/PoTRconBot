const { WebhookClient } = require('discord.js');

class WebhookMonitor {
  constructor(bot) {
    this.bot = bot;
    this.webhooks = new Map();
  }

  registerWebhook(config) {
    const webhook = new WebhookClient({ url: config.url });
    
    webhook.on('message', async (message) => {
      if (config.trigger(message)) {
        await config.action(this.bot, message);
      }
    });

    this.webhooks.set(config.name, {
      ...config,
      client: webhook
    });
  }
}

module.exports = WebhookMonitor;