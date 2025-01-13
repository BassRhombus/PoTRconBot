require('dotenv').config();
const { REST, Routes } = require('discord.js');
const bot = require('./index');
const { config } = require('./config');
const fs = require('fs').promises;
const path = require('path');

const COMMANDS_FILE = path.join(__dirname, 'commands.json');
const customCommands = new Map();
const ADMIN_PERMISSION = '8';

function getServerChoices(guildId) {
    if (!config.servers || !config.servers[guildId]) return [];
    return Object.keys(config.servers[guildId]).map(server => ({
        name: server,
        value: server
    }));
}

function getCommandChoices(guildId) {
    if (!config.commands || !config.commands[guildId]) return [];
    return Object.keys(config.commands[guildId]).map(trigger => ({
        name: `$${trigger}`,
        value: trigger
    }));
}

async function loadCommands() {
    try {
        const data = await fs.readFile(COMMANDS_FILE, 'utf8');
        const json = JSON.parse(data);
        if (json.guildCommands) {
            Object.entries(json.guildCommands).forEach(([guildId, commands]) => {
                if (!customCommands.has(guildId)) {
                    customCommands.set(guildId, new Map());
                }
                Object.entries(commands).forEach(([trigger, data]) => {
                    customCommands.get(guildId).set(trigger, data);
                });
            });
        }
        console.log('Loaded guild-specific commands:', customCommands);
    } catch (error) {
        if (error.code === 'ENOENT') {
            await saveCommands();
        } else {
            console.error('Error loading commands:', error);
        }
    }
}

async function saveCommands() {
    try {
        const guildCommands = {};
        customCommands.forEach((commands, guildId) => {
            guildCommands[guildId] = Object.fromEntries(commands);
        });
        
        const data = {
            guildCommands
        };
        await fs.writeFile(COMMANDS_FILE, JSON.stringify(data, null, 2));
        console.log('Saved guild-specific commands to file');
    } catch (error) {
        console.error('Error saving commands:', error);
    }
}

async function updateConfig(newConfig) {
    try {
        const configPath = path.join(__dirname, 'config.js');
        const configContent = `const config = ${JSON.stringify(newConfig, null, 2)};
  
module.exports = { config };`;

        await fs.writeFile(configPath, configContent, 'utf8');
        console.log('Config file updated successfully');
    } catch (error) {
        console.error('Error updating config file:', error);
        throw error;
    }
}

