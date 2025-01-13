const { Client, GatewayIntentBits } = require('discord.js');
const { Rcon } = require('rcon-client');
const { config } = require('./config');
const WebhookHandler = require('./handlers/WebhookHandler');

const client = new Client({
  intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildIntegrations
  ]
});

class RconBot {
    constructor(client) {
        this.client = client;
        this.rconConnections = new Map(); // Will store connections as 'guildId-serverName': connection
        this.webhookHandler = new WebhookHandler(this);
        this.connectionAttempts = new Map(); // Track connection attempts
        this.maxRetries = 3; // Maximum number of connection retries
    }

    async connect(guildId, serverName) {
        console.log(`Attempting to connect to ${serverName} RCON in guild ${guildId}...`);
        
        const connectionKey = `${guildId}-${serverName}`;
        
        try {
            // Check if server exists in config
            if (!config.servers[guildId]?.[serverName]) {
                throw new Error(`Server ${serverName} not found in configuration for guild ${guildId}`);
            }

            // Close existing connection if any
            const existingConnection = this.rconConnections.get(connectionKey);
            if (existingConnection) {
                try {
                    await existingConnection.end();
                } catch (err) {
                    console.log(`Error closing existing connection: ${err}`);
                }
            }

            const serverConfig = config.servers[guildId][serverName];
            const rcon = new Rcon({
                host: serverConfig.host,
                port: serverConfig.port,
                password: serverConfig.password,
                timeout: 5000 // 5 second timeout
            });

            // Add event handlers
            rcon.on('connect', () => {
                console.log(`Connected to ${serverName} RCON in guild ${guildId}`);
                this.connectionAttempts.delete(connectionKey); // Reset connection attempts on successful connection
            });

            rcon.on('authenticated', () => {
                console.log(`Authenticated with ${serverName} RCON in guild ${guildId}`);
            });

            rcon.on('error', (error) => {
                console.error(`RCON error for ${serverName} in guild ${guildId}:`, error);
                this.rconConnections.delete(connectionKey);
            });

            rcon.on('end', () => {
                console.log(`RCON connection ended for ${serverName} in guild ${guildId}`);
                this.rconConnections.delete(connectionKey);
            });

            await rcon.connect();
            this.rconConnections.set(connectionKey, rcon);
            
            // Test the connection
            const response = await rcon.send('listplayers');
            console.log(`Test command response from ${serverName} in guild ${guildId}:`, response);

            return rcon;
        } catch (error) {
            console.error(`Failed to connect to ${serverName} RCON in guild ${guildId}:`, error);
            
            // Track connection attempts
            const attempts = (this.connectionAttempts.get(connectionKey) || 0) + 1;
            this.connectionAttempts.set(connectionKey, attempts);
            
            if (attempts >= this.maxRetries) {
                this.connectionAttempts.delete(connectionKey);
                throw new Error(`Failed to connect after ${this.maxRetries} attempts: ${error.message}`);
            }
            
            // Exponential backoff for retries
            const delay = Math.min(1000 * Math.pow(2, attempts - 1), 30000); // Max 30 second delay
            await new Promise(resolve => setTimeout(resolve, delay));
            
            return this.connect(guildId, serverName); // Retry connection
        }
    }

    async executeCommand(guildId, serverName, command) {
        console.log(`Executing command '${command}' on server '${serverName}' in guild ${guildId}`);
        
        const connectionKey = `${guildId}-${serverName}`;
        let rcon = this.rconConnections.get(connectionKey);
        
        // If no connection exists or connection is closed, try to reconnect
        if (!rcon || !rcon.authenticated) {
            console.log(`No active connection for ${serverName} in guild ${guildId}, attempting to connect...`);
            try {
                rcon = await this.connect(guildId, serverName);
            } catch (error) {
                console.error(`Connection failed for ${serverName} in guild ${guildId}:`, error);
                throw new Error(`Failed to connect to server: ${error.message}`);
            }
        }

        try {
            const result = await rcon.send(command);
            console.log(`Command '${command}' executed successfully on ${serverName} in guild ${guildId}`);
            return result;
        } catch (error) {
            console.error(`Error executing command on ${serverName} in guild ${guildId}:`, error);
            
            // Try to reconnect once on failure
            try {
                console.log(`Attempting to reconnect to ${serverName} in guild ${guildId}...`);
                rcon = await this.connect(guildId, serverName);
                const result = await rcon.send(command);
                console.log(`Command '${command}' executed successfully after reconnection`);
                return result;
            } catch (retryError) {
                console.error(`Retry failed for ${serverName} in guild ${guildId}:`, retryError);
                throw new Error(`Failed to execute command: ${retryError.message}`);
            }
        }
    }

    async disconnectAll() {
        console.log('Disconnecting all RCON connections...');
        const disconnectPromises = [];
        
        for (const [connectionKey, rcon] of this.rconConnections) {
            disconnectPromises.push(
                rcon.end()
                    .catch(error => console.error(`Error disconnecting ${connectionKey}:`, error))
            );
        }
        
        await Promise.allSettled(disconnectPromises);
        this.rconConnections.clear();
        console.log('All RCON connections closed');
    }
}

// Create bot instance
const bot = new RconBot(client);

// Handle process termination
process.on('SIGINT', async () => {
    console.log('Received SIGINT. Cleaning up...');
    await bot.disconnectAll();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Received SIGTERM. Cleaning up...');
    await bot.disconnectAll();
    process.exit(0);
});

module.exports = bot;
