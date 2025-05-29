/**
 * Handle bot ready event
 */
const { Events } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute: async (client) => {
    console.log(`Ready event handler: Logged in as ${client.user.tag}`);
    // Slash command registration has been moved to index.js
  }
};