const commands = [
    {
        name: 'restart',
        description: 'Restart the server',
        default_member_permissions: ADMIN_PERMISSION,
        options: [
            {
                name: 'server',
                description: 'Server to restart',
                type: 3,
                required: true,
                autocomplete: true
            }
        ]
    },
    {
        name: 'healall',
        description: 'Heal all players on the server',
        default_member_permissions: ADMIN_PERMISSION,
        options: [
            {
                name: 'server',
                description: 'Server to execute healall on',
                type: 3,
                required: true,
                autocomplete: true
            }
        ]
    },
    {
        name: 'addcommand',
        description: 'Add a custom in-game command',
        default_member_permissions: ADMIN_PERMISSION,
        options: [
            {
                name: 'trigger',
                description: 'The command trigger (without $)',
                type: 3,
                required: true
            },
            {
                name: 'command',
                description: 'Command to execute (use {player} for player name, {ID} for AlderonID)',
                type: 3,
                required: true
            },
            {
                name: 'server',
                description: 'Specific server to execute on (leave empty for all servers)',
                type: 3,
                required: false,
                autocomplete: true
            },
            {
                name: 'whispermessage',
                description: 'Optional message to whisper to the player',
                type: 3,
                required: false
            }
        ]
    },
    {
        name: 'removecommand',
        description: 'Remove a custom in-game command',
        default_member_permissions: ADMIN_PERMISSION,
        options: [
            {
                name: 'trigger',
                description: 'The command to remove',
                type: 3,
                required: true,
                autocomplete: true
            }
        ]
    },
    {
        name: 'listcommands',
        description: 'List all custom in-game commands',
        default_member_permissions: ADMIN_PERMISSION
    },
    {
        name: 'setchatchannel',
        description: 'Set the channel for monitoring game chat',
        default_member_permissions: ADMIN_PERMISSION,
        options: [
            {
                name: 'channel',
                description: 'The channel to monitor',
                type: 7,
                required: true,
                channel_types: [0]
            }
        ]
    },
    {
        name: 'setspawnchannel',
        description: 'Set the channel for monitoring spawn messages',
        default_member_permissions: ADMIN_PERMISSION,
        options: [
            {
                name: 'channel',
                description: 'The channel to monitor for spawn messages',
                type: 7,
                required: true,
                channel_types: [0]
            }
        ]
    },
    {
        name: 'spawn',
        description: 'Set spawn point for teleporting players',
        default_member_permissions: ADMIN_PERMISSION,
        options: [
            {
                name: 'location',
                description: 'Coordinates for spawn (x,y,z)',
                type: 3,
                required: true
            },
            {
                name: 'server',
                description: 'Server to set spawn on',
                type: 3,
                required: true,
                autocomplete: true
            }
        ]
    },
    {
        name: 'addserver',
        description: 'Add a new server to the configuration',
        default_member_permissions: ADMIN_PERMISSION,
        options: [
            {
                name: 'name',
                description: 'Server name',
                type: 3,
                required: true
            },
            {
                name: 'host',
                description: 'Server IP address',
                type: 3,
                required: true
            },
            {
                name: 'port',
                description: 'Server RCON port',
                type: 4,
                required: true
            },
            {
                name: 'password',
                description: 'Server RCON password',
                type: 3,
                required: true
            }
        ]
    },
    {
        name: 'removeserver',
        description: 'Remove a server from the configuration',
        default_member_permissions: ADMIN_PERMISSION,
        options: [
            {
                name: 'name',
                description: 'Server to remove',
                type: 3,
                required: true,
                autocomplete: true
            }
        ]
    },
    {
        name: 'listservers',
        description: 'List all configured servers',
        default_member_permissions: ADMIN_PERMISSION
    }
];
bot.client.once('ready', async () => {
    try {
        console.log('Bot is starting up...');
        console.log(`Logged in as ${bot.client.user.tag}`);

        // Load commands first
        console.log('Loading custom commands...');
        await loadCommands();
        console.log('Custom commands loaded successfully');

        // Initialize configurations with logging
        console.log('Initializing configurations...');
        if (!config.servers) {
            config.servers = {};
            console.log('Initialized empty servers configuration');
        }
        if (!config.commands) {
            config.commands = {};
            console.log('Initialized empty commands configuration');
        }
        if (!config.chatChannelIds) {
            config.chatChannelIds = {};
            console.log('Initialized empty chat channel IDs configuration');
        }
        if (!config.spawnChannelIds) {
            config.spawnChannelIds = {};
            console.log('Initialized empty spawn channel IDs configuration');
        }
        if (!config.spawnLocations) {
            config.spawnLocations = {};
            console.log('Initialized empty spawn locations configuration');
        }

        // Register commands
        console.log('Starting command registration process...');
        const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
        const clientId = bot.client.user.id;
        console.log(`Bot Client ID: ${clientId}`);

        // Fetch guilds with error handling
        console.log('Fetching guild list...');
        let guilds;
        try {
            guilds = await bot.client.guilds.fetch();
            console.log(`Found ${guilds.size} guilds`);
        } catch (error) {
            console.error('Failed to fetch guilds:', error);
            guilds = new Map(); // Empty map as fallback
        }

        // Register commands for each guild
        for (const [guildId, guild] of guilds) {
            console.log(`Processing guild ${guildId}...`);
            try {
                console.log(`Registering commands for guild ${guildId}...`);
                const result = await rest.put(
                    Routes.applicationGuildCommands(clientId, guildId),
                    { body: commands }
                );
                console.log(`Successfully registered ${result.length} commands for guild ${guildId}`);
            } catch (error) {
                console.error(`Failed to register commands for guild ${guildId}:`, error);
            }
        }

        // Attempt RCON connections
        console.log('\nAttempting RCON connections...');
        for (const [guildId, servers] of Object.entries(config.servers)) {
            console.log(`Processing RCON connections for guild ${guildId}...`);
            
            if (!customCommands.has(guildId)) {
                customCommands.set(guildId, new Map());
                console.log(`Initialized custom commands map for guild ${guildId}`);
            }
            
            for (const [serverName, serverConfig] of Object.entries(servers)) {
                try {
                    console.log(`Connecting to server ${serverName} in guild ${guildId}...`);
                    await bot.connect(guildId, serverName);
                    console.log(`Successfully connected to ${serverName}`);
                    
                    const testResult = await bot.executeCommand(guildId, serverName, 'listplayers');
                    console.log(`Test command result for ${serverName}:`, testResult);
                } catch (error) {
                    console.error(`Failed to connect to ${serverName} in guild ${guildId}:`, error);
                }
            }
        }

        console.log('\nBot initialization complete!');
    } catch (error) {
        console.error('Critical error during bot initialization:', error);
    }
});

