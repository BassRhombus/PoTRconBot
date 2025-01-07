require('dotenv').config();
const { REST, Routes } = require('discord.js');
const bot = require('./index');
const { config } = require('./config');
const fs = require('fs').promises;
const path = require('path');

const COMMANDS_FILE = path.join(__dirname, 'commands.json');
const customCommands = new Map();

async function loadCommands() {
    try {
        const data = await fs.readFile(COMMANDS_FILE, 'utf8');
        const json = JSON.parse(data);
        Object.entries(json.customCommands).forEach(([trigger, data]) => {
            customCommands.set(trigger, data);
        });
        console.log('Loaded custom commands:', customCommands);
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
        const data = {
            customCommands: Object.fromEntries(customCommands)
        };
        await fs.writeFile(COMMANDS_FILE, JSON.stringify(data, null, 2));
        console.log('Saved custom commands to file');
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

function getCommandChoices() {
    return Array.from(customCommands.keys()).map(trigger => ({
        name: `$${trigger}`,
        value: trigger
    }));
}

const serverChoices = [
    {
        name: 'Prehistoric Party',
        value: 'Prehistoric Party'
    },
    {
        name: 'Prehistoric Party Events',
        value: 'Prehistoric Party Events'
    }
];

const commands = [
    {
        name: 'restart',
        description: 'Restart the server',
        options: [
            {
                name: 'server',
                description: 'Server to restart',
                type: 3,
                required: true,
                choices: serverChoices
            }
        ]
    },
    {
        name: 'healall',
        description: 'Heal all players on the server',
        options: [
            {
                name: 'server',
                description: 'Server to execute healall on',
                type: 3,
                required: true,
                choices: serverChoices
            }
        ]
    },
    {
        name: 'addcommand',
        description: 'Add a custom in-game command (executes on all servers if no server specified)',
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
                choices: serverChoices
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
    },
    {
        name: 'setchatchannel',
        description: 'Set the channel for monitoring game chat',
        default_member_permissions: '8',
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
        default_member_permissions: '8',
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
                choices: serverChoices
            }
        ]
    },
    {
        name: 'addserver',
        description: 'Add a new server to the configuration',
        default_member_permissions: '8',
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
        default_member_permissions: '8',
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
        default_member_permissions: '8'
    }
];

function getServerChoices() {
    return Object.keys(config.servers).map(server => ({
        name: server,
        value: server
    }));
}

function getServerChoicesForCommands() {
    return Object.keys(config.servers).map(server => ({
        name: server,
        value: server
    }));
}

bot.client.once('ready', async () => {
    console.log('Bot is ready!');

    await loadCommands();

    try {
        console.log('Attempting RCON connections...');
        for (const server of Object.keys(config.servers)) {
            try {
                await bot.connect(server);
                const testResult = await bot.executeCommand(server, 'listplayers');
                console.log(`Test command result for ${server}:`, testResult);
            } catch (error) {
                console.error(`Failed to connect to ${server}:`, error);
            }
        }

        const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
        const clientId = bot.client.user.id;
        const guildId = process.env.GUILD_ID;

        console.log('Started refreshing guild (/) commands.');
        console.log('Bot ID:', clientId);
        console.log('Guild ID:', guildId);

        try {
            console.log('Clearing existing guild commands...');
            await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: [] }
            );

            console.log('Registering new guild commands...');
            const result = await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: commands }
            );

            console.log(`Successfully reloaded ${result.length} guild (/) commands.`);
        } catch (error) {
            console.error('Error managing commands:', error);
        }

    } catch (error) {
        console.error('Error in setup:', error);
    }
});

