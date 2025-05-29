/**
 * Configuration loader for environment variables
 */
require('dotenv').config();

/**
 * Validate required environment variables
 */
function validateConfig() {
  const required = ['DISCORD_BOT_TOKEN', 'DISCORD_CLIENT_ID'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('Please check your .env file and ensure all required variables are set.');
    process.exit(1);
  }
}

// Validate configuration on load
validateConfig();

const config = {
  // Discord Configuration
  discord: {
    token: process.env.DISCORD_BOT_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    developerGuildId: process.env.DEVELOPER_GUILD_ID || '1323099098697568326'
  },

  // Bot Settings
  bot: {
    name: process.env.BOT_NAME || 'Iris',
    version: process.env.BOT_VERSION || '1.0.0',
    studio: process.env.BOT_STUDIO || 'Iris Studio',
    maxConversationHistory: parseInt(process.env.MAX_CONVERSATION_HISTORY) || 10
  },

  // AI Configuration
  ai: {
    defaultProvider: process.env.DEFAULT_AI_PROVIDER || 'gemini',
    defaultApiKeys: {
      gemini: process.env.DEFAULT_GEMINI_API_KEY || '',
      openai: process.env.DEFAULT_OPENAI_API_KEY || '',
      groq: process.env.DEFAULT_GROQ_API_KEY || ''
    },
    defaultModels: {
      gemini: process.env.DEFAULT_MODELS_GEMINI || 'gemini-2.5-flash-preview-05-20',
      openai: process.env.DEFAULT_MODELS_OPENAI || 'gpt-4o-mini',
      groq: process.env.DEFAULT_MODELS_GROQ || 'llama-3.3-70b-versatile'
    }
  },

  // Database Configuration
  database: {
    path: process.env.DATABASE_PATH || './AI/database/chatHistory.db'
  },

  // Features Toggle
  features: {
    urlContext: process.env.ENABLE_URL_CONTEXT !== 'false',
    functionCalling: process.env.ENABLE_FUNCTION_CALLING !== 'false',
    imageProcessing: process.env.ENABLE_IMAGE_PROCESSING !== 'false',
    videoProcessing: process.env.ENABLE_VIDEO_PROCESSING !== 'false'
  },

  // Bot Presence
  presence: {
    status: process.env.BOT_STATUS || 'online',
    activityType: process.env.BOT_ACTIVITY_TYPE || 'WATCHING',
    activityText: process.env.BOT_ACTIVITY_TEXT || 'for /help commands'
  },

  // Development Settings
  development: {
    debugMode: process.env.DEBUG_MODE === 'true'
  }
};

module.exports = config;