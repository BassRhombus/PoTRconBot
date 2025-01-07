class WebhookHandler {
    constructor(bot) {
        this.bot = bot;
        this.customCommands = new Map();
    }

    // Add a custom command
    addCustomCommand(trigger, response) {
        this.customCommands.set(trigger.toLowerCase(), response);
    }

    // Remove a custom command
    removeCustomCommand(trigger) {
        return this.customCommands.delete(trigger.toLowerCase());
    }

    // Handle chat message
    async handleChatMessage(message) {
        // Expected format: "PlayerName: $command"
        const match = message.content.match(/^([^:]+): \$(\w+)/);
        if (!match) return;

        const [, playerName, command] = match;
        const commandConfig = this.customCommands.get(command.toLowerCase());
        
        if (commandConfig) {
            try {
                const formattedCommand = commandConfig.replace('{player}', playerName);
                await this.bot.executeCommand(commandConfig.server, formattedCommand);
                console.log(`Executed custom command for ${playerName}: ${formattedCommand}`);
            } catch (error) {
                console.error(`Error executing custom command: ${error}`);
            }
        }
    }
}

module.exports = WebhookHandler;
