const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { getUserInfo } = require('../../events/utils/userInfo');
const { getUserPrivacySettings, updateUserPrivacySettings, clearConversationHistory, removeUserApiKey } = require('../../AI/events/database');
const { getUserApiKey, getCustomSystemMessage } = require('../../AI/events/database');
const path = require('path');
const fs = require('fs');
const { AttachmentBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('privacy')
    .setDescription('🔒 Manage your privacy settings and view accessible data')
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View what data the bot can access about you'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('settings')
        .setDescription('Configure your privacy preferences'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('quick')
        .setDescription('Quick privacy settings')
        .addBooleanOption(option =>
          option.setName('share_presence')
            .setDescription('Allow bot to see your gaming/activity status')
            .setRequired(false))
        .addBooleanOption(option =>
          option.setName('share_server_info')
            .setDescription('Allow bot to see your server roles and permissions')
            .setRequired(false))),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });
      
      const subcommand = interaction.options.getSubcommand();
      
      switch (subcommand) {
        case 'view':
          await handlePrivacyView(interaction);
          break;
        case 'settings':
          await handlePrivacySettings(interaction);
          break;
        case 'quick':
          await handleQuickSettings(interaction);
          break;
        default:
          await interaction.editReply({
            content: '❌ Unknown subcommand. Please try again.',
            ephemeral: true
          });
      }
    } catch (error) {
      console.error('Privacy command error:', error);
      
      const errorMessage = {
        content: '❌ An error occurred while processing your privacy request. Please try again later.',
        ephemeral: true
      };
      
      if (interaction.deferred && !interaction.replied) {
        await interaction.editReply(errorMessage);
      } else if (!interaction.replied) {
        await interaction.reply(errorMessage);
      }
    }
  }
};

// ===========================================
// PRIVACY VIEW HANDLER
// ===========================================
async function handlePrivacyView(interaction) {
  try {
    // Get user privacy settings
    const privacySettings = await getUserPrivacySettings(interaction.user.id);
    
    // Create mock message for getUserInfo
    const mockMessage = {
      author: interaction.user,
      guild: interaction.guild,
      channel: interaction.channel,
      client: interaction.client
    };
    
    const userInfo = await getUserInfo(mockMessage);
    
    // Create main embed
    const embed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle('🔒 Your Privacy Overview')
      .setDescription('Here\'s what data the bot can currently access about you:')
      .addFields([
        {
          name: '👤 Basic Information (Always Available)',
          value: `• **Username**: ${userInfo.username || 'Unknown'}\n• **User ID**: ${interaction.user.id}\n• **Server**: ${userInfo.serverName || 'Direct Message'}`,
          inline: false
        },
        {
          name: '🎮 Presence & Activity Data',
          value: createPresenceStatusText(privacySettings, userInfo),
          inline: true
        },
        {
          name: '🏰 Server Information',
          value: createServerInfoStatusText(privacySettings, userInfo),
          inline: true
        },
        {
          name: '📊 Data Summary',
          value: createDataSummary(privacySettings),
          inline: false
        }
      ])
      .setFooter({ text: '🛡️ Privacy settings can be changed anytime' })
      .setTimestamp();

    // Create action buttons
    const actionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('privacy_change_settings')
          .setLabel('⚙️ Change Settings')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('privacy_clear_data')
          .setLabel('🗑️ Clear Data')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('privacy_export_data')
          .setLabel('📤 Export Data')
          .setStyle(ButtonStyle.Secondary)
      );

    const response = await interaction.editReply({
      embeds: [embed],
      components: [actionRow]
    });

    // Set up button collector
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300000 // 5 minutes
    });

    collector.on('collect', async (buttonInteraction) => {
      if (buttonInteraction.user.id !== interaction.user.id) {
        await safeReply(buttonInteraction, {
          content: '❌ You can only manage your own privacy settings.',
          ephemeral: true
        });
        return;
      }

      await safeDeferUpdate(buttonInteraction);

      try {
        switch (buttonInteraction.customId) {
          case 'privacy_change_settings':
            await handlePrivacySettings(buttonInteraction);
            break;
          case 'privacy_clear_data':
            await handleClearData(buttonInteraction);
            break;
          case 'privacy_export_data':
            await handleExportData(buttonInteraction);
            break;
        }
      } catch (error) {
        console.error('Button interaction error:', error);
        await safeFollowUp(buttonInteraction, {
          content: '❌ An error occurred. Please try again.',
          ephemeral: true
        });
      }
    });

    collector.on('end', () => {
      disableButtons(interaction, [actionRow]);
    });

  } catch (error) {
    console.error('Error in privacy view:', error);
    throw error;
  }
}

