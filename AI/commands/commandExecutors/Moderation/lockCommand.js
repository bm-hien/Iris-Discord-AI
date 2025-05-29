const { PermissionsBitField } = require('discord.js');

async function executeLock(message, command) {
  const { channel_id } = command;
  let targetChannel = message.channel; // Default to current channel
  
  // If channel_id is provided, try to find that channel
  if (channel_id) {
    try {
      targetChannel = await message.guild.channels.fetch(channel_id);
      if (!targetChannel) {
        return `Channel not found with ID: ${channel_id}`;
      }
      
      // Check if it's a text channel that can be locked
      if (!targetChannel.isTextBased()) {
        return `Channel **${targetChannel.name}** is not a text channel and cannot be locked.`;
      }
    } catch (error) {
      console.error('Error fetching target channel:', error);
      return `Cannot find channel with ID: ${channel_id}`;
    }
  }
  
  if (!targetChannel.guild) {
    return 'Cannot lock DM channels.';
  }
  
  try {
    // Get @everyone role
    const everyoneRole = targetChannel.guild.roles.everyone;
    
    // Remove SEND_MESSAGES permission for @everyone
    await targetChannel.permissionOverwrites.edit(everyoneRole, {
      SendMessages: false
    });
    
    // Log the action
    console.log(`Channel #${targetChannel.name} (${targetChannel.id}) locked by ${message.author.username}.`);
    
    // Different messages for current vs specific channel
    if (channel_id && targetChannel.id !== message.channel.id) {
      return `🔒 Successfully locked channel **#${targetChannel.name}** (ID: ${targetChannel.id}). Only users with manage permissions can send messages.`;
    } else {
      return `🔒 Successfully locked channel **#${targetChannel.name}**. Only users with manage permissions can send messages.`;
    }
  } catch (error) {
    console.error('Error locking channel:', error);
    return 'Cannot lock channel. Please check bot permissions.';
  }
}

module.exports = executeLock;