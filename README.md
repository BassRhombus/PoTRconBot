# Path of Titans Discord RCON Bot

A Discord bot for managing Path of Titans servers via RCON commands.

## Features
- Monitor in-game chat through Discord
- Execute RCON commands via Discord
- Custom command system with placeholders
- Multi-server support
- Automated server health checks
- Automatic spawn teleport system
- (as of right now, only works with Discord webhooks)

## Prerequisites
- Node.js 16.x or higher
- npm
- A Discord bot token
- RCON access to your Path of Titans servers

## Installation
1. Clone the repository
```bash
git clone https://github.com/BassRhombus/pot-discord-bot.git
cd pot-discord-bot

## Spawn System

The bot includes an automatic spawn teleport system that can move players to designated locations when they join the server.

### Commands

- `/setspawnchannel` - Set which channel the bot should monitor for player joins
  - Requires administrator permissions
  - Channel must be a text channel

- `/spawn` - Set the coordinates where players should be teleported
  - `location` - The coordinates in format "x,y,z"
  - `server` - Which server this spawn point applies to
  - Example: `/spawn location: -123456,789012,3456 server: Prehistoric Party`

### How It Works

1. Bot monitors the designated spawn channel for player join messages
2. When a player joins, the bot extracts their PlayerAlderonId
3. Bot automatically teleports the player to the designated coordinates for that server
4. Console logs provide detailed information about each teleport operation

### Configuration

Spawn locations are stored in the config.js file under:
```javascript
{
  spawnChannelId: "channel-id-here",
  spawnLocations: {
    "Server Name": "x,y,z"
  }
}
```

All spawn locations persist through bot restarts.

cd pot-discord-bot
```javascript
{
  spawnChannelId: "channel-id-here",
  spawnLocations: {
    "Server Name": "x,y,z"
  }
}