// ===========================================
// PRIVACY SETTINGS HANDLER
// ===========================================
async function handlePrivacySettings(interaction) {
  try {
    const currentSettings = await getUserPrivacySettings(interaction.user.id);
    
    const embed = new EmbedBuilder()
      .setColor(0x9B59B6)
      .setTitle('⚙️ Privacy Settings')
      .setDescription('Configure what data you share with the bot. All changes are saved automatically.')
      .addFields([
        {
          name: '🎮 Presence & Activity Sharing',
          value: `**Status**: ${currentSettings.share_presence ? '✅ ENABLED' : '❌ DISABLED (Default)'}\n${currentSettings.share_presence ? 'Bot can see your gaming status and activities' : 'Your activities remain completely private'}`,
          inline: false
        },
        {
          name: '🏰 Server Information Sharing',
          value: `**Status**: ${currentSettings.share_server_info ? '✅ ENABLED (Default)' : '❌ DISABLED'}\n${currentSettings.share_server_info ? 'Bot can see your server roles for moderation' : 'Your server data remains private'}`,
          inline: false
        }
      ])
      .setFooter({ text: '🛡️ Default: Maximum privacy (presence disabled)' })
      .setTimestamp();

    // Toggle buttons
    const toggleRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('toggle_presence')
          .setLabel(`🎮 ${currentSettings.share_presence ? 'Disable' : 'Enable'} Presence`)
          .setStyle(currentSettings.share_presence ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('toggle_server_info')
          .setLabel(`🏰 ${currentSettings.share_server_info ? 'Disable' : 'Enable'} Server Info`)
          .setStyle(currentSettings.share_server_info ? ButtonStyle.Danger : ButtonStyle.Success)
      );

    // Action buttons
    const actionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('privacy_reset_defaults')
          .setLabel('🔄 Reset to Defaults')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('privacy_back_to_view')
          .setLabel('👁️ View Data')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('privacy_done')
          .setLabel('✅ Done')
          .setStyle(ButtonStyle.Primary)
      );

    const response = await safeEditReply(interaction, {
      embeds: [embed],
      components: [toggleRow, actionRow]
    });

    // Set up button collector
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 600000 // 10 minutes
    });

    collector.on('collect', async (buttonInteraction) => {
      if (buttonInteraction.user.id !== interaction.user.id) {
        await safeReply(buttonInteraction, {
          content: '❌ You can only manage your own privacy settings.',
          ephemeral: true
        });
        return;
      }

      await safeDeferUpdate(buttonInteraction);

      try {
        switch (buttonInteraction.customId) {
          case 'toggle_presence':
            await toggleSetting(buttonInteraction, 'share_presence');
            break;
          case 'toggle_server_info':
            await toggleSetting(buttonInteraction, 'share_server_info');
            break;
          case 'privacy_reset_defaults':
            await resetToDefaults(buttonInteraction);
            break;
          case 'privacy_back_to_view':
            await handlePrivacyView(buttonInteraction);
            break;
          case 'privacy_done':
            await showCompletionMessage(buttonInteraction);
            break;
        }
      } catch (error) {
        console.error('Settings button error:', error);
        await safeFollowUp(buttonInteraction, {
          content: '❌ An error occurred while updating settings.',
          ephemeral: true
        });
      }
    });

    collector.on('end', () => {
      disableButtons(interaction, [toggleRow, actionRow]);
    });

  } catch (error) {
    console.error('Error in privacy settings:', error);
    throw error;
  }
}

