const { PermissionsBitField } = require('discord.js');

async function executeLock(message, command) {
  const { channel_id } = command;
  let targetChannel = message.channel; // Default to current channel
  
  // If channel_id is provided, try to find that channel
  if (channel_id) {
    try {
      targetChannel = await message.guild.channels.fetch(channel_id);
      if (!targetChannel) {
        return `Không tìm thấy channel với ID: ${channel_id}`;
      }
      
      // Check if it's a text channel that can be locked
      if (!targetChannel.isTextBased()) {
        return `Channel **${targetChannel.name}** không phải là text channel và không thể khóa.`;
      }
    } catch (error) {
      console.error('Error fetching target channel:', error);
      return `Không thể tìm thấy channel với ID: ${channel_id}`;
    }
  }
  
  if (!targetChannel.guild) {
    return 'Không thể khóa channel DM.';
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
      return `🔒 Đã khóa kênh **#${targetChannel.name}** (ID: ${targetChannel.id}). Chỉ có người có quyền quản lý mới có thể gửi tin nhắn.`;
    } else {
      return `🔒 Đã khóa kênh **#${targetChannel.name}**. Chỉ có người có quyền quản lý mới có thể gửi tin nhắn.`;
    }
  } catch (error) {
    console.error('Error locking channel:', error);
    return 'Không thể khóa channel. Vui lòng kiểm tra quyền của bot.';
  }
}

module.exports = executeLock;