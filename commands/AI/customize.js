const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { setCustomSystemMessage, getCustomSystemMessage, removeCustomSystemMessage, clearConversationHistory } = require('../../AI/events/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('customize')
    .setDescription('Customize your AI assistant')
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Set your custom AI personality')
        .addStringOption(option =>
          option.setName('name')
            .setDescription('Set a custom name for your AI assistant')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('personality')
            .setDescription('Describe the personality of your AI assistant')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View your current customizations'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('reset')
        .setDescription('Reset to default AI personality')),
  
  execute: async (interaction) => {
    await interaction.deferReply({ ephemeral: true });
    
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'set') {
      const botName = interaction.options.getString('name');
      const personality = interaction.options.getString('personality');
      
      try {
        // Get current settings to check if this is a change
        const currentSettings = await getCustomSystemMessage(interaction.user.id);
        const isNewCustomization = !currentSettings || 
                                  currentSettings.bot_name !== botName || 
                                  currentSettings.personality !== personality;
        
        // Save the new customization
        await setCustomSystemMessage(interaction.user.id, botName, personality);
        
        // Clear conversation history if settings changed
        if (isNewCustomization) {
          await clearConversationHistory(interaction.user.id);
        }
        
        const embed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('✅ AI Customized Successfully')
          .setDescription('Your AI assistant has been customized to your preferences.')
          .addFields(
            { name: 'Name', value: botName, inline: true },
            { name: 'Personality', value: personality, inline: false }
          )
          .setFooter({ text: 'Your chat history has been reset for a fresh start' })
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed], ephemeral: true });
      } catch (error) {
        console.error('Error setting custom system message:', error);
        await interaction.editReply({ content: 'There was an error saving your customizations. Please try again later.', ephemeral: true });
      }
    } 
    else if (subcommand === 'view') {
      // Existing view code...
      try {
        const customSettings = await getCustomSystemMessage(interaction.user.id);
        
        if (!customSettings) {
          await interaction.editReply({ content: 'You have no custom settings. The bot is using its default personality.', ephemeral: true });
          return;
        }
        
        const embed = new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle('🤖 Your AI Assistant Customizations')
          .addFields(
            { name: 'Name', value: customSettings.bot_name, inline: true },
            { name: 'Personality', value: customSettings.personality, inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed], ephemeral: true });
      } catch (error) {
        console.error('Error getting custom system message:', error);
        await interaction.editReply({ content: 'There was an error retrieving your customizations.', ephemeral: true });
      }
    }
    else if (subcommand === 'reset') {
      try {
        const removed = await removeCustomSystemMessage(interaction.user.id);
        
        // Also clear conversation history when resetting
        if (removed) {
          await clearConversationHistory(interaction.user.id);
        }
        
        const embed = new EmbedBuilder()
          .setColor(removed ? 0x00FF00 : 0xFFAA00)
          .setTitle(removed ? '✅ Customizations Reset' : 'ℹ️ No Customizations Found')
          .setDescription(removed 
            ? 'Your AI assistant has been reset to its default personality. Chat history has been cleared.' 
            : 'You don\'t have any custom settings to reset.')
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed], ephemeral: true });
      } catch (error) {
        console.error('Error removing custom system message:', error);
        await interaction.editReply({ content: 'There was an error resetting your customizations.', ephemeral: true });
      }
    }
  },
};