// ===========================================
// QUICK SETTINGS HANDLER
// ===========================================
async function handleQuickSettings(interaction) {
  try {
    const sharePresence = interaction.options.getBoolean('share_presence');
    const shareServerInfo = interaction.options.getBoolean('share_server_info');
    
    if (sharePresence === null && shareServerInfo === null) {
      await interaction.editReply({
        content: '❌ Please specify at least one setting to update.\n\n**Usage:**\n• `/privacy quick share_presence:true` - Enable presence sharing\n• `/privacy quick share_server_info:false` - Disable server info sharing',
        ephemeral: true
      });
      return;
    }

    // Update settings
    const updates = {};
    if (sharePresence !== null) updates.share_presence = sharePresence ? 1 : 0;
    if (shareServerInfo !== null) updates.share_server_info = shareServerInfo ? 1 : 0;
    
    await updateUserPrivacySettings(interaction.user.id, updates);
    
    // Create confirmation embed
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('✅ Privacy Settings Updated')
      .setDescription('Your privacy preferences have been saved successfully.');

    const fields = [];
    if (sharePresence !== null) {
      fields.push({
        name: '🎮 Presence & Activity Sharing',
        value: sharePresence ? 
          '✅ **ENABLED** - Bot can see your gaming status and activities' :
          '❌ **DISABLED** - Your activities remain private',
        inline: false
      });
    }
    
    if (shareServerInfo !== null) {
      fields.push({
        name: '🏰 Server Information Sharing',
        value: shareServerInfo ? 
          '✅ **ENABLED** - Bot can see your server roles and permissions' :
          '❌ **DISABLED** - Your server data remains private',
        inline: false
      });
    }

    embed.addFields(fields);
    embed.addFields({
      name: '💡 More Options',
      value: '• Use `/privacy view` to see all accessible data\n• Use `/privacy settings` for interactive configuration',
      inline: false
    });
    
    embed.setFooter({ text: 'Settings can be changed anytime' })
         .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error in quick settings:', error);
    throw error;
  }
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

function createPresenceStatusText(privacySettings, userInfo) {
  if (!privacySettings.share_presence) {
    return '❌ **DISABLED** (Default)\nYour presence data is completely private';
  }
  
  if (!userInfo.presence) {
    return '✅ **ENABLED**\nNo current activity detected';
  }
  
  let statusText = '✅ **ENABLED**\n';
  statusText += `• Status: ${userInfo.presence.statusText || 'Unknown'}\n`;
  statusText += `• Activity: ${userInfo.presence.currentGame || 'None'}\n`;
  if (userInfo.presence.customStatus) {
    statusText += `• Custom: ${userInfo.presence.customStatus}`;
  }
  
  return statusText;
}

function createServerInfoStatusText(privacySettings, userInfo) {
  if (!privacySettings.share_server_info) {
    return '❌ **DISABLED**\nYour server data is private';
  }
  
  if (!userInfo.serverName) {
    return '✅ **ENABLED**\nDirect message context';
  }
  
  let infoText = '✅ **ENABLED** (Default)\n';
  infoText += `• Server: ${userInfo.serverName}\n`;
  infoText += `• Roles: ${userInfo.roles || 'None'}\n`;
  infoText += `• Admin: ${userInfo.isAdmin ? 'Yes' : 'No'}`;
  
  return infoText;
}

function createDataSummary(privacySettings) {
  const enabledCount = (privacySettings.share_presence ? 1 : 0) + (privacySettings.share_server_info ? 1 : 0);
  const totalOptional = 2;
  
  let summary = `**Privacy Level**: ${enabledCount === 0 ? 'Maximum' : enabledCount === 1 ? 'Balanced' : 'Open'}\n`;
  summary += `**Optional Data Shared**: ${enabledCount}/${totalOptional}\n`;
  summary += `**Always Available**: Basic info, chat history, API keys`;
  
  return summary;
}

async function toggleSetting(interaction, settingName) {
  const currentSettings = await getUserPrivacySettings(interaction.user.id);
  const newValue = currentSettings[settingName] ? 0 : 1;
  
  const updates = {};
  updates[settingName] = newValue;
  
  await updateUserPrivacySettings(interaction.user.id, updates);
  
  // Refresh the settings panel
  await handlePrivacySettings(interaction);
  
  // Show success message
  const settingDisplayName = settingName === 'share_presence' ? 'Presence Sharing' : 'Server Info Sharing';
  const statusText = newValue ? 'enabled' : 'disabled';
  
  await safeFollowUp(interaction, {
    content: `✅ **${settingDisplayName}** has been **${statusText}**!`,
    ephemeral: true
  });
}

async function resetToDefaults(interaction) {
  const defaultSettings = {
    share_presence: 0,        // Default: OFF (privacy first)
    share_server_info: 1      // Default: ON (needed for moderation)
  };
  
  await updateUserPrivacySettings(interaction.user.id, defaultSettings);
  
  // Refresh the panel
  await handlePrivacySettings(interaction);
  
  await safeFollowUp(interaction, {
    content: '✅ Privacy settings reset to secure defaults!\n• 🎮 **Presence sharing**: Disabled\n• 🏰 **Server info sharing**: Enabled',
    ephemeral: true
  });
}

async function handleClearData(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0xE74C3C)
    .setTitle('🗑️ Clear Your Data')
    .setDescription('Choose what data you want to delete. **This action cannot be undone!**')
    .addFields([
      {
        name: '💬 Conversation History',
        value: 'Delete all your previous conversations with the bot',
        inline: false
      },
      {
        name: '🔐 API Keys',
        value: 'Remove your stored encrypted API keys',
        inline: false
      }
    ]);

  const clearRow = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('confirm_clear_conversations')
        .setLabel('💬 Clear Conversations')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('confirm_clear_api_keys')
        .setLabel('🔐 Clear API Keys')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('cancel_clear')
        .setLabel('❌ Cancel')
        .setStyle(ButtonStyle.Secondary)
    );

  await safeEditReply(interaction, {
    embeds: [embed],
    components: [clearRow]
  });

  // Handle clear data buttons (simplified for space)
  const collector = interaction.fetchReply().then(response => 
    response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000 // 1 minute for destructive actions
    })
  );

  (await collector).on('collect', async (buttonInteraction) => {
    if (buttonInteraction.user.id !== interaction.user.id) {
      await safeReply(buttonInteraction, {
        content: '❌ You can only manage your own data.',
        ephemeral: true
      });
      return;
    }

    await safeDeferUpdate(buttonInteraction);

    try {
      switch (buttonInteraction.customId) {
        case 'confirm_clear_conversations':
          await clearConversationHistory(interaction.user.id);
          await safeEditReply(buttonInteraction, {
            content: '✅ **Conversation history cleared!** All your previous conversations have been deleted.',
            embeds: [],
            components: []
          });
          break;
        case 'confirm_clear_api_keys':
          await removeUserApiKey(interaction.user.id);
          await safeEditReply(buttonInteraction, {
            content: '✅ **API keys removed!** All your stored API keys have been deleted.',
            embeds: [],
            components: []
          });
          break;
        case 'cancel_clear':
          await handlePrivacyView(buttonInteraction);
          break;
      }
    } catch (error) {
      console.error('Clear data error:', error);
      await safeEditReply(buttonInteraction, {
        content: '❌ An error occurred while clearing data. Please try again.',
        embeds: [],
        components: []
      });
    }
  });
}

