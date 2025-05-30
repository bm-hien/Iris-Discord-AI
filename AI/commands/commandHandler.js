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
    return { success: false, message: 'Target member not found.' };
  }
  
  if (target.id === executor.id) {
    return { success: false, message: 'You cannot perform this command on yourself.' };
  }
  
  // If target is the server owner
  if (target.id === executor.guild.ownerId) {
    return { success: false, message: 'Cannot perform this command on the server owner.' };
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
  
  
  // Check if user has permission to execute the specific command
  if (!hasPermission) {
    return {
      embed: new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Permission Error')
        .setDescription(`You don't have permission to execute the **${command.function}** command.`)
        .addFields(
          { name: 'Required Permission', value: getRequiredPermissionName(command.function), inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'bmhien AI Moderation' }),
      text: `You don't have permission to execute the ${command.function} command.`
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
              .setTitle('❌ Role Hierarchy Error')
              .setDescription(hierarchyCheck.message)
              .addFields(
                { name: 'Target User', value: targetMember.user.username, inline: true },
                { name: 'Your Highest Role', value: member.roles.highest.name, inline: true },
                { name: 'Target\'s Highest Role', value: targetMember.roles.highest.name, inline: true }
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
        embedTitle = '🔇 Member Muted';
        embedColor = 0xFFAA00; // Orange
        break;
      case 'kick':
        result = await executeKick(message, command);
        embedTitle = '👢 Member Kicked';
        embedColor = 0xFF5555; // Red
        break;
      case 'ban':
        result = await executeBan(message, command);
        embedTitle = '🔨 Member Banned';
        embedColor = 0xDD0000; // Dark Red
        break;
      case 'unmute':
        result = await executeUnmute(message, command);
        embedTitle = '🔊 Member Unmuted';
        embedColor = 0x55FF55; // Green
        break;
      case 'clear':
        result = await executeClear(message, command);
        embedTitle = '🧹 Messages Cleared';
        embedColor = 0x5555FF; // Blue
        break;
      case 'lock':
        result = await executeLock(message, command);
        embedTitle = '🔒 Channel Locked';
        embedColor = 0xFF6600; // Orange
        break;
      case 'unlock':
        result = await executeUnlock(message, command);
        embedTitle = '🔓 Channel Unlocked';
        embedColor = 0x00FF66; // Green
        break;
      default:
        return 'Invalid command.';
    }
    
    // Create embed for command execution
    const commandEmbed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(embedTitle)
      .setDescription(result)
      .addFields(
        { name: 'Executed By', value: `<@${message.author.id}>`, inline: true },
        { name: 'Function', value: command.function, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: 'bmhien AI Moderation' });
    
    // Add target field if present
    if (command.target) {
      commandEmbed.addFields({ name: 'Target', value: String(command.target), inline: true });
    }
    
    // Add reason field if present
    if (command.reason) {
      commandEmbed.addFields({ name: 'Reason', value: command.reason, inline: false });
    }
    
    // Add duration field if present
    if (command.duration) {
      commandEmbed.addFields({ name: 'Duration', value: command.duration, inline: true });
    }
    
    // Add amount field if present (for clear command)
    if (command.amount) {
      commandEmbed.addFields({ name: 'Amount', value: String(command.amount), inline: true });
    }
    
    return { embed: commandEmbed, text: result };
  } catch (error) {
    console.error('Error executing command:', error);
    return 'An error occurred while executing the command.';
  }
}

// Helper function to get the human-readable permission name
function getRequiredPermissionName(commandFunction) {
  switch (commandFunction) {
    case 'mute':
    case 'unmute':
      return 'Moderate Members';
    case 'kick':
      return 'Kick Members';
    case 'ban':
      return 'Ban Members';
    case 'clear':
      return 'Manage Messages';
    case 'lock':
    case 'unlock':
      return 'Manage Channels';
    default:
      return 'Undefined';
  }
}

module.exports = {
  extractCommand,
  handleCommand
};