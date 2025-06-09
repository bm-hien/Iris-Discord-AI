const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { getUserInfo } = require('../../events/utils/userInfo');
const { getUserPrivacySettings, updateUserPrivacySettings } = require('../../AI/events/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('privacy')
    .setDescription('🔒 Manage your privacy settings and view accessible data')
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View what data the bot can access about you')
        .addBooleanOption(option =>
          option.setName('detailed')
            .setDescription('Show detailed breakdown of accessible data')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('settings')
        .setDescription('Interactive privacy settings panel')
        .addBooleanOption(option =>
          option.setName('share_presence')
            .setDescription('Allow bot to see your online status and activities')
            .setRequired(false))
        .addBooleanOption(option =>
          option.setName('share_server_info')
            .setDescription('Allow bot to see your server roles and permissions')
            .setRequired(false))),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'view') {
      await handleViewData(interaction);
    } else if (subcommand === 'settings') {
      // Check if user provided options directly
      const sharePresence = interaction.options.getBoolean('share_presence');
      const shareServerInfo = interaction.options.getBoolean('share_server_info');
      
      if (sharePresence !== null || shareServerInfo !== null) {
        // Handle direct settings update
        await handleDirectSettingsUpdate(interaction, { sharePresence, shareServerInfo });
      } else {
        // Show interactive settings panel
        await handleInteractiveSettings(interaction);
      }
    }
  }
};

async function handleViewData(interaction) {
  const detailed = interaction.options.getBoolean('detailed') || false;
  
  try {
    // Get current privacy settings
    const privacySettings = await getUserPrivacySettings(interaction.user.id);
    
    // Create a mock message to get user info
    const mockMessage = {
      author: interaction.user,
      guild: interaction.guild,
      channel: interaction.channel,
      client: interaction.client
    };
    
    const userInfo = await getUserInfo(mockMessage);
    
    const embed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle('🔒 Your Privacy Overview')
      .setDescription('Here\'s what data the bot can currently access about you:');
    
    if (detailed) {
      embed.addFields([
        {
          name: '👤 Basic Information (Always Accessible)',
          value: `• Username: ${userInfo.username}\n• User ID: ${interaction.user.id}\n• Bot Status: ${userInfo.isBot ? 'Yes' : 'No'}`,
          inline: false
        },
        {
          name: '🎮 Presence & Activity Data',
          value: privacySettings.share_presence ? 
            (userInfo.presence ? 
              `✅ **Enabled**\n• Status: ${userInfo.presence.statusText || 'Unknown'}\n• Activity: ${userInfo.presence.currentGame || 'None'}\n• Custom Status: ${userInfo.presence.customStatus || 'None'}` :
              '✅ **Enabled** (No current activity)') :
            '❌ **Disabled** - Your presence data is private',
          inline: false
        },
        {
          name: '🏰 Server Information',
          value: privacySettings.share_server_info ? 
            (userInfo.serverName ? 
              `✅ **Enabled**\n• Server: ${userInfo.serverName}\n• Roles: ${userInfo.roles || 'None'}\n• Admin: ${userInfo.isAdmin ? 'Yes' : 'No'}\n• Owner: ${userInfo.isOwner ? 'Yes' : 'No'}` :
              '✅ **Enabled** (DM context)') :
            '❌ **Disabled** - Your server data is private',
          inline: false
        }
      ]);
    } else {
      const enabledFeatures = [];
      const disabledFeatures = [];
      
      if (privacySettings.share_presence) enabledFeatures.push('🎮 Presence & Activity');
      else disabledFeatures.push('🎮 Presence & Activity');
      
      if (privacySettings.share_server_info) enabledFeatures.push('🏰 Server Information');
      else disabledFeatures.push('🏰 Server Information');
      
      embed.addFields([
        {
          name: '📊 Always Accessible',
          value: '• **Basic Info**: Username, User ID\n• **Chat History**: Previous conversations with the bot\n• **API Keys**: Your encrypted personal API keys (if set)',
          inline: false
        },
        {
          name: '✅ Currently Shared',
          value: enabledFeatures.length > 0 ? enabledFeatures.join('\n• ') : 'None - Maximum privacy mode!',
          inline: true
        },
        {
          name: '❌ Private (Not Shared)',
          value: disabledFeatures.length > 0 ? disabledFeatures.join('\n• ') : 'None - All optional data is shared',
          inline: true
        }
      ]);
    }
    
    // Create action buttons
    const actionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('privacy_settings')
          .setLabel('⚙️ Change Settings')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('privacy_clear_data')
          .setLabel('🗑️ Clear Data')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('privacy_refresh')
          .setLabel('🔄 Refresh View')
          .setStyle(ButtonStyle.Secondary)
      );
    
    embed.addFields({
      name: '⚙️ Quick Actions',
      value: '• **Change Settings**: Modify your privacy preferences\n• **Clear Data**: Delete conversation history\n• **Refresh**: Update this view with current data',
      inline: false
    });
    
    embed.setFooter({ text: '🛡️ Your privacy is protected by default' })
         .setTimestamp();
    
    const response = await interaction.editReply({ 
      embeds: [embed], 
      components: [actionRow] 
    });

    // Handle button interactions
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300000 // 5 minutes
    });

    collector.on('collect', async (buttonInteraction) => {
      if (buttonInteraction.user.id !== interaction.user.id) {
        await buttonInteraction.reply({
          content: '❌ You can only manage your own privacy settings.',
          ephemeral: true
        });
        return;
      }

      await buttonInteraction.deferUpdate();

      switch (buttonInteraction.customId) {
        case 'privacy_settings':
          await showSettingsPanel(buttonInteraction);
          break;
        case 'privacy_clear_data':
          await showClearDataPanel(buttonInteraction);
          break;
        case 'privacy_refresh':
          await handleViewData(buttonInteraction);
          break;
      }
    });

    collector.on('end', async () => {
      // Disable buttons after timeout
      const disabledRow = new ActionRowBuilder()
        .addComponents(
          ...actionRow.components.map(button => 
            ButtonBuilder.from(button).setDisabled(true)
          )
        );
      
      try {
        await interaction.editReply({ components: [disabledRow] });
      } catch (error) {
        console.error('Error disabling privacy buttons:', error);
      }
    });
    
  } catch (error) {
    console.error('Error in privacy view:', error);
    await interaction.editReply({ 
      content: '❌ Error retrieving privacy information. Please try again later.',
      ephemeral: true 
    });
  }
}