async function handleExportData(interaction) {
  try {
    const userId = interaction.user.id;
    const username = interaction.user.username;

    // Get user's configurations (same as export command)
    const [apiKeyInfo, customSystem] = await Promise.all([
      getUserApiKey(userId),
      getCustomSystemMessage(userId)
    ]);

    if (!apiKeyInfo && !customSystem) {
      const noConfigEmbed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('📤 Export Your Data')
        .setDescription("You don't have any custom configurations to export. Set up API keys or custom personalities first!")
        .addFields({
          name: '💡 What can be exported?',
          value: '• API key configurations (masked for security)\n• Custom personality settings\n• Provider preferences',
          inline: false
        })
        .setTimestamp();
      
      await safeEditReply(interaction, {
        embeds: [noConfigEmbed],
        components: []
      });
      return;
    }

    // Create configuration data
    const configData = {
      version: '1.0.2',
      timestamp: new Date().toISOString(),
      user: {
        id: userId,
        username: username
      },
      apiKey: apiKeyInfo ? {
        provider: apiKeyInfo.provider || 'gemini',
        model: apiKeyInfo.model || 'gemini-2.0-flash',
        endpoint: apiKeyInfo.endpoint || 'https://generativelanguage.googleapis.com/v1beta/openai/',
        // Masked API key for security
        key: apiKeyInfo.api_key ? `${apiKeyInfo.api_key.substring(0, 4)}...${apiKeyInfo.api_key.substring(apiKeyInfo.api_key.length - 4)}` : null
      } : null,
      customSystem: customSystem ? {
        botName: customSystem.bot_name || 'Iris',
        personality: customSystem.personality || null
      } : null
    };

    // Create JSON file content
    const fileContent = JSON.stringify(configData, null, 2);
    const fileName = `iris_privacy_export_${username}_${Date.now()}.json`;

    // Create temporary file
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const filePath = path.join(tempDir, fileName);
    fs.writeFileSync(filePath, fileContent);

    // Create attachment
    const attachment = new AttachmentBuilder(filePath, { name: fileName });

    // Create embed
    const exportEmbed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('✅ Data Export Complete')
      .setDescription('Your personal data has been exported successfully.')
      .addFields([
        { 
          name: '🔑 Included Data', 
          value: `${apiKeyInfo ? '✓ API Key Configuration (masked)\n' : ''}${customSystem ? '✓ Custom Personality Settings\n' : ''}`, 
          inline: false 
        },
        { 
          name: '🔒 Privacy Note', 
          value: 'Actual API keys are masked for security. This export contains your configuration preferences only.', 
          inline: false 
        },
        { 
          name: '💡 Usage', 
          value: 'This file can be used with `/import` command to transfer settings.', 
          inline: false 
        }
      ])
      .setTimestamp()
      .setFooter({ text: `Data export for ${username}` });

    // Send response with file
    await safeEditReply(interaction, {
      embeds: [exportEmbed],
      files: [attachment],
      components: []
    });

    // Delete temporary file after sending
    setTimeout(() => {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Error deleting temporary file:', err);
      }
    }, 5000);

  } catch (error) {
    console.error('Error in handleExportData:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('❌ Export Error')
      .setDescription('There was an error exporting your data. Please try again later.')
      .setTimestamp();
    
    await safeEditReply(interaction, {
      embeds: [errorEmbed],
      components: []
    });
  }
}

