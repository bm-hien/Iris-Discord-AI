const { EmbedBuilder } = require('discord.js');
const { findMember } = require('../Utils/shared/utils');
const { 
  addWarning, 
  getUserWarningCount, 
  getUserWarnings, 
  removeWarning, 
  clearUserWarnings,
  getWarningById 
} = require('../../../events/database');

/**
 * Execute warn command
 */
async function executeWarn(message, command) {
  try {
    const { target, reason } = command;
    const guild = message.guild;
    const executor = message.member;
    
    if (!target) {
      return {
        success: false,
        message: 'Missing required parameter: target user'
      };
    }

    // Find the target member
    const member = await findMember(guild, target);
    if (!member) {
      return {
        success: false,
        message: `Member not found: ${target}`
      };
    }

    // Check if trying to warn themselves
    if (member.id === executor.id) {
      return {
        success: false,
        message: 'You cannot warn yourself'
      };
    }

    // Check if trying to warn the bot
    if (member.user.bot) {
      return {
        success: false,
        message: 'Cannot warn bots'
      };
    }

    // Check role hierarchy
    if (member.roles.highest.position >= executor.roles.highest.position && guild.ownerId !== executor.id) {
      return {
        success: false,
        message: 'You cannot warn members with roles equal to or higher than yours'
      };
    }

    // Save warning to database
    const warningData = await addWarning(
      member.id,
      guild.id,
      executor.id,
      reason || 'No reason provided'
    );

    // Get total warning count for this user
    const warningCount = await getUserWarningCount(member.id, guild.id);

    console.log(`Warning saved to database: ID ${warningData.id}, User: ${member.user.username}, Total warnings: ${warningCount}`);

    // Check for auto-moderation rules
    const { getAutoModerationRules } = require('../../../events/database');
    const autoModRules = await getAutoModerationRules(guild.id);
    
    let autoModAction = null;
    
    // Find matching auto-mod rule
    const matchingRule = autoModRules.find(rule => rule.warning_threshold === warningCount);
    
    if (matchingRule) {
      try {
        // Import the functions as default exports
        const executeMute = require('./muteCommand');
        const executeKick = require('./kickCommand');
        const executeBan = require('./banCommand');
        
        console.log(`Auto-mod rule triggered: ${matchingRule.action} for ${warningCount} warnings`);
        
        // Execute auto-moderation action
        switch (matchingRule.action) {
          case 'mute':
            const muteCommand = {
              target: member.id,
              duration: matchingRule.duration,
              reason: `Auto-mute: ${matchingRule.reason || 'Reached warning threshold'}`
            };
            autoModAction = await executeMute(message, muteCommand);
            break;
            
          case 'kick':
            const kickCommand = {
              target: member.id,
              reason: `Auto-kick: ${matchingRule.reason || 'Reached warning threshold'}`
            };
            autoModAction = await executeKick(message, kickCommand);
            break;
            
          case 'ban':
            const banCommand = {
              target: member.id,
              duration: matchingRule.duration,
              reason: `Auto-ban: ${matchingRule.reason || 'Reached warning threshold'}`
            };
            autoModAction = await executeBan(message, banCommand);
            break;
        }
        
        console.log(`Auto-mod action executed: ${matchingRule.action} - ${autoModAction}`);
      } catch (autoModError) {
        console.error('Error executing auto-moderation:', autoModError);
      }
    }

    // Try to DM the user about the warning
    let dmSent = false;
    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(0xFFAA00)
        .setTitle('⚠️ Warning Received')
        .setDescription(`You have received a warning in **${guild.name}**`)
        .addFields([
          { name: 'Reason', value: reason || 'No reason provided', inline: false },
          { name: 'Moderator', value: executor.user.tag, inline: true },
          { name: 'Server', value: guild.name, inline: true },
          { name: 'Warning ID', value: `#${warningData.id}`, inline: true },
          { name: 'Total Warnings', value: `${warningCount}`, inline: true }
        ])
        .setTimestamp()
        .setFooter({ text: 'Please follow server rules to avoid further action' });

      // Add auto-mod notification if action was taken
      if (autoModAction && matchingRule) {
        dmEmbed.addFields([
          { 
            name: '🤖 Auto-Moderation Triggered', 
            value: `You have been ${matchingRule.action}d due to reaching ${warningCount} warnings.`, 
            inline: false 
          }
        ]);
      }

      await member.send({ embeds: [dmEmbed] });
      dmSent = true;
    } catch (error) {
      console.log(`Could not DM warning to ${member.user.username}: ${error.message}`);
    }

    // Build response embed
    const responseEmbed = new EmbedBuilder()
      .setColor(0xFFAA00)
      .setTitle('⚠️ Member Warned')
      .setDescription(`**${member.user.username}** has been warned`)
      .addFields([
        { name: 'Target', value: member.user.tag, inline: true },
        { name: 'Warning ID', value: `#${warningData.id}`, inline: true },
        { name: 'Total Warnings', value: `${warningCount}`, inline: true },
        { name: 'Reason', value: reason || 'No reason provided', inline: false },
        { name: 'Moderator', value: executor.user.tag, inline: true },
        { name: 'DM Status', value: dmSent ? '✅ Sent' : '❌ Failed', inline: true }
      ])
      .setTimestamp()
      .setFooter({ text: `Iris AI Moderation • Warning ID: ${warningData.id}` });

    // Add auto-mod info if triggered
    if (autoModAction && matchingRule) {
      responseEmbed.addFields([
        { 
          name: '🤖 Auto-Moderation Triggered', 
          value: `**${matchingRule.action.charAt(0).toUpperCase() + matchingRule.action.slice(1)}** action executed automatically (${matchingRule.duration || 'permanent'})`, 
          inline: false 
        }
      ]);
      responseEmbed.setColor(0xFF6600); // Change color to indicate auto-mod action
    }

    return {
      success: true,
      message: `Successfully warned ${member.user.username} (Warning #${warningCount})${autoModAction ? ` - Auto-${matchingRule.action} applied` : ''}`,
      embed: responseEmbed
    };

  } catch (error) {
    console.error('Error in executeWarn:', error);
    return {
      success: false,
      message: `Error warning member: ${error.message}`
    };
  }
}

