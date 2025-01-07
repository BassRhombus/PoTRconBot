const { SlashCommandBuilder } = require('@discordjs/builders');

class CommandHandler {
  constructor(bot) {
    this.bot = bot;
    this.commands = new Map();
    this.registerCommands();
  }

  registerCommands() {
    // Register default commands
    this.registerCommand({
      name: 'rcon',
      description: 'Execute RCON command',
      options: [
        {
          name: 'server',
          description: 'Target server',
          type: 'STRING',
          required: true
        },
        {
          name: 'command',
          description: 'Command to execute',
          type: 'STRING',
          required: true
        }
      ],
      execute: async (interaction) => {
        const server = interaction.options.getString('server');
        const command = interaction.options.getString('command');
        
        try {
          const result = await this.bot.executeCommand(server, command);
          await interaction.reply({ content: result, ephemeral: true });
        } catch (error) {
          await interaction.reply({ 
            content: `Error: ${error.message}`, 
            ephemeral: true 
          });
        }
      }
    });
  }

  registerCommand(config) {
    this.commands.set(config.name, config);
  }
}

// Use module.exports directly
module.exports = CommandHandler;