// Add immediate error handlers
bot.client.on('error', error => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});

// Modified login with error handling
console.log('Attempting to log in...');
bot.client.login(process.env.BOT_TOKEN).catch(error => {
    console.error('Failed to login:', error);
    process.exit(1);
});

bot.client.on('guildCreate', async (guild) => {
    try {
        const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
        const clientId = bot.client.user.id;

        console.log(`Registering commands for new guild ${guild.id}...`);
        await rest.put(
            Routes.applicationGuildCommands(clientId, guild.id),
            { body: commands }
        );
        console.log(`Successfully registered commands for new guild ${guild.id}`);
    } catch (error) {
        console.error(`Failed to register commands for new guild ${guild.id}:`, error);
    }
});

// Single autocomplete handler
bot.client.on('interactionCreate', async interaction => {
    if (!interaction.isAutocomplete()) return;

    try {
        const { guildId } = interaction;
        const focused = interaction.options.getFocused().toLowerCase();
        
        if (['restart', 'healall', 'spawn', 'addcommand'].includes(interaction.commandName)) {
            const choices = getServerChoices(guildId);
            const filtered = choices.filter(choice => 
                choice.name.toLowerCase().includes(focused)
            );
            await interaction.respond(filtered.slice(0, 25));
        } else if (interaction.commandName === 'removecommand') {
            const choices = getCommandChoices(guildId);
            const filtered = choices.filter(choice =>
                choice.name.toLowerCase().includes(focused) ||
                choice.value.toLowerCase().includes(focused)
            );
            await interaction.respond(filtered.slice(0, 25));
        } else if (interaction.commandName === 'removeserver') {
            const choices = getServerChoices(guildId);
            const filtered = choices.filter(choice =>
                choice.name.toLowerCase().includes(focused)
            );
            await interaction.respond(filtered.slice(0, 25));
        }
    } catch (error) {
        console.error('Autocomplete error:', error);
    }
});

