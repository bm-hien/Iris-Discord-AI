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
const { executeAddRole, executeRemoveRole } = require('./commandExecutors/Moderation/roleCommand');
const { executeChangeNickname } = require('./commandExecutors/Moderation/nicknameCommand');


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
    
    case 'add_role':
    case 'remove_role':
      return member.permissions.has(PermissionsBitField.Flags.ManageRoles);
    case 'change_nickname':
      // For nickname changes, check if it's self or others
      return member.permissions.has(PermissionsBitField.Flags.ChangeNickname) || 
             member.permissions.has(PermissionsBitField.Flags.ManageNicknames);
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
function checkRoleHierarchy(executor, target, commandFunction = '') {
  // If target doesn't exist
  if (!target) {
    return { success: false, message: 'Target member not found.' };
  }
  
  // Allow self-role assignment for add_role only
  if (target.id === executor.id && commandFunction === 'add_role') {
    return { success: true, allowSelfRole: true };
  }
  
  // Prevent other self-actions
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
      message: `Cannot perform action on this user. They have an equal or higher role than you.` 
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
  if (!hasPermission(member, command)) {
    return {
      embed: new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Permission Error')
        .setDescription(`You don't have permission to execute the **${command.function}** command.`)
        .addFields(
          { name: 'Required Permission', value: getRequiredPermissionName(command.function), inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Iris AI Moderation' }),
      text: `You don't have permission to execute the ${command.function} command.`
    };
  }
  
  // Handle role hierarchy check for both traditional and role commands
  if (!['clear', 'lock', 'unlock'].includes(command.function)) {
    try {
      let targetId;
      
      // Get target ID based on command type
      if (['add_role', 'remove_role'].includes(command.function)) {
        targetId = command.parameters.userId;
      } else {
        targetId = command.target;
      }
      
      // Only proceed if we have a targetId
      if (targetId) {
        // First find the target member for role hierarchy check
        const guild = message.guild;
        const cleanTargetId = targetId.replace(/[<@!&>]/g, '');
        let targetMember;
        
        try {
          targetMember = await guild.members.fetch(cleanTargetId).catch(() => null);
          
          // If target not found by ID, try by username (only for traditional commands)
          if (!targetMember && command.target && !['add_role', 'remove_role'].includes(command.function)) {
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
          // FIX: Pass command function to hierarchy check
          const hierarchyCheck = checkRoleHierarchy(member, targetMember, command.function);
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
                .setFooter({ text: 'Iris AI Moderation' }),
              text: hierarchyCheck.message
            };
          }
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
        embedColor = 0xFF6600; // Orange
        break;
      case 'unmute':
        result = await executeUnmute(message, command);
        embedTitle = '🔊 Member Unmuted';
        embedColor = 0x00FF66; // Green
        break;
      case 'kick':
        result = await executeKick(message, command);
        embedTitle = '👢 Member Kicked';
        embedColor = 0xFF9900; // Orange
        break;
      case 'ban':
        result = await executeBan(message, command);
        embedTitle = '🔨 Member Banned';
        embedColor = 0xFF0000; // Red
        break;
      case 'clear':
        result = await executeClear(message, command);
        embedTitle = '🧹 Messages Cleared';
        embedColor = 0x00CCFF; // Light Blue
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
      case 'add_role':
        result = await executeAddRole(message, command);
        embedTitle = '🎭 Role Added';
        embedColor = 0x00FF00;
        break;
      case 'remove_role':
        result = await executeRemoveRole(message, command);
        embedTitle = '🎭 Role Removed';
        embedColor = 0xFF6B6B;
        break;
      case 'change_nickname':
        result = await executeChangeNickname(message, command);
        embedTitle = '📝 Nickname Changed';
        embedColor = 0x00FF9F;
        break;
      default:
        result = { success: false, message: `Unknown command: ${command.function}` };
        break;
    }
    
    // Handle different result formats
    if (result && typeof result === 'object' && result.embed) {
      // Command executor returned an embed
      return result;
    } else if (result && typeof result === 'object' && result.success !== undefined) {
      // Command executor returned a result object
      if (result.embed) {
        return result;
      } else {
        // Create embed from result
        const commandEmbed = new EmbedBuilder()
          .setColor(result.success ? embedColor : 0xFF0000)
          .setTitle(result.success ? embedTitle : '❌ Command Failed')
          .setDescription(result.message || 'Command execution completed')
          .addFields(
            { name: 'Executed By', value: `<@${message.author.id}>`, inline: true },
            { name: 'Function', value: command.function, inline: true }
          )
          .setTimestamp()
          .setFooter({ text: 'Iris AI' });

        // Add command-specific fields
        if (['add_role', 'remove_role'].includes(command.function)) {
          if (command.parameters && command.parameters.userId) {
            commandEmbed.addFields({ name: 'Target', value: `<@${command.parameters.userId}>`, inline: true });
          }
        } else {
          // Traditional command fields
          if (command.target) {
            commandEmbed.addFields({ name: 'Target', value: String(command.target), inline: true });
          }
          if (command.reason) {
            commandEmbed.addFields({ name: 'Reason', value: command.reason, inline: false });
          }
          if (command.duration) {
            commandEmbed.addFields({ name: 'Duration', value: command.duration, inline: true });
          }
          if (command.amount) {
            commandEmbed.addFields({ name: 'Amount', value: String(command.amount), inline: true });
          }
        }

        return { embed: commandEmbed, text: result.message };
      }
    } else {
      // Legacy string result format
      const resultMessage = typeof result === 'string' ? result : (result?.message || 'Command executed');
      
      const commandEmbed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(embedTitle)
        .setDescription(resultMessage)
        .addFields(
          { name: 'Executed By', value: `<@${message.author.id}>`, inline: true },
          { name: 'Function', value: command.function, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Iris AI Moderation' });
      
      // Add command-specific fields
      if (['add_role', 'remove_role'].includes(command.function)) {
        if (command.parameters && command.parameters.userId) {
          commandEmbed.addFields({ name: 'Target', value: `<@${command.parameters.userId}>`, inline: true });
        }
      } else {
        // Traditional command fields
        if (command.target) {
          commandEmbed.addFields({ name: 'Target', value: String(command.target), inline: true });
        }
        if (command.reason) {
          commandEmbed.addFields({ name: 'Reason', value: command.reason, inline: false });
        }
        if (command.duration) {
          commandEmbed.addFields({ name: 'Duration', value: command.duration, inline: true });
        }
        if (command.amount) {
          commandEmbed.addFields({ name: 'Amount', value: String(command.amount), inline: true });
        }
      }
      
      return { embed: commandEmbed, text: resultMessage };
    }
  } catch (error) {
    console.error('Error executing command:', error);
    return {
      embed: new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Command Error')
        .setDescription('An error occurred while executing the command.')
        .addFields(
          { name: 'Error Details', value: error.message || 'Unknown error', inline: false }
        )
        .setTimestamp()
        .setFooter({ text: 'Iris AI Moderation' }),
      text: 'An error occurred while executing the command.'
    };
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
    case 'add_role':
    case 'remove_role':
      return 'Manage Roles';
    case 'change_nickname':
      return 'Change Nickname / Manage Nicknames';
    default:
      return 'Undefined';
  }
}

module.exports = {
  extractCommand,
  handleCommand
};