const { EmbedBuilder } = require('discord.js');
const { 
  setAutoModerationRule, 
  getAutoModerationRules, 
  removeAutoModerationRule, 
  clearAutoModerationRules 
} = require('../../../events/database');

async function executeSetAutoModRule(message, command) {
  const { warning_threshold, action, duration, reason } = command.parameters;
  const guild = message.guild;
  const user = message.author;
  
  // Validate threshold
  if (!warning_threshold || warning_threshold < 1 || warning_threshold > 20) {
    return {
      success: false,
      message: 'Warning threshold must be between 1 and 20.'
    };
  }
  
  // Validate action
  if (!['mute', 'kick', 'ban'].includes(action)) {
    return {
      success: false,
      message: 'Action must be either "mute", "kick", or "ban".'
    };
  }
  
  // Validate duration for mute/ban
  if ((action === 'mute' || action === 'ban') && !duration) {
    return {
      success: false,
      message: `Duration is required for ${action} action. Use format: 30m, 1h, 1d, etc.`
    };
  }
  
  try {
    await setAutoModerationRule(
      guild.id,
      warning_threshold,
      action,
      duration,
      reason || `Auto-${action} at ${warning_threshold} warnings`,
      user.id
    );
    
    let durationText = duration ? ` for ${duration}` : '';
    
    return {
      success: true,
      message: `✅ **Auto-Moderation Rule Set**\n` +
               `**Threshold:** ${warning_threshold} warnings\n` +
               `**Action:** ${action.charAt(0).toUpperCase() + action.slice(1)}${durationText}\n` +
               `**Reason:** ${reason || `Auto-${action} at ${warning_threshold} warnings`}`,
      embed: new EmbedBuilder()
        .setColor(0x00AA00)
        .setTitle('⚙️ Auto-Moderation Rule Set')
        .setDescription('Auto-moderation rule has been configured successfully')
        .addFields([
          { name: 'Warning Threshold', value: warning_threshold.toString(), inline: true },
          { name: 'Action', value: action.charAt(0).toUpperCase() + action.slice(1), inline: true },
          { name: 'Duration', value: duration || 'N/A', inline: true },
          { name: 'Reason', value: reason || `Auto-${action} at ${warning_threshold} warnings`, inline: false },
          { name: 'Set By', value: user.tag, inline: true }
        ])
        .setTimestamp()
        .setFooter({ text: 'Iris AI Auto-Moderation' })
    };
    
  } catch (error) {
    console.error('Error setting auto-mod rule:', error);
    return {
      success: false,
      message: `Error setting auto-moderation rule: ${error.message}`
    };
  }
}

async function executeListAutoModRules(message, command) {
  const guild = message.guild;
  
  try {
    const rules = await getAutoModerationRules(guild.id);
    
    if (!rules || rules.length === 0) {
      return {
        success: true,
        message: '📋 **Auto-Moderation Rules**\n\nNo auto-moderation rules are currently set for this server.\n\n💡 Use "Set auto-mod rule" to create rules.',
        embed: new EmbedBuilder()
          .setColor(0x0099FF)
          .setTitle('📋 Auto-Moderation Rules')
          .setDescription('No auto-moderation rules are currently configured for this server.')
          .addFields([
            { 
              name: '💡 Getting Started', 
              value: 'To create auto-moderation rules, ask me something like:\n' +
                     '• "Set auto-mute at 3 warnings for 1 hour"\n' +
                     '• "Make it so 5 warnings = kick"\n' +
                     '• "Auto-ban users at 7 warnings for 1 day"',
              inline: false 
            }
          ])
          .setTimestamp()
          .setFooter({ text: 'Iris AI Auto-Moderation' })
      };
    }
    
    let rulesText = '📋 **Auto-Moderation Rules**\n\n';
    let embedFields = [];
    
    rules.forEach((rule, index) => {
      let durationText = rule.duration ? ` for ${rule.duration}` : '';
      rulesText += `**${index + 1}.** ${rule.warning_threshold} warnings → ${rule.action}${durationText}\n`;
      rulesText += `   └ *${rule.reason}*\n\n`;
      
      embedFields.push({
        name: `Rule ${index + 1}: ${rule.warning_threshold} Warnings`,
        value: `**Action:** ${rule.action.charAt(0).toUpperCase() + rule.action.slice(1)}${durationText}\n` +
               `**Reason:** ${rule.reason}`,
        inline: true
      });
    });
    
    rulesText += '💡 **Usage:** Users who reach these warning thresholds will automatically receive the specified actions.';
    
    return {
      success: true,
      message: rulesText,
      embed: new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('📋 Auto-Moderation Rules')
        .setDescription(`**${guild.name}** has ${rules.length} auto-moderation rule${rules.length === 1 ? '' : 's'} configured.`)
        .addFields(embedFields)
        .addFields([
          {
            name: '💡 How It Works',
            value: 'When a user accumulates the specified number of warnings, the corresponding action will be automatically executed.',
            inline: false
          }
        ])
        .setTimestamp()
        .setFooter({ text: 'Iris AI Auto-Moderation' })
    };
    
  } catch (error) {
    console.error('Error listing auto-mod rules:', error);
    return {
      success: false,
      message: `Error retrieving auto-moderation rules: ${error.message}`
    };
  }
}

