/**
 * Main command handling functionality
 */
const { extractCommand } = require('./commandExtractor');
const { validateCommand } = require('./commandsValidator');
const { EmbedBuilder, PermissionsBitField } = require('discord.js');

// Command executors
const executeMute = require('./commandExecutors/Moderation/muteCommand');
const executeKick = require('./commandExecutors/Moderation/kickCommand');
const executeBan = require('./commandExecutors/Moderation/banCommand');
const executeUnmute = require('./commandExecutors/Moderation/unmuteCommand');
const executeClear = require('./commandExecutors/Utils/clearCommand');
const executeLock = require('./commandExecutors/Moderation/lockCommand');
const executeUnlock = require('./commandExecutors/Moderation/unlockCommand');

// Helper function to check if a user has the required permissions for a command
function hasPermission(member, command) {
  if (!member) return false;

  // Check specific permissions based on command function
  switch (command.function) {
    case 'lock':
    case 'unlock':
      return member.permissions.has(PermissionsBitField.Flags.ManageChannels);
    case 'mute':
    case 'unmute':
      return member.permissions.has(PermissionsBitField.Flags.ModerateMembers);
    
    case 'kick':
      return member.permissions.has(PermissionsBitField.Flags.KickMembers);
    
    case 'ban':
      return member.permissions.has(PermissionsBitField.Flags.BanMembers);
    
    case 'clear':
      return member.permissions.has(PermissionsBitField.Flags.ManageMessages);
    
    default:
      return false;
  }
}

/**
 * Check if the command executor has higher role than the target
 * @param {Object} executor - The member executing the command
 * @param {Object} target - The target member
 * @returns {Object} - Result object with success flag and message
 */
function checkRoleHierarchy(executor, target) {
  // If target doesn't exist or is the same as executor
  if (!target) {
    return { success: false, message: 'Không tìm thấy thành viên mục tiêu.' };
  }
  
  if (target.id === executor.id) {
    return { success: false, message: 'Bạn không thể thực hiện lệnh này với chính mình.' };
  }
  
  // If target is the server owner
  if (target.id === executor.guild.ownerId) {
    return { success: false, message: 'Không thể thực hiện lệnh này với chủ sở hữu server.' };
  }
  
  // If executor is the server owner, they can do anything
  if (executor.id === executor.guild.ownerId) {
    return { success: true };
  }
  
  // Compare roles
  const executorHighestRole = executor.roles.highest;
  const targetHighestRole = target.roles.highest;
  
  if (executorHighestRole.position <= targetHighestRole.position) {
    return { 
      success: false, 
      message: `Bạn không thể thực hiện lệnh này với ${target.user.username} vì họ có vai trò cao hơn hoặc ngang hàng với bạn.` 
    };
  }
  
  return { success: true };
}