// Single command handler
bot.client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { guildId } = interaction;

    try {
        switch (interaction.commandName) {
            case 'restart':
                await interaction.deferReply({ ephemeral: true });
                try {
                    const serverName = interaction.options.getString('server');
                    if (!serverName) {
                        await interaction.editReply('Error: Server name is required');
                        return;
                    }
                    await bot.executeCommand(guildId, serverName, 'quit');
                    await interaction.editReply('Server restart initiated');
                } catch (error) {
                    await interaction.editReply(`Error: ${error.message}`);
                }
                break;

            case 'healall':
                await interaction.deferReply({ ephemeral: true });
                try {
                    const serverName = interaction.options.getString('server');
                    if (!serverName) {
                        await interaction.editReply('Error: Server name is required');
                        return;
                    }
                    await bot.executeCommand(guildId, serverName, 'HealAllPlayers');
                    await interaction.editReply('Healed all players');
                } catch (error) {
                    await interaction.editReply(`Error: ${error.message}`);
                }
                break;

            case 'addcommand':
                await interaction.deferReply({ ephemeral: true });
                try {
                    const trigger = interaction.options.getString('trigger').toLowerCase();
                    const command = interaction.options.getString('command');
                    const serverName = interaction.options.getString('server');
                    const whisperMessage = interaction.options.getString('whispermessage');

                    if (!config.commands[guildId]) {
                        config.commands[guildId] = {};
                    }

                    config.commands[guildId][trigger] = {
                        command: command,
                        server: serverName || 'all',
                        whisperMessage: whisperMessage || null
                    };

                    await updateConfig(config);

                    const serverMsg = serverName ? `Server: ${serverName}` : 'All Servers';
                    const whisperMsg = whisperMessage ? `\nWhisper: ${whisperMessage}` : '';
                    await interaction.editReply(
                        `Added custom command: $${trigger} -> ${command} (${serverMsg})${whisperMsg}`
                    );
                } catch (error) {
                    await interaction.editReply(`Error: ${error.message}`);
                }
                break;

            case 'removecommand':
                await interaction.deferReply({ ephemeral: true });
                try {
                    const trigger = interaction.options.getString('trigger').toLowerCase();
                    
                    if (!config.commands[guildId]?.[trigger]) {
                        await interaction.editReply('Command not found');
                        return;
                    }

                    const commandData = config.commands[guildId][trigger];
                    delete config.commands[guildId][trigger];
                    await updateConfig(config);

                    const serverMsg = commandData.server === 'all' ? 'All Servers' : `Server: ${commandData.server}`;
                    const whisperMsg = commandData.whisperMessage ? `\nWhisper: ${commandData.whisperMessage}` : '';
                    await interaction.editReply(
                        `Removed command: $${trigger} -> ${commandData.command} (${serverMsg})${whisperMsg}`
                    );
                } catch (error) {
                    await interaction.editReply(`Error: ${error.message}`);
                }
                break;

            case 'listcommands':
                await interaction.deferReply({ ephemeral: true });
                try {
                    const guildCommands = config.commands[guildId] || {};
                    const commandList = Object.entries(guildCommands)
                        .map(([trigger, data]) => {
                            const serverMsg = data.server === 'all' ? 'All Servers' : `Server: ${data.server}`;
                            const whisperMsg = data.whisperMessage ? `\n  Whisper: ${data.whisperMessage}` : '';
                            return `$${trigger} -> ${data.command} (${serverMsg})${whisperMsg}`;
                        })
                        .join('\n\n');

                    await interaction.editReply(commandList || 'No custom commands configured');
                } catch (error) {
                    await interaction.editReply(`Error: ${error.message}`);
                }
                break;

            case 'setchatchannel':
                await interaction.deferReply({ ephemeral: true });
                try {
                    const channelId = interaction.options.getChannel('channel').id;
                    config.chatChannelIds[guildId] = channelId;
                    await updateConfig(config);
                    await interaction.editReply(`Chat monitoring channel set to <#${channelId}>`);
                } catch (error) {
                    await interaction.editReply(`Error: ${error.message}`);
                }
                break;

            case 'setspawnchannel':
                await interaction.deferReply({ ephemeral: true });
                try {
                    const channelId = interaction.options.getChannel('channel').id;
                    config.spawnChannelIds[guildId] = channelId;
                    await updateConfig(config);
                    await interaction.editReply(`Spawn monitoring channel set to <#${channelId}>`);
                } catch (error) {
                    await interaction.editReply(`Error: ${error.message}`);
                }
                break;

            case 'spawn':
                await interaction.deferReply({ ephemeral: true });
                try {
                    const location = interaction.options.getString('location');
                    const serverName = interaction.options.getString('server');

                    if (!config.spawnLocations[guildId]) {
                        config.spawnLocations[guildId] = {};
                    }
                    
                    config.spawnLocations[guildId][serverName] = location;
                    await updateConfig(config);
                    await interaction.editReply(`Spawn location set to ${location} for server ${serverName}`);
                } catch (error) {
                    await interaction.editReply(`Error: ${error.message}`);
                }
                break;

            case 'addserver':
                await interaction.deferReply({ ephemeral: true });
                try {
                    const serverName = interaction.options.getString('name');
                    const host = interaction.options.getString('host');
                    const port = interaction.options.getInteger('port');
                    const password = interaction.options.getString('password');

                    if (!config.servers[guildId]) {
                        config.servers[guildId] = {};
                    }

                    if (config.servers[guildId][serverName]) {
                        await interaction.editReply('A server with that name already exists in this Discord server.');
                        return;
                    }

                    config.servers[guildId][serverName] = {
                        host,
                        port,
                        password
                    };

                    await updateConfig(config);
                    await bot.connect(guildId, serverName);
                    await interaction.editReply(`Successfully added server: ${serverName}`);
                } catch (error) {
                    if (config.servers[guildId]?.[serverName]) {
                        delete config.servers[guildId][serverName];
                        await updateConfig(config);
                    }
                    await interaction.editReply(`Error adding server: ${error.message}`);
                }
                break;

            case 'removeserver':
                await interaction.deferReply({ ephemeral: true });
                try {
                    const serverName = interaction.options.getString('name');

                    if (!config.servers[guildId]?.[serverName]) {
                        await interaction.editReply('Server not found in configuration.');
                        return;
                    }

                    const connectionKey = `${guildId}-${serverName}`;
                    if (bot.rconConnections.has(connectionKey)) {
                        bot.rconConnections.get(connectionKey).disconnect();
                        bot.rconConnections.delete(connectionKey);
                    }

                    delete config.servers[guildId][serverName];
                    await updateConfig(config);
                    await interaction.editReply(`Successfully removed server: ${serverName}`);
                } catch (error) {
                    await interaction.editReply(`Error removing server: ${error.message}`);
                }
                break;

            case 'listservers':
                await interaction.deferReply({ ephemeral: true });
                try {
                    const guildServers = config.servers[guildId] || {};
                    const serverList = Object.entries(guildServers)
                        .map(([name, data]) => `${name}\n  Host: ${data.host}\n  Port: ${data.port}`)
                        .join('\n\n');

                    await interaction.editReply(serverList || 'No servers configured for this Discord server');
                } catch (error) {
                    await interaction.editReply(`Error: ${error.message}`);
                }
                break;

            default:
                await interaction.reply({ content: 'Unknown command', ephemeral: true });
                break;
        }
    } catch (error) {
        console.error('Command execution error:', error);
        try {
            if (interaction.deferred) {
                await interaction.editReply({ content: `Error: ${error.message}`, ephemeral: true });
            } else if (!interaction.replied) {
                await interaction.reply({ content: `Error: ${error.message}`, ephemeral: true });
            }
        } catch (replyError) {
            console.error('Error sending error response:', replyError);
        }
    }
});