async function handleInteractiveSettings(interaction) {
  try {
    const currentSettings = await getUserPrivacySettings(interaction.user.id);
    
    const embed = new EmbedBuilder()
      .setColor(0x9B59B6)
      .setTitle('⚙️ Privacy Settings Panel')
      .setDescription('Customize what data you share with the bot. Click the buttons below to toggle settings.')
      .addFields([
        {
          name: '🎮 Presence & Activity Sharing',
          value: currentSettings.share_presence ? 
            '✅ **Currently: ENABLED**\nBot can see your gaming status, activities, and online status' :
            '❌ **Currently: DISABLED** (Default)\nYour activities remain completely private',
          inline: false
        },
        {
          name: '🏰 Server Information Sharing',
          value: currentSettings.share_server_info ? 
            '✅ **Currently: ENABLED** (Default)\nBot can see your server roles and permissions for moderation' :
            '❌ **Currently: DISABLED**\nYour server data remains private',
          inline: false
        }
      ])
      .setFooter({ text: '🛡️ Changes are saved instantly' })
      .setTimestamp();

    // Create toggle buttons
    const settingsRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('toggle_presence')
          .setLabel(currentSettings.share_presence ? '🎮 Disable Presence' : '🎮 Enable Presence')
          .setStyle(currentSettings.share_presence ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('toggle_server_info')
          .setLabel(currentSettings.share_server_info ? '🏰 Disable Server Info' : '🏰 Enable Server Info')
          .setStyle(currentSettings.share_server_info ? ButtonStyle.Danger : ButtonStyle.Success)
      );

    // Create action buttons (removed privacy_view_data button)
    const actionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('privacy_reset_defaults')
          .setLabel('🔄 Reset to Defaults')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('privacy_close')
          .setLabel('✅ Done')
          .setStyle(ButtonStyle.Primary)
      );

    const response = await interaction.editReply({
      embeds: [embed],
      components: [settingsRow, actionRow]
    });

    // Handle button interactions
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 600000 // 10 minutes
    });

    collector.on('collect', async (buttonInteraction) => {
      if (buttonInteraction.user.id !== interaction.user.id) {
        await buttonInteraction.reply({
          content: '❌ You can only manage your own privacy settings.',
          ephemeral: true
        });
        return;
      }

      await buttonInteraction.deferUpdate();

      switch (buttonInteraction.customId) {
        case 'toggle_presence':
          await togglePrivacySetting(buttonInteraction, 'share_presence');
          break;
        case 'toggle_server_info':
          await togglePrivacySetting(buttonInteraction, 'share_server_info');
          break;
        case 'privacy_reset_defaults':
          await resetToDefaults(buttonInteraction);
          break;
        case 'privacy_close':
          await closePrivacyPanel(buttonInteraction);
          break;
      }
    });

    collector.on('end', async () => {
      try {
        const disabledComponents = [settingsRow, actionRow].map(row =>
          new ActionRowBuilder().addComponents(
            ...row.components.map(button => 
              ButtonBuilder.from(button).setDisabled(true)
            )
          )
        );
        await interaction.editReply({ components: disabledComponents });
      } catch (error) {
        console.error('Error disabling privacy settings buttons:', error);
      }
    });

  } catch (error) {
    console.error('Error in interactive settings:', error);
    await interaction.editReply({
      content: '❌ Error loading privacy settings. Please try again later.',
      ephemeral: true
    });
  }
}

