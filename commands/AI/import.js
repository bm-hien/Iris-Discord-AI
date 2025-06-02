const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { setUserApiKey, setCustomSystemMessage } = require('../../AI/events/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('import')
    .setDescription('📥 Import your AI configuration from a JSON file')
    .addAttachmentOption(option => 
      option.setName('file')
        .setDescription('JSON configuration file')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('api_key')
        .setDescription('Your actual API key (if importing configuration with a key)')
        .setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const userId = interaction.user.id;
      const username = interaction.user.username;
      const attachment = interaction.options.getAttachment('file');
      const manualApiKey = interaction.options.getString('api_key');
      
      // Check file type
      if (!attachment.name.endsWith('.json')) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xFF0000)
              .setTitle('❌ Invalid File Format')
              .setDescription('Please upload a JSON file exported using the `/export format:json` command.')
              .setTimestamp()
          ]
        });
      }
      
      // Download the attachment
      const response = await fetch(attachment.url);
      if (!response.ok) {
        throw new Error(`Failed to download attachment: ${response.status} ${response.statusText}`);
      }
      
      const fileContent = await response.text();
      
      // Validate JSON format
      let configData;
      try {
        configData = JSON.parse(fileContent);
        
        // Basic validation
        if (!configData.version || !configData.user) {
          throw new Error('Invalid configuration format');
        }
      } catch (error) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xFF0000)
              .setTitle('❌ Invalid JSON Format')
              .setDescription(`Failed to parse the JSON file: ${error.message}`)
              .setTimestamp()
          ]
        });
      }
      
      // Process imports
      const importResults = {
        apiKey: false,
        customSystem: false
      };
      
      // Import API key if provided
      if (configData.apiKey && manualApiKey) {
        await setUserApiKey(userId, manualApiKey);
        // Set the model and provider if available
        if (configData.apiKey.provider || configData.apiKey.model || configData.apiKey.endpoint) {
          // You'd need to implement this function
          await updateUserApiKeySettings(userId, {
            provider: configData.apiKey.provider || 'gemini',
            model: configData.apiKey.model || 'gemini-2.0-flash',
            endpoint: configData.apiKey.endpoint || 'https://generativelanguage.googleapis.com/v1beta/openai/'
          });
        }
        importResults.apiKey = true;
      }
      
      // Import custom system message
      if (configData.customSystem && configData.customSystem.botName) {
        await setCustomSystemMessage(
          userId, 
          configData.customSystem.botName,
          configData.customSystem.personality || ''
        );
        importResults.customSystem = true;
      }
      
      // Create success response
      const importEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Configuration Imported')
        .setDescription('Your AI configuration has been imported successfully.')
        .addFields([
          {
            name: '📊 Import Results',
            value: `API Key: ${importResults.apiKey ? '✅ Imported' : '❌ Not imported (missing key)'}\nCustom Personality: ${importResults.customSystem ? '✅ Imported' : '❌ Not found in file'}`,
            inline: false
          },
          {
            name: '🚀 Next Steps',
            value: 'Your imported configuration is now active. Try interacting with the AI to see your changes!',
            inline: false
          }
        ])
        .setTimestamp()
        .setFooter({ text: `Requested by ${username}` });
      
      return interaction.editReply({
        embeds: [importEmbed]
      });

    } catch (error) {
      console.error('Error in import command:', error);
      
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ Import Error')
            .setDescription(`An error occurred during import: ${error.message}`)
            .setTimestamp()
        ]
      });
    }
  },
};

// Helper function to update API key settings
async function updateUserApiKeySettings(userId, settings) {
  // You would need to implement this function in your database.js
  // This is just a placeholder
  return true;
}