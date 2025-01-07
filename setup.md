=== Setup Instructions ===

1. Create a file named 'config.js' (not .json) in the root directory with this code:

const config = {
    chatChannelId: '', // Channel ID for game chat monitoring
    servers: {}
};

module.exports = { config };

2. Create a file named '.env' in the root directory with this code:

BOT_TOKEN=your_bot_token_here
GUILD_ID=your_guild_id_here

3. Install required packages by running:

npm install discord.js dotenv rcon-client

4. Start the bot:

npm start

=== Notes ===
- Don't include any // comments in the actual config.js file
- Replace 'your_bot_token_here' with your actual Discord bot token
- Replace 'your_guild_id_here' with your Discord server ID
- Servers can be added using the /addserver command once the bot is running


This format:
1. Separates the templates into proper files
2. Provides clear instructions
3. Avoids confusion with comments
4. Lists the exact packages needed
5. Includes next steps after setup

Would you like me to provide any additional template files or clarify any part of the setup process?