async function executeRemoveAutoModRule(message, command) {
  const { warning_threshold } = command.parameters;
  const guild = message.guild;
  const user = message.author;
  
  // Validate threshold
  if (!warning_threshold || warning_threshold < 1 || warning_threshold > 20) {
    return {
      success: false,
      message: 'Warning threshold must be between 1 and 20.'
    };
  }
  
  try {
    // Check if rule exists first
    const existingRules = await getAutoModerationRules(guild.id);
    const ruleToRemove = existingRules.find(rule => rule.warning_threshold === warning_threshold);
    
    if (!ruleToRemove) {
      return {
        success: false,
        message: `No auto-moderation rule found for ${warning_threshold} warnings.`,
        embed: new EmbedBuilder()
          .setColor(0xFF6600)
          .setTitle('❌ Rule Not Found')
          .setDescription(`No auto-moderation rule exists for **${warning_threshold} warnings**.`)
          .addFields([
            {
              name: '💡 Available Rules',
              value: existingRules.length > 0 
                ? existingRules.map(rule => `• ${rule.warning_threshold} warnings → ${rule.action}`).join('\n')
                : 'No rules are currently configured.',
              inline: false
            }
          ])
          .setTimestamp()
          .setFooter({ text: 'Iris AI Auto-Moderation' })
      };
    }
    
    const removed = await removeAutoModerationRule(guild.id, warning_threshold);
    
    if (removed) {
      return {
        success: true,
        message: `✅ **Auto-Moderation Rule Removed**\n` +
                 `Removed rule for **${warning_threshold} warnings** (${ruleToRemove.action})`,
        embed: new EmbedBuilder()
          .setColor(0xFF6600)
          .setTitle('🗑️ Auto-Moderation Rule Removed')
          .setDescription('Auto-moderation rule has been successfully removed')
          .addFields([
            { name: 'Warning Threshold', value: warning_threshold.toString(), inline: true },
            { name: 'Removed Action', value: ruleToRemove.action.charAt(0).toUpperCase() + ruleToRemove.action.slice(1), inline: true },
            { name: 'Duration', value: ruleToRemove.duration || 'N/A', inline: true },
            { name: 'Previous Reason', value: ruleToRemove.reason, inline: false },
            { name: 'Removed By', value: user.tag, inline: true }
          ])
          .setTimestamp()
          .setFooter({ text: 'Iris AI Auto-Moderation' })
      };
    } else {
      return {
        success: false,
        message: `Failed to remove auto-moderation rule for ${warning_threshold} warnings.`
      };
    }
    
  } catch (error) {
    console.error('Error removing auto-mod rule:', error);
    return {
      success: false,
      message: `Error removing auto-moderation rule: ${error.message}`
    };
  }
}

async function executeClearAutoModRules(message, command) {
  const guild = message.guild;
  const user = message.author;
  
  try {
    // Get existing rules before clearing
    const existingRules = await getAutoModerationRules(guild.id);
    
    if (!existingRules || existingRules.length === 0) {
      return {
        success: true,
        message: '📋 **No Rules to Clear**\n\nThere are no auto-moderation rules currently configured for this server.',
        embed: new EmbedBuilder()
          .setColor(0x0099FF)
          .setTitle('📋 No Auto-Moderation Rules')
          .setDescription('There are no auto-moderation rules to clear.')
          .addFields([
            {
              name: '💡 Getting Started',
              value: 'To create auto-moderation rules, ask me something like:\n' +
                     '• "Set auto-mute at 3 warnings for 1 hour"\n' +
                     '• "Make it so 5 warnings = kick"',
              inline: false
            }
          ])
          .setTimestamp()
          .setFooter({ text: 'Iris AI Auto-Moderation' })
      };
    }
    
    const clearedCount = await clearAutoModerationRules(guild.id);
    
    if (clearedCount > 0) {
      let clearedRulesText = existingRules.map((rule, index) => 
        `${index + 1}. ${rule.warning_threshold} warnings → ${rule.action}${rule.duration ? ` (${rule.duration})` : ''}`
      ).join('\n');
      
      return {
        success: true,
        message: `✅ **All Auto-Moderation Rules Cleared**\n` +
                 `Successfully removed ${clearedCount} rule${clearedCount === 1 ? '' : 's'} from this server.`,
        embed: new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('🧹 Auto-Moderation Rules Cleared')
          .setDescription(`All auto-moderation rules have been successfully removed from **${guild.name}**.`)
          .addFields([
            { 
              name: `📊 Cleared Rules (${clearedCount})`, 
              value: clearedRulesText, 
              inline: false 
            },
            { 
              name: '⚠️ Important', 
              value: 'Users will no longer receive automatic punishments for accumulating warnings. You can set new rules anytime.', 
              inline: false 
            },
            { name: 'Cleared By', value: user.tag, inline: true },
            { name: 'Date', value: new Date().toLocaleDateString(), inline: true }
          ])
          .setTimestamp()
          .setFooter({ text: 'Iris AI Auto-Moderation' })
      };
    } else {
      return {
        success: false,
        message: 'Failed to clear auto-moderation rules.'
      };
    }
    
  } catch (error) {
    console.error('Error clearing auto-mod rules:', error);
    return {
      success: false,
      message: `Error clearing auto-moderation rules: ${error.message}`
    };
  }
}

module.exports = {
    executeSetAutoModRule,
    executeListAutoModRules,
    executeRemoveAutoModRule,
    executeClearAutoModRules
};