const { Client, GatewayIntentBits } = require('discord.js');
const { Rcon } = require('rcon-client');
const { config } = require('./config');
const WebhookHandler = require('./handlers/WebhookHandler');

class RconBot {
  constructor(client) {
    this.client = client;
    this.rconConnections = new Map();
    this.webhookHandler = new WebhookHandler(this);
  }

  async connect(server) {
    console.log(`Attempting to connect to ${server} RCON...`);
    
    try {
      // Close existing connection if any
      const existingConnection = this.rconConnections.get(server);
      if (existingConnection) {
        try {
          await existingConnection.end();
        } catch (err) {
          console.log(`Error closing existing connection: ${err}`);
        }
      }

      const rcon = new Rcon({
        host: config.servers[server].host,
        port: config.servers[server].port,
        password: config.servers[server].password
      });

      // Add event handlers
      rcon.on('connect', () => {
        console.log(`Connected to ${server} RCON`);
      });

      rcon.on('authenticated', () => {
        console.log(`Authenticated with ${server} RCON`);
      });

      rcon.on('error', (error) => {
        console.error(`RCON error for ${server}:`, error);
        this.rconConnections.delete(server);
      });

      rcon.on('end', () => {
        console.log(`RCON connection ended for ${server}`);
        this.rconConnections.delete(server);
      });

      await rcon.connect();
      this.rconConnections.set(server, rcon);
      
      // Test the connection
      const response = await rcon.send('listplayers');
      console.log(`Test command response from ${server}:`, response);

      return rcon;
    } catch (error) {
      console.error(`Failed to connect to ${server} RCON:`, error);
      throw error;
    }
  }

  async executeCommand(server, command) {
    console.log(`Attempting to execute command '${command}' on server '${server}'`);
    
    let rcon = this.rconConnections.get(server);
    
    // If no connection exists or connection is closed, try to reconnect
    if (!rcon || !rcon.authenticated) {
      console.log(`No active connection for ${server}, attempting to reconnect...`);
      try {
        rcon = await this.connect(server);
      } catch (error) {
        console.error(`Reconnection failed for ${server}:`, error);
        throw new Error(`Failed to connect to server: ${error.message}`);
      }
    }

    try {
      const result = await rcon.send(command);
      console.log(`Command '${command}' executed successfully on ${server}`);
      return result;
    } catch (error) {
      console.error(`Error executing command on ${server}:`, error);
      // Try to reconnect once on failure
      try {
        console.log(`Attempting to reconnect to ${server}...`);
        rcon = await this.connect(server);
        const result = await rcon.send(command);
        console.log(`Command '${command}' executed successfully after reconnection`);
        return result;
      } catch (retryError) {
        console.error(`Retry failed for ${server}:`, retryError);
        throw new Error(`Failed to execute command: ${retryError.message}`);
      }
    }
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const bot = new RconBot(client);
module.exports = bot;