// Chat monitoring for custom commands
bot.client.on('messageCreate', async message => {
    if (message.channelId !== config.chatChannelId) return;
    if (!message.embeds || message.embeds.length === 0) return;

    const embedContent = message.embeds[0].description;
    if (!embedContent) return;

    console.log('Received embed in monitoring channel:', embedContent);

    try {
        const messageMatch = embedContent.match(/\*\*Message:\*\* ([^\*]+)/);
        const playerIdMatch = embedContent.match(/\*\*AlderonId:\*\* ([0-9]{3}-[0-9]{3}-[0-9]{3})/);
        const playerNameMatch = embedContent.match(/\*\*PlayerName:\*\* ([^\*]+)/);

        if (!messageMatch || !playerIdMatch) {
            console.log('Failed to parse message or ID');
            console.log('Full embed content:', embedContent);
            return;
        }

        const messageContent = messageMatch[1].trim();
        const playerID = playerIdMatch[1];
        const playerName = playerNameMatch ? playerNameMatch[1].trim() : '';

        if (!messageContent.startsWith('$')) return;

        const trigger = messageContent.split(' ')[0].substring(1).toLowerCase();
        
        if (customCommands.has(trigger)) {
            const commandData = customCommands.get(trigger);
            let commandToExecute = commandData.command;

            commandToExecute = commandToExecute
                .replace(/{ID}/g, playerID)
                .replace(/{player}/g, playerName);

            if (commandData.server === 'all') {
                for (const serverName of Object.keys(config.servers)) {
                    try {
                        await bot.executeCommand(serverName, commandToExecute);
                        if (commandData.whisperMessage) {
                            const whisperCommand = `whisper ${playerID} ${commandData.whisperMessage}`
                                .replace(/{ID}/g, playerID)
                                .replace(/{player}/g, playerName);
                            await bot.executeCommand(serverName, whisperCommand);
                        }
                    } catch (error) {
                        console.error(`Error executing command on ${serverName}:`, error);
                    }
                }
            } else {
                try {
                    await bot.executeCommand(commandData.server, commandToExecute);
                    if (commandData.whisperMessage) {
                        const whisperCommand = `whisper ${playerID} ${commandData.whisperMessage}`
                            .replace(/{ID}/g, playerID)
                            .replace(/{player}/g, playerName);
                        await bot.executeCommand(commandData.server, whisperCommand);
                    }
                } catch (error) {
                    console.error(`Error executing command on ${commandData.server}:`, error);
                }
            }
        }
    } catch (error) {
        console.error('Error processing chat message:', error);
    }
});

// Spawn monitoring
bot.client.on('messageCreate', async message => {
    if (message.channelId === config.spawnChannelId) {
        try {
            console.log('\n=== New Message in Spawn Channel ===');
            
            if (!message.embeds || message.embeds.length === 0) {
                console.log('No embeds found in message');
                return;
            }

            const embedContent = message.embeds[0].description;
            if (!embedContent) {
                console.log('No description in embed');
                return;
            }

            console.log('\nEmbed Description:', embedContent);

            // Updated pattern to match PlayerAlderonId
            const playerIdMatch = embedContent.match(/\*\*PlayerAlderonId:\*\* ([0-9]{3}-[0-9]{3}-[0-9]{3})/);
            if (!playerIdMatch) {
                console.log('No PlayerAlderonId found in embed');
                return;
            }

            const playerID = playerIdMatch[1];
            console.log('Found PlayerID:', playerID);

            // Also get player name for logging purposes
            const playerNameMatch = embedContent.match(/\*\*PlayerName:\*\* ([^\*]+)/);
            const playerName = playerNameMatch ? playerNameMatch[1].trim() : 'Unknown Player';

            for (const [serverName, spawnLocation] of Object.entries(config.spawnLocations)) {
                try {
                    if (spawnLocation) {
                        const teleportCommand = `teleport ${playerID} ${spawnLocation}`;
                        console.log(`\nExecuting command for ${playerName} on ${serverName}:`, teleportCommand);
                        await bot.executeCommand(serverName, teleportCommand);
                        console.log(`Successfully teleported ${playerName} (${playerID}) to ${spawnLocation} on ${serverName}`);
                    }
                } catch (error) {
                    console.error(`Failed to teleport player on ${serverName}:`, error);
                }
            }
            console.log('=== End of Spawn Processing ===\n');
        } catch (error) {
            console.error('Error processing spawn message:', error);
            console.error('Error details:', error.stack);
        }
    }
});

