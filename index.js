const path = require('path');
const fs = require('fs');

const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

/**
 * Entry point for Discord AI Bot
 * This file imports and runs the main bot file
 */

// Import and run the main bot
require('./bot.js');

// Optional: Add any initialization logic here if needed
console.log('🚀 Starting Iris Discord AI Bot...');

// Export for potential future use
module.exports = {};