/**
 * Execute warnings command - show warning history
 */
async function executeWarnings(message, command) {
  try {
    const { target, limit = 10 } = command;
    const guild = message.guild;
    
    if (!target) {
      return {
        success: false,
        message: 'Missing required parameter: target user'
      };
    }

    // Find the target member
    const member = await findMember(guild, target);
    if (!member) {
      return {
        success: false,
        message: `Member not found: ${target}`
      };
    }

    // Get warnings for this user
    const warnings = await getUserWarnings(member.id, guild.id, limit);
    const totalCount = await getUserWarningCount(member.id, guild.id);

    if (totalCount === 0) {
      return {
        success: true,
        message: `${member.user.username} has no warnings`,
        embed: new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('📋 Warning History')
          .setDescription(`**${member.user.username}** has no warnings`)
          .setThumbnail(member.user.displayAvatarURL())
          .setTimestamp()
          .setFooter({ text: 'Iris AI Moderation' })
      };
    }

    // Format warnings for display
    const warningList = warnings.map((warning, index) => {
      const date = new Date(warning.timestamp).toLocaleDateString();
      const time = new Date(warning.timestamp).toLocaleTimeString();
      return `**${index + 1}.** ID: \`${warning.id}\` | ${date} ${time}\n**Reason:** ${warning.reason || 'No reason provided'}\n`;
    }).join('\n');

    return {
      success: true,
      message: `Found ${totalCount} warning(s) for ${member.user.username}`,
      embed: new EmbedBuilder()
        .setColor(0xFFAA00)
        .setTitle('📋 Warning History')
        .setDescription(`**${member.user.username}** has **${totalCount}** warning(s)`)
        .addFields([
          { name: 'Recent Warnings', value: warningList || 'No warnings to display', inline: false }
        ])
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: `Iris AI Moderation • Showing latest ${Math.min(warnings.length, 10)} warnings` })
    };

  } catch (error) {
    console.error('Error in executeWarnings:', error);
    return {
      success: false,
      message: `Error getting warnings: ${error.message}`
    };
  }
}

/**
 * Execute delwarn command - delete specific warning
 */