// Single unified message handler for both chat and spawn monitoring
bot.client.on('messageCreate', async message => {
    const guildId = message.guild?.id;
    if (!guildId) return;

    // Chat monitoring
    if (message.channelId === config.chatChannelIds[guildId]) {
        if (!message.embeds?.[0]?.description) return;

        const embedContent = message.embeds[0].description;
        console.log('Received embed in chat monitoring channel:', embedContent);

        try {
            const messageMatch = embedContent.match(/\*\*Message:\*\* ([^\*]+)/);
            const playerIdMatch = embedContent.match(/\*\*AlderonId:\*\* ([0-9]{3}-[0-9]{3}-[0-9]{3})/);
            const playerNameMatch = embedContent.match(/\*\*PlayerName:\*\* ([^\*]+)/);

            if (!messageMatch || !playerIdMatch) return;

            const messageContent = messageMatch[1].trim();
            const playerID = playerIdMatch[1];
            const playerName = playerNameMatch ? playerNameMatch[1].trim() : '';

            if (!messageContent.startsWith('$')) return;

            const trigger = messageContent.split(' ')[0].substring(1).toLowerCase();
            
            if (config.commands?.[guildId]?.[trigger]) {
                const commandData = config.commands[guildId][trigger];
                let commandToExecute = commandData.command
                    .replace(/{ID}/g, playerID)
                    .replace(/{player}/g, playerName);

                if (commandData.server === 'all') {
                    for (const serverName of Object.keys(config.servers[guildId] || {})) {
                        try {
                            await bot.executeCommand(guildId, serverName, commandToExecute);
                            if (commandData.whisperMessage) {
                                const whisperCommand = `whisper ${playerID} ${commandData.whisperMessage}`
                                    .replace(/{ID}/g, playerID)
                                    .replace(/{player}/g, playerName);
                                await bot.executeCommand(guildId, serverName, whisperCommand);
                            }
                        } catch (error) {
                            console.error(`Error executing command on ${serverName} in guild ${guildId}:`, error);
                        }
                    }
                } else {
                    try {
                        await bot.executeCommand(guildId, commandData.server, commandToExecute);
                        if (commandData.whisperMessage) {
                            const whisperCommand = `whisper ${playerID} ${commandData.whisperMessage}`
                                .replace(/{ID}/g, playerID)
                                .replace(/{player}/g, playerName);
                            await bot.executeCommand(guildId, commandData.server, whisperCommand);
                        }
                    } catch (error) {
                        console.error(`Error executing command on ${commandData.server} in guild ${guildId}:`, error);
                    }
                }
            }
        } catch (error) {
            console.error('Error processing chat message:', error);
        }
    }

    // Spawn monitoring
    if (message.channelId === config.spawnChannelIds[guildId]) {
        try {
            console.log('\n=== New Message in Spawn Channel ===');
            
            if (!message.embeds?.[0]?.description) {
                console.log('No valid embed found in message');
                return;
            }

            const embedContent = message.embeds[0].description;
            console.log('\nEmbed Description:', embedContent);

            const playerIdMatch = embedContent.match(/\*\*PlayerAlderonId:\*\* ([0-9]{3}-[0-9]{3}-[0-9]{3})/);
            if (!playerIdMatch) {
                console.log('No PlayerAlderonId found in embed');
                return;
            }

            const playerID = playerIdMatch[1];
            console.log('Found PlayerID:', playerID);

            const playerNameMatch = embedContent.match(/\*\*PlayerName:\*\* ([^\*]+)/);
            const playerName = playerNameMatch ? playerNameMatch[1].trim() : 'Unknown Player';

            const guildSpawnLocations = config.spawnLocations[guildId] || {};
            for (const [serverName, spawnLocation] of Object.entries(guildSpawnLocations)) {
                try {
                    if (spawnLocation) {
                        const teleportCommand = `teleport ${playerID} ${spawnLocation}`;
                        console.log(`\nExecuting command for ${playerName} on ${serverName}:`, teleportCommand);
                        await bot.executeCommand(guildId, serverName, teleportCommand);
                        console.log(`Successfully teleported ${playerName} (${playerID}) to ${spawnLocation} on ${serverName}`);
                    }
                } catch (error) {
                    console.error(`Failed to teleport player on ${serverName} in guild ${guildId}:`, error);
                }
            }
            console.log('=== End of Spawn Processing ===\n');
        } catch (error) {
            console.error('Error processing spawn message:', error);
            console.error('Error details:', error.stack);
        }
    }
});

// Connection health check
setInterval(async () => {
    for (const [connectionKey, connection] of bot.rconConnections) {
        const [guildId, serverName] = connectionKey.split('-');
        try {
            await bot.executeCommand(guildId, serverName, 'listplayers');
        } catch (error) {
            console.log(`Connection check failed for ${serverName} in guild ${guildId}`);
            try {
                await bot.connect(guildId, serverName);
                console.log(`Reconnected to ${serverName} in guild ${guildId}`);
            } catch (reconnectError) {
                console.error(`Failed to reconnect to ${serverName} in guild ${guildId}:`, reconnectError);
            }
        }
    }
}, 30000);

// Error handlers
bot.client.on('error', error => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// Start the bot
bot.client.login(process.env.BOT_TOKEN);