// Main function to handle commands
async function handleCommand(message, command) {
  if (!validateCommand(command)) {
    console.log('Invalid command format:', command);
    return null;
  }
  
  const member = message.member;
  
  // Debug log to see what permissions the member actually has
  console.log(`Checking permissions for ${member.user.username}:`, {
    ModerateMembers: member.permissions.has(PermissionsBitField.Flags.ModerateMembers),
    KickMembers: member.permissions.has(PermissionsBitField.Flags.KickMembers),
    BanMembers: member.permissions.has(PermissionsBitField.Flags.BanMembers),
    ManageMessages: member.permissions.has(PermissionsBitField.Flags.ManageMessages),
    ManageChannels: member.permissions.has(PermissionsBitField.Flags.ManageChannels),
    Administrator: member.permissions.has(PermissionsBitField.Flags.Administrator)
  });
  
  // Check if user has permission to execute the specific command
  if (!hasPermission(member, command)) {
    return {
      embed: new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Lỗi Quyền Hạn')
        .setDescription(`Bạn không có quyền thực hiện lệnh **${command.function}**.`)
        .addFields(
          { name: 'Quyền hạn cần thiết', value: getRequiredPermissionName(command.function), inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'bmhien AI Moderation' }),
      text: `Bạn không có quyền thực hiện lệnh ${command.function}.`
    };
  }
  
  // Skip role hierarchy check for clear command
  if (!['clear', 'lock', 'unlock'].includes(command.function)) {
    try {
      // First find the target member for role hierarchy check
      const guild = message.guild;
      const targetId = command.target.replace(/[<@!&>]/g, '');
      let targetMember;
      
      try {
        targetMember = await guild.members.fetch(targetId).catch(() => null);
        
        // If target not found by ID, try by username
        if (!targetMember && command.target) {
          const members = await guild.members.fetch();
          targetMember = members.find(m => 
            m.user.username.toLowerCase() === command.target.toLowerCase() ||
            (m.nickname && m.nickname.toLowerCase() === command.target.toLowerCase())
          );
        }
      } catch (error) {
        console.error('Error fetching target member:', error);
      }
      
      // Check role hierarchy if target was found
      if (targetMember) {
        const hierarchyCheck = checkRoleHierarchy(member, targetMember);
        if (!hierarchyCheck.success) {
          return {
            embed: new EmbedBuilder()
              .setColor(0xFF0000)
              .setTitle('❌ Lỗi Phân Cấp Vai Trò')
              .setDescription(hierarchyCheck.message)
              .addFields(
                { name: 'Người dùng mục tiêu', value: targetMember.user.username, inline: true },
                { name: 'Vai trò cao nhất của bạn', value: member.roles.highest.name, inline: true },
                { name: 'Vai trò cao nhất của mục tiêu', value: targetMember.roles.highest.name, inline: true }
              )
              .setTimestamp()
              .setFooter({ text: 'bmhien AI Moderation' }),
            text: hierarchyCheck.message
          };
        }
      }
    } catch (error) {
      console.error('Error checking role hierarchy:', error);
    }
  }
  
  // Execute the command
  try {
    let result;
    let embedTitle;
    let embedColor;
    
    switch (command.function) {
      case 'mute':
        result = await executeMute(message, command);
        embedTitle = '🔇 Hạn Chế Chat';
        embedColor = 0xFFAA00; // Orange
        break;
      case 'kick':
        result = await executeKick(message, command);
        embedTitle = '👢 Đã Kick';
        embedColor = 0xFF5555; // Red
        break;
      case 'ban':
        result = await executeBan(message, command);
        embedTitle = '🔨 Đã Ban';
        embedColor = 0xDD0000; // Dark Red
        break;
      case 'unmute':
        result = await executeUnmute(message, command);
        embedTitle = '🔊 Đã Bỏ Hạn Chế Chat';
        embedColor = 0x55FF55; // Green
        break;
      case 'clear':
        result = await executeClear(message, command);
        embedTitle = '🧹 Xóa Tin Nhắn';
        embedColor = 0x5555FF; // Blue
        break;
      case 'lock':
        result = await executeLock(message, command);
        embedTitle = '🔒 Khóa Channel';
        embedColor = 0xFF6600; // Orange
        break;
      case 'unlock':
        result = await executeUnlock(message, command);
        embedTitle = '🔓 Mở Khóa Channel';
        embedColor = 0x00FF66; // Green
        break;
      default:
        return 'Lệnh không hợp lệ.';
    }
    
    // Create embed for command execution
    const commandEmbed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(embedTitle)
      .setDescription(result)
      .addFields(
        { name: 'Thực hiện bởi', value: `<@${message.author.id}>`, inline: true },
        { name: 'Chức năng', value: command.function, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: 'bmhien AI Moderation' });
    
    // Add target field if present
    if (command.target) {
      commandEmbed.addFields({ name: 'Đối tượng', value: command.target, inline: true });
    }
    
    // Add reason field if present
    if (command.reason) {
      commandEmbed.addFields({ name: 'Lý do', value: command.reason, inline: false });
    }
    
    // Add duration field if present
    if (command.duration) {
      commandEmbed.addFields({ name: 'Thời gian', value: command.duration, inline: true });
    }
    
    return { embed: commandEmbed, text: result };
  } catch (error) {
    console.error('Error executing command:', error);
    return 'Đã xảy ra lỗi khi thực hiện lệnh.';
  }
}

// Helper function to get the human-readable permission name
function getRequiredPermissionName(commandFunction) {
  switch (commandFunction) {
    case 'mute':
    case 'unmute':
      return 'Quản lý thành viên (Moderate Members)';
    case 'kick':
      return 'Kick thành viên (Kick Members)';
    case 'ban':
      return 'Ban thành viên (Ban Members)';
    case 'clear':
      return 'Quản lý tin nhắn (Manage Messages)';
    case 'lock':
    case 'unlock':
      return 'Quản lý kênh (Manage Channels)';
    default:
      return 'Không xác định';
  }
}

module.exports = {
  extractCommand,
  handleCommand
};