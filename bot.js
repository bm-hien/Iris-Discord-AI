/**
 * Main file for Discord AI Bot
 * Uses modular architecture for events and environment configuration
 */
const { Client, GatewayIntentBits, Collection, REST, Routes, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config/config');

// Initialize new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
  ]
});

// Use token from config
const token = config.discord.token;

// Setup command handling
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');

// Create array to store command data for registration
const commands = [];

// Load all commands from directory recursively
function loadCommandsFromDirectory(dirPath) {
  const items = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const item of items) {
    const itemPath = path.join(dirPath, item.name);
    
    if (item.isDirectory()) {
      // If it's a directory, recursively load commands from subdirectory
      loadCommandsFromDirectory(itemPath);
    } else if (item.isFile() && item.name.endsWith('.js')) {
      // If it's a .js file, load command
      try {
        const command = require(itemPath);
        
        // Check if command has required properties
        if ('data' in command && 'execute' in command) {
          client.commands.set(command.data.name, command);
          commands.push(command.data.toJSON());
          console.log(`✅ Loaded command: ${command.data.name} from ${path.relative(__dirname, itemPath)}`);
        } else {
          console.log(`⚠️  [WARNING] The command at ${path.relative(__dirname, itemPath)} is missing a required "data" or "execute" property.`);
        }
      } catch (error) {
        console.error(`❌ Error loading command from ${path.relative(__dirname, itemPath)}:`, error.message);
      }
    }
  }
}

loadCommandsFromDirectory(commandsPath);

// Function to register slash commands
async function registerCommands(clientId) {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);
    
    // Create and configure REST instance
    const rest = new REST({ version: '10' }).setToken(token);
    
    // Separate commands into global and developer-only
    const globalCommands = commands.filter(cmd => cmd.name !== 'dev');
    const devCommands = commands.filter(cmd => cmd.name === 'dev');
    
    // Register global commands
    if (globalCommands.length > 0) {
      const globalData = await rest.put(
        Routes.applicationCommands(clientId),
        { body: globalCommands },
      );
      console.log(`Successfully reloaded ${globalData.length} global application (/) commands.`);
    }
    
    // Register developer command only for specific guild server
    if (devCommands.length > 0) {
      const targetGuildId = config.discord.developerGuildId;
      
      try {
        const devData = await rest.put(
          Routes.applicationGuildCommands(clientId, targetGuildId),
          { body: devCommands },
        );
        console.log(`Successfully reloaded ${devData.length} developer command(s) for guild: ${targetGuildId}`);
      } catch (guildError) {
        console.error(`Failed to register dev commands for guild ${targetGuildId}:`, guildError.message);
        
        // Fallback: Register globally if can't register for specific guild
        console.log('Falling back to global registration for dev commands...');
        const devData = await rest.put(
          Routes.applicationCommands(clientId),
          { body: [...globalCommands, ...devCommands] },
        );
        console.log(`Successfully reloaded ${devData.length} total commands globally (including dev)`);
      }
    }
    
    return { global: globalCommands.length, dev: devCommands.length };
  } catch (error) {
    console.error('Error registering commands:', error);
    throw error;
  }
}

// Load all event handlers
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath)
  .filter(file => file.endsWith('.js') && !file.includes('utils'));

// Register event handlers
for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
  
  console.log(`Loaded event handler: ${event.name}`);
}

// Handle when client is ready - register slash commands and set presence
client.once('ready', async () => {
  console.log(`🤖 ${config.bot.name} v${config.bot.version} is ready!`);
  console.log(`📊 Logged in as ${client.user.tag}`);
  console.log(`🏢 Created by ${config.bot.studio}`);
  
  // Set bot presence from config
  try {
    const activityType = ActivityType[config.presence.activityType] || ActivityType.Watching;
    
    await client.user.setPresence({
      status: config.presence.status,
      activities: [{
        name: config.presence.activityText,
        type: activityType
      }]
    });
    
    console.log(`✅ Bot presence set: ${config.presence.activityType} ${config.presence.activityText}`);
  } catch (error) {
    console.error('❌ Error setting bot presence:', error);
  }
  
  // Register slash commands after bot is ready
  await registerCommands(client.user.id);
  
  console.log('🚀 Bot is fully operational!');
});

// Login to Discord with bot token
client.login(token).catch(error => {
  console.error('❌ Failed to login:', error);
  console.error('Please check your DISCORD_BOT_TOKEN in the .env file');
  process.exit(1);
});

// Handle uncaught promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
  // Don't exit the process, just log the error
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  // Log the error but try to keep the bot running
  // Only exit if it's a critical error
  if (error.code === 'ECONNRESET' || error.message.includes('Connection')) {
    console.log('Network error detected, attempting to continue...');
  } else {
    console.error('Critical error, bot may need restart');
    process.exit(1);
  }
});

// Enhanced client error handling
client.on('error', (error) => {
  console.error('Discord client error:', error);
  // Don't exit, let Discord.js handle reconnection
});

client.on('warn', (warning) => {
  console.warn('Discord client warning:', warning);
});

// Graceful shutdown with better cleanup
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  
  if (client) {
    client.destroy();
  }
  
  // Close database connections
  try {
    const database = require('./AI/events/database');
    // Database will be closed by its own process handler
  } catch (error) {
    console.error('Error closing database:', error);
  }
  
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  
  if (client) {
    client.destroy();
  }
  
  process.exit(0);
});