const { PermissionsBitField } = require('discord.js');

async function executeUnlock(message, command) {
  const { channel_id } = command;
  let targetChannel = message.channel; // Default to current channel
  
  // If channel_id is provided, try to find that channel
  if (channel_id) {
    try {
      targetChannel = await message.guild.channels.fetch(channel_id);
      if (!targetChannel) {
        return `Channel not found with ID: ${channel_id}`;
      }
      
      // Check if it's a text channel that can be unlocked
      if (!targetChannel.isTextBased()) {
        return `Channel **${targetChannel.name}** is not a text channel and cannot be unlocked.`;
      }
    } catch (error) {
      console.error('Error fetching target channel:', error);
      return `Cannot find channel with ID: ${channel_id}`;
    }
  }
  
  if (!targetChannel.guild) {
    return 'Cannot unlock DM channels.';
  }
  
  try {
    // Get @everyone role
    const everyoneRole = targetChannel.guild.roles.everyone;
    
    // Restore SEND_MESSAGES permission for @everyone (set to null to use default)
    await targetChannel.permissionOverwrites.edit(everyoneRole, {
      SendMessages: null
    });
    
    // Log the action
    console.log(`Channel #${targetChannel.name} (${targetChannel.id}) unlocked by ${message.author.username}.`);
    
    // Different messages for current vs specific channel
    if (channel_id && targetChannel.id !== message.channel.id) {
      return `🔓 Successfully unlocked channel **#${targetChannel.name}** (ID: ${targetChannel.id}). Members can send messages again.`;
    } else {
      return `🔓 Successfully unlocked channel **#${targetChannel.name}**. Members can send messages again.`;
    }
  } catch (error) {
    console.error('Error unlocking channel:', error);
    return 'Cannot unlock channel. Please check bot permissions.';
  }
}

module.exports = executeUnlock;