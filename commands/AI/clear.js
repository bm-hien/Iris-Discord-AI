const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { clearConversationHistory } = require('../../AI/events/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Reset your chat history with the AI assistant'),
  
  execute: async (interaction) => {
    await interaction.deferReply({ ephemeral: true });
    
    try {
      const clearedCount = await clearConversationHistory(interaction.user.id);
      
      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Chat History Reset')
        .setDescription(clearedCount > 0 
          ? 'Your chat history with the AI assistant has been successfully reset. Your next conversation will start fresh.'
          : 'You had no chat history to reset. Your next conversation will start fresh.')
        .setTimestamp()
        .setFooter({ text: 'AI Assistant' });
      
      await interaction.editReply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('Error resetting chat history:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Error')
        .setDescription('There was an error resetting your chat history. Please try again later.')
        .setTimestamp();
      
      await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};