async function executeDelwarn(message, command) {
  try {
    const { warningId, reason } = command;
    const guild = message.guild;
    const executor = message.member;
    
    if (!warningId) {
      return {
        success: false,
        message: 'Missing required parameter: warning ID'
      };
    }

    // Parse warning ID
    const parsedId = parseInt(warningId);
    if (isNaN(parsedId) || parsedId <= 0) {
      return {
        success: false,
        message: 'Invalid warning ID. Please provide a valid number.'
      };
    }

    // Get warning info before deleting
    const warningInfo = await getWarningById(parsedId);
    if (!warningInfo) {
      return {
        success: false,
        message: `Warning with ID ${parsedId} not found`
      };
    }

    // Check if warning is from the same guild
    if (warningInfo.guild_id !== guild.id) {
      return {
        success: false,
        message: 'Warning not found in this server'
      };
    }

    // Remove the warning
    const result = await removeWarning(parsedId, executor.id);
    
    if (!result.success) {
      return {
        success: false,
        message: 'Failed to delete warning'
      };
    }

    // Try to get member info for better display
    let targetMember;
    try {
      targetMember = await guild.members.fetch(warningInfo.user_id);
    } catch (error) {
      // Member might have left the server
    }

    const targetDisplay = targetMember ? targetMember.user.tag : `User ID: ${warningInfo.user_id}`;

    // Get updated warning count
    const remainingWarnings = await getUserWarningCount(warningInfo.user_id, guild.id);

    return {
      success: true,
      message: `Successfully deleted warning #${parsedId}`,
      embed: new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🗑️ Warning Deleted')
        .setDescription(`Warning **#${parsedId}** has been successfully deleted`)
        .addFields([
          { name: 'Target User', value: targetDisplay, inline: true },
          { name: 'Warning ID', value: `#${parsedId}`, inline: true },
          { name: 'Remaining Warnings', value: `${remainingWarnings}`, inline: true },
          { name: 'Original Reason', value: warningInfo.reason || 'No reason provided', inline: false },
          { name: 'Deleted By', value: executor.user.tag, inline: true },
          { name: 'Deletion Reason', value: reason || 'No reason provided', inline: true }
        ])
        .setTimestamp()
        .setFooter({ text: 'Iris AI Moderation' })
    };

  } catch (error) {
    console.error('Error in executeDelwarn:', error);
    return {
      success: false,
      message: `Error deleting warning: ${error.message}`
    };
  }
}

/**
 * Execute clearwarns command - clear all warnings for a user
 */
async function executeClearwarns(message, command) {
  try {
    const { target, reason } = command;
    const guild = message.guild;
    const executor = message.member;
    
    if (!target) {
      return {
        success: false,
        message: 'Missing required parameter: target user'
      };
    }

    // Find the target member
    const member = await findMember(guild, target);
    if (!member) {
      return {
        success: false,
        message: `Member not found: ${target}`
      };
    }

    // Get current warning count
    const currentWarnings = await getUserWarningCount(member.id, guild.id);
    
    if (currentWarnings === 0) {
      return {
        success: false,
        message: `${member.user.username} has no warnings to clear`
      };
    }

    // Clear all warnings
    const deletedCount = await clearUserWarnings(member.id, guild.id);

    return {
      success: true,
      message: `Successfully cleared all warnings for ${member.user.username}`,
      embed: new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🧹 Warnings Cleared')
        .setDescription(`All warnings for **${member.user.username}** have been cleared`)
        .addFields([
          { name: 'Target User', value: member.user.tag, inline: true },
          { name: 'Warnings Cleared', value: `${deletedCount}`, inline: true },
          { name: 'Cleared By', value: executor.user.tag, inline: true },
          { name: 'Reason', value: reason || 'No reason provided', inline: false }
        ])
        .setTimestamp()
        .setFooter({ text: 'Iris AI Moderation' })
    };

  } catch (error) {
    console.error('Error in executeClearwarns:', error);
    return {
      success: false,
      message: `Error clearing warnings: ${error.message}`
    };
  }
}

module.exports = {
  executeWarn,
  executeWarnings,
  executeDelwarn,
  executeClearwarns
};