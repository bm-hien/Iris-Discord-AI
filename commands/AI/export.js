const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getUserApiKey, getCustomSystemMessage } = require('../../AI/events/database');
const path = require('path');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('export')
    .setDescription('📤 Export your AI configuration and API keys as a file')
    .addStringOption(option =>
      option.setName('format')
        .setDescription('Export format')
        .setRequired(false)
        .addChoices(
          { name: 'JSON (Default)', value: 'json' },
          { name: 'Text File', value: 'txt' }
        )
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const userId = interaction.user.id;
      const username = interaction.user.username;
      const format = interaction.options.getString('format') || 'json';

      // Get user's configurations
      const [apiKeyInfo, customSystem] = await Promise.all([
        getUserApiKey(userId),
        getCustomSystemMessage(userId)
      ]);

      if (!apiKeyInfo && !customSystem) {
        const noConfigEmbed = new EmbedBuilder()
          .setColor(0x3498DB)
          .setTitle('📤 Export Configuration')
          .setDescription("You don't have any custom configurations to export. Set up API keys or custom personalities first!")
          .setTimestamp();
        
        return interaction.editReply({ embeds: [noConfigEmbed], ephemeral: true });
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

      // Format data based on selected export format
      let fileContent;
      let fileName;
      let fileDescription;

      switch (format) {
        case 'txt':
          fileContent = `# Iris AI Configuration Export
User: ${username} (${userId})
Exported: ${new Date().toLocaleString()}

## API Key Configuration
Provider: ${apiKeyInfo?.provider || 'Not set'}
Model: ${apiKeyInfo?.model || 'Default'}
Endpoint: ${apiKeyInfo?.endpoint || 'Default'}
API Key: ${apiKeyInfo ? 'Set (masked for security)' : 'Not set'}

## Custom System Configuration
Bot Name: ${customSystem?.bot_name || 'Iris (Default)'}
Custom Personality: ${customSystem?.personality ? 'Set' : 'Not set'}

Note: This file contains your configuration settings but not the actual API keys.
To import these settings, use the /import command with a proper JSON export file.`;

          fileName = `iris_config_${username}_${Date.now()}.txt`;
          fileDescription = 'text';
          break;

        case 'json':
        default:
          fileContent = JSON.stringify(configData, null, 2);
          fileName = `iris_config_${username}_${Date.now()}.json`;
          fileDescription = 'JSON';
          break;
      }

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
        .setColor(0x3498DB)
        .setTitle('📤 Configuration Export')
        .setDescription(`Your AI configurations have been exported as a ${fileDescription} file.`)
        .addFields([
          { name: '🔑 Includes', value: `${apiKeyInfo ? '✓ API Key Configuration\n' : ''}${customSystem ? '✓ Custom Personality Settings\n' : ''}`, inline: false },
          { name: '🔒 Security Note', value: 'For security, actual API keys are masked in the export. To fully transfer settings, use `/import` with separate key entry.', inline: false },
          { name: '💡 Usage', value: 'This export can be used as a backup or to transfer settings to another account.', inline: false }
        ])
        .setTimestamp()
        .setFooter({ text: `Requested by ${username}` });

      // Send response with file
      await interaction.editReply({
        embeds: [exportEmbed],
        files: [attachment],
        ephemeral: true
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
      console.error('Error in export command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Error')
        .setDescription('There was an error exporting your configuration. Please try again later.')
        .setTimestamp();
      
      await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};