async function showCompletionMessage(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0x27AE60)
    .setTitle('✅ Privacy Settings Complete')
    .setDescription('Your privacy preferences have been saved successfully.')
    .addFields([
      {
        name: '💡 Quick Commands',
        value: '• `/privacy view` - View accessible data\n• `/privacy settings` - Interactive settings\n• `/privacy quick` - Quick updates\n• `/clear` - Delete conversation history',
        inline: false
      }
    ])
    .setFooter({ text: 'Your privacy settings can be changed anytime' })
    .setTimestamp();

  await safeEditReply(interaction, {
    embeds: [embed],
    components: []
  });
}

// ===========================================
// UTILITY FUNCTIONS FOR SAFE INTERACTIONS
// ===========================================

async function safeDeferUpdate(interaction) {
  try {
    if (!interaction.replied && !interaction.deferred) {
      await interaction.deferUpdate();
      return true;
    }
  } catch (error) {
    if (error.code !== 40060 && error.code !== 10062) {
      console.error('Error deferring interaction:', error);
    }
  }
  return false;
}

async function safeReply(interaction, options) {
  try {
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply(options);
      return true;
    }
  } catch (error) {
    if (error.code !== 40060 && error.code !== 10062) {
      console.error('Error replying to interaction:', error);
    }
  }
  return false;
}

async function safeEditReply(interaction, options) {
  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(options);
      return await interaction.fetchReply();
    } else {
      await interaction.reply(options);
      return await interaction.fetchReply();
    }
  } catch (error) {
    if (error.code !== 40060 && error.code !== 10062) {
      console.error('Error editing reply:', error);
    }
    return null;
  }
}

async function safeFollowUp(interaction, options) {
  try {
    await interaction.followUp(options);
    return true;
  } catch (error) {
    if (error.code !== 40060 && error.code !== 10062) {
      console.error('Error following up:', error);
    }
  }
  return false;
}

async function disableButtons(interaction, actionRows) {
  try {
    const disabledComponents = actionRows.map(row =>
      new ActionRowBuilder().addComponents(
        ...row.components.map(button => 
          ButtonBuilder.from(button).setDisabled(true)
        )
      )
    );
    
    await interaction.editReply({ components: disabledComponents });
  } catch (error) {
    // Ignore errors when disabling buttons
    console.log('Note: Could not disable buttons (interaction may have expired)');
  }
}