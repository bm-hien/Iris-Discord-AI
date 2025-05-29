const { PermissionsBitField } = require('discord.js');

async function executeUnlock(message, command) {
  const { channel_id } = command;
  let targetChannel = message.channel; // Default to current channel
  
  // If channel_id is provided, try to find that channel
  if (channel_id) {
    try {
      targetChannel = await message.guild.channels.fetch(channel_id);
      if (!targetChannel) {
        return `Không tìm thấy channel với ID: ${channel_id}`;
      }
      
      // Check if it's a text channel that can be unlocked
      if (!targetChannel.isTextBased()) {
        return `Channel **${targetChannel.name}** không phải là text channel và không thể mở khóa.`;
      }
    } catch (error) {
      console.error('Error fetching target channel:', error);
      return `Không thể tìm thấy channel với ID: ${channel_id}`;
    }
  }
  
  if (!targetChannel.guild) {
    return 'Không thể mở khóa channel DM.';
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
      return `🔓 Đã mở khóa kênh **#${targetChannel.name}** (ID: ${targetChannel.id}). Thành viên có thể gửi tin nhắn trở lại.`;
    } else {
      return `🔓 Đã mở khóa kênh **#${targetChannel.name}**. Thành viên có thể gửi tin nhắn trở lại.`;
    }
  } catch (error) {
    console.error('Error unlocking channel:', error);
    return 'Không thể mở khóa channel. Vui lòng kiểm tra quyền của bot.';
  }
}

module.exports = executeUnlock;