bot.client.on('interactionCreate', async interaction => {
    if (interaction.isAutocomplete()) {
        if (interaction.commandName === 'removecommand') {
            const choices = getCommandChoices();
            const focused = interaction.options.getFocused().toLowerCase();
            
            const filtered = choices.filter(choice => 
                choice.name.toLowerCase().includes(focused) || 
                choice.value.toLowerCase().includes(focused)
            );

            await interaction.respond(filtered.slice(0, 25));
        }
        else if (interaction.commandName === 'removeserver') {
            const choices = getServerChoices();
            const focused = interaction.options.getFocused().toLowerCase();
            
            const filtered = choices.filter(choice => 
                choice.name.toLowerCase().includes(focused)
            );

            await interaction.respond(filtered.slice(0, 25));
        }
        return;
    }

    if (!interaction.isCommand()) return;

    try {
        switch (interaction.commandName) {
            case 'restart':
                await interaction.deferReply({ ephemeral: true });
                await bot.executeCommand(interaction.options.getString('server'), 'quit');
                await interaction.editReply('Server restart initiated');
                break;

            case 'healall':
                await interaction.deferReply({ ephemeral: true });
                await bot.executeCommand(interaction.options.getString('server'), 'HealAllPlayers');
                await interaction.editReply('Healed all players');
                break;

            case 'addcommand':
                const trigger = interaction.options.getString('trigger').toLowerCase();
                const command = interaction.options.getString('command');
                const specificServer = interaction.options.getString('server');
                const whisperMessage = interaction.options.getString('whispermessage');

                customCommands.set(trigger, {
                    command: command,
                    server: specificServer || 'all',
                    whisperMessage: whisperMessage || null
                });

                await saveCommands();

                const serverMsg = specificServer ? `Server: ${specificServer}` : 'All Servers';
                const whisperMsg = whisperMessage ? `\nWhisper: ${whisperMessage}` : '';
                await interaction.reply({
                    content: `Added custom command: $${trigger} -> ${command} (${serverMsg})${whisperMsg}`,
                    ephemeral: true
                });
                break;

            case 'removecommand':
                const triggerToRemove = interaction.options.getString('trigger').toLowerCase();
                if (customCommands.has(triggerToRemove)) {
                    const commandData = customCommands.get(triggerToRemove);
                    const serverMsg = commandData.server === 'all' ? 'All Servers' : `Server: ${commandData.server}`;
                    const whisperMsg = commandData.whisperMessage ? `\n                     : ${commandData.whisperMessage}` : '';
                    
                    customCommands.delete(triggerToRemove);
                    await saveCommands();

                    await interaction.reply({
                        content: `Removed command: $${triggerToRemove} -> ${commandData.command} (${serverMsg})${whisperMsg}`,
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({
                        content: `Command $${triggerToRemove} not found`,
                        ephemeral: true
                    });
                }
                break;

            case 'listcommands':
                const commandList = Array.from(customCommands.entries())
                    .map(([trigger, data]) => {
                        const serverMsg = data.server === 'all' ? 'All Servers' : `Server: ${data.server}`;
                        const whisperMsg = data.whisperMessage ? `\n  Whisper: ${data.whisperMessage}` : '';
                        return `$${trigger} -> ${data.command} (${serverMsg})${whisperMsg}`;
                    })
                    .join('\n\n');

                await interaction.reply({
                    content: commandList || 'No custom commands configured',
                    ephemeral: true
                });
                break;

            case 'setchatchannel':
                if (!interaction.member.permissions.has('ADMINISTRATOR')) {
                    await interaction.reply({
                        content: 'You need administrator permissions to use this command.',
                        ephemeral: true
                    });
                    return;
                }

                await interaction.deferReply({ ephemeral: true });

                const newChannelId = interaction.options.getChannel('channel').id;

                config.chatChannelId = newChannelId;

                try {
                    await updateConfig(config);

                    await interaction.editReply({
                        content: `Successfully set chat monitoring channel to <#${newChannelId}>`,
                        ephemeral: true
                    });
                } catch (error) {
                    console.error('Error setting chat channel:', error);
                    await interaction.editReply({
                        content: `Error setting chat channel: ${error.message}`,
                        ephemeral: true
                    });
                }
                break;

            case 'setspawnchannel':
                if (!interaction.member.permissions.has('ADMINISTRATOR')) {
                    await interaction.reply({
                        content: 'You need administrator permissions to use this command.',
                        ephemeral: true
                    });
                    return;
                }

                await interaction.deferReply({ ephemeral: true });

                const newSpawnChannelId = interaction.options.getChannel('channel').id;
                config.spawnChannelId = newSpawnChannelId;

                try {
                    await updateConfig(config);
                    await interaction.editReply({
                        content: `Successfully set spawn monitoring channel to <#${newSpawnChannelId}>`,
                        ephemeral: true
                    });
                } catch (error) {
                    console.error('Error setting spawn channel:', error);
                    await interaction.editReply({
                        content: `Error setting spawn channel: ${error.message}`,
                        ephemeral: true
                    });
                }
                break;

            case 'spawn':
                const spawnLocation = interaction.options.getString('location');
                const targetServer = interaction.options.getString('server');
                
                // Initialize spawnLocations if it doesn't exist
                if (!config.spawnLocations) {
                    config.spawnLocations = {};
                }
                
                // Store the spawn location in config
                config.spawnLocations[targetServer] = spawnLocation;
                
                try {
                    await updateConfig(config);
                    await interaction.reply({
                        content: `Spawn location set to ${spawnLocation} for server ${targetServer}`,
                        ephemeral: true
                    });
                } catch (error) {
                    console.error('Error saving spawn location:', error);
                    await interaction.reply({
                        content: `Error saving spawn location: ${error.message}`,
                        ephemeral: true
                    });
                }
                break;

            case 'addserver':
                if (!interaction.member.permissions.has('ADMINISTRATOR')) {
                    await interaction.reply({
                        content: 'You need administrator permissions to use this command.',
                        ephemeral: true
                    });
                    return;
                }

                const serverName = interaction.options.getString('name');
                const host = interaction.options.getString('host');
                const port = interaction.options.getInteger('port');
                const password = interaction.options.getString('password');

                if (config.servers[serverName]) {
                    await interaction.reply({
                        content: 'A server with that name already exists.',
                        ephemeral: true
                    });
                    return;
                }

                config.servers[serverName] = {
                    host,
                    port,
                    password
                };

                try {
                    await updateConfig(config);
                    await bot.connect(serverName);

                    await interaction.reply({
                        content: `Successfully added server: ${serverName}`,
                        ephemeral: true
                    });
                } catch (error) {
                    delete config.servers[serverName];
                    await updateConfig(config);
                    await interaction.reply({
                        content: `Error adding server: ${error.message}`,
                        ephemeral: true
                    });
                }
                break;

            case 'removeserver':
                if (!interaction.member.permissions.has('ADMINISTRATOR')) {
                    await interaction.reply({
                        content: 'You need administrator permissions to use this command.',
                        ephemeral: true
                    });
                    return;
                }

                const serverToRemove = interaction.options.getString('name');

                if (!config.servers[serverToRemove]) {
                    await interaction.reply({
                        content: 'Server not found in configuration.',
                        ephemeral: true
                    });
                    return;
                }

                try {
                    if (bot.rconConnections.has(serverToRemove)) {
                        bot.rconConnections.get(serverToRemove).disconnect();
                        bot.rconConnections.delete(serverToRemove);
                    }

                    delete config.servers[serverToRemove];
                    await updateConfig(config);

                    await interaction.reply({
                        content: `Successfully removed server: ${serverToRemove}`,
                        ephemeral: true
                    });
                } catch (error) {
                    await interaction.reply({
                        content: `Error removing server: ${error.message}`,
                        ephemeral: true
                    });
                }
                break;

            case 'listservers':
                if (!interaction.member.permissions.has('ADMINISTRATOR')) {
                    await interaction.reply({
                        content: 'You need administrator permissions to use this command.',
                        ephemeral: true
                    });
                    return;
                }

                const serverList = Object.entries(config.servers)
                    .map(([name, data]) => `${name}\n  Host: ${data.host}\n  Port: ${data.port}`)
                    .join('\n\n');

                await interaction.reply({
                    content: serverList || 'No servers configured',
                    ephemeral: true
                });
                break;
        }
    } catch (error) {
        console.error('Command execution error:', error);
        if (interaction.deferred) {
            await interaction.editReply({ content: `Error: ${error.message}` });
        } else {
            await interaction.reply({ content: `Error: ${error.message}`, ephemeral: true });
        }
    }
});

setInterval(async () => {
    for (const [server] of bot.rconConnections) {
        try {
            await bot.executeCommand(server, 'listplayers');
        } catch (error) {
            console.log(`Connection check failed for ${server}`);
        }
    }
}, 30000);

bot.client.login(process.env.BOT_TOKEN);