async function togglePrivacySetting(interaction, settingName) {
  try {
    const currentSettings = await getUserPrivacySettings(interaction.user.id);
    const newValue = currentSettings[settingName] ? 0 : 1;
    
    const updates = {};
    updates[settingName] = newValue;
    
    await updateUserPrivacySettings(interaction.user.id, updates);
    
    // Refresh the settings panel
    await handleInteractiveSettings(interaction);
    
    // Show success message
    const settingDisplayName = settingName === 'share_presence' ? 'Presence Sharing' : 'Server Info Sharing';
    const statusText = newValue ? 'enabled' : 'disabled';
    
    await interaction.followUp({
      content: `✅ **${settingDisplayName}** has been **${statusText}**!`,
      ephemeral: true
    });
    
  } catch (error) {
    console.error('Error toggling privacy setting:', error);
    await interaction.followUp({
      content: '❌ Error updating privacy setting. Please try again.',
      ephemeral: true
    });
  }
}

async function resetToDefaults(interaction) {
  try {
    // Default settings: presence off, server info on
    const defaultSettings = {
      share_presence: 0,
      share_server_info: 1
    };
    
    await updateUserPrivacySettings(interaction.user.id, defaultSettings);
    
    // Refresh the panel
    await handleInteractiveSettings(interaction);
    
    await interaction.followUp({
      content: '✅ Privacy settings have been reset to secure defaults!\n• 🎮 **Presence sharing**: Disabled\n• 🏰 **Server info sharing**: Enabled',
      ephemeral: true
    });
    
  } catch (error) {
    console.error('Error resetting privacy settings:', error);
    await interaction.followUp({
      content: '❌ Error resetting privacy settings. Please try again.',
      ephemeral: true
    });
  }
}

async function closePrivacyPanel(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0x27AE60)
    .setTitle('✅ Privacy Settings Saved')
    .setDescription('Your privacy preferences have been updated successfully.')
    .addFields({
      name: '💡 Remember',
      value: '• Use `/privacy view` to see what data is accessible\n• Use `/clear` to delete conversation history\n• Your settings are saved automatically',
      inline: false
    })
    .setFooter({ text: 'You can change these settings anytime' })
    .setTimestamp();

  await interaction.editReply({
    embeds: [embed],
    components: []
  });
}

async function showClearDataPanel(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0xE74C3C)
    .setTitle('🗑️ Clear Your Data')
    .setDescription('Choose what data you want to delete:')
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
      },
      {
        name: '⚠️ Warning',
        value: 'This action cannot be undone!',
        inline: false
      }
    ]);

  const clearRow = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('clear_conversations')
        .setLabel('💬 Clear Conversations')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('clear_api_keys')
        .setLabel('🔐 Clear API Keys')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('clear_cancel')
        .setLabel('❌ Cancel')
        .setStyle(ButtonStyle.Secondary)
    );

  await interaction.editReply({
    embeds: [embed],
    components: [clearRow]
  });
}

async function handleDirectSettingsUpdate(interaction, { sharePresence, shareServerInfo }) {
  try {
    const updates = {};
    if (sharePresence !== null) updates.share_presence = sharePresence ? 1 : 0;
    if (shareServerInfo !== null) updates.share_server_info = shareServerInfo ? 1 : 0;
    
    await updateUserPrivacySettings(interaction.user.id, updates);
    
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('✅ Privacy Settings Updated')
      .setDescription('Your privacy preferences have been saved successfully.');

    const fields = [];
    if (sharePresence !== null) {
      fields.push({
        name: '🎮 Presence & Activity',
        value: sharePresence ? 
          '✅ **Enabled** - Bot can see your gaming status and activities' :
          '❌ **Disabled** - Your activities remain private',
        inline: false
      });
    }
    
    if (shareServerInfo !== null) {
      fields.push({
        name: '🏰 Server Information',
        value: shareServerInfo ? 
          '✅ **Enabled** - Bot can see your server roles and permissions' :
          '❌ **Disabled** - Your server data remains private',
        inline: false
      });
    }

    embed.addFields(fields);
    embed.setFooter({ text: 'You can change these settings anytime with /privacy settings' })
         .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    await interaction.editReply({ 
      content: '❌ Error updating privacy settings. Please try again later.',
      ephemeral: true 
    });
  }
}