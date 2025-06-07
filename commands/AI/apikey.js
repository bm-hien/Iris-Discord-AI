const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { setUserApiKey, removeUserApiKey, getUserApiKey, setUserProvider } = require('../../AI/events/database');
const { OpenAI } = require("openai");
const { GoogleGenAI } = require("@google/genai");

module.exports = {
  data: new SlashCommandBuilder()
    .setName('apikey')
    .setDescription('Manage your personal API key for different AI providers')
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Set your personal API key')
        .addStringOption(option =>
          option.setName('key')
            .setDescription('Your API key (Gemini: AIza..., Groq: gsk_..., OpenAI: sk-...)')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove your personal API key'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('check')
        .setDescription('Check if your API key is valid and working')),
  
  execute: async (interaction) => {
    await interaction.deferReply({ ephemeral: true });
    
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'set') {
      const apiKey = interaction.options.getString('key');
      
      // Detect API key type and validate format
      let keyType = 'unknown';
      let providerId = 'custom';
      let endpoint = 'https://api.openai.com/v1';
      let isValidFormat = false;
      
      if (apiKey.startsWith('AIza')) {
        // Gemini API key
        keyType = 'Gemini';
        providerId = 'gemini';
        endpoint = 'https://generativelanguage.googleapis.com/v1beta/openai/';
        isValidFormat = /^AIza[0-9A-Za-z_-]{35}$/.test(apiKey);
      } else if (apiKey.startsWith('gsk_')) {
        // Groq API key
        keyType = 'Groq';
        providerId = 'groq';
        endpoint = 'https://api.groq.com/openai/v1';
        isValidFormat = /^gsk_[0-9A-Za-z_-]{48,}$/.test(apiKey);
      } else if (apiKey.startsWith('sk-')) {
        // OpenAI API key
        keyType = 'OpenAI';
        providerId = 'openai';
        endpoint = 'https://api.openai.com/v1';
        isValidFormat = /^sk-[0-9A-Za-z_-]{48,}$/.test(apiKey);
      } else {
        // Try to be more flexible for other providers
        keyType = 'Custom';
        providerId = 'custom';
        endpoint = 'https://api.openai.com/v1';
        isValidFormat = apiKey.length >= 20; // Basic length check
      }
      
      if (!isValidFormat) {
        const errorEmbed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('❌ Invalid API Key Format')
          .setDescription(`The API key you provided doesn't appear to be in the correct format for ${keyType}.`)
          .addFields(
            { name: 'Expected Formats', value: '• **Gemini**: `AIza...` (39 characters)\n• **Groq**: `gsk_...` (52+ characters)\n• **OpenAI**: `sk-...` (51+ characters)', inline: false },
            { name: 'Detected Type', value: keyType, inline: true }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
        return;
      }
      
      try {
        // Set the API key first
        await setUserApiKey(interaction.user.id, apiKey);
        
        // Automatically set the provider based on the API key type
        await setUserProvider(interaction.user.id, providerId, endpoint);
        
        const embed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('✅ API Key & Provider Set Successfully')
          .setDescription(`Your personal ${keyType} API key has been encrypted and stored securely.`)
          .addFields(
            { name: 'Provider Auto-Set', value: `🔧 ${keyType}`, inline: true },
            { name: 'Endpoint', value: endpoint, inline: true },
            { name: 'Security', value: '🔒 ChaCha20-Poly1305 Encrypted', inline: true },
            { name: 'Key Preview', value: `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`, inline: false },
            { name: 'What happened?', value: `• Your API key was encrypted and saved securely\n• Provider was automatically set to **${keyType}**\n• Endpoint was configured for optimal performance\n• All data is protected with military-grade encryption`, inline: false },
            { name: 'Next Steps', value: '• Use `/apikey check` to verify your API key is working\n• Use `/model set` to choose your preferred model\n• Use `/provider check` to view your current provider settings' }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed], ephemeral: true });
      } catch (error) {
        console.error('Error setting API key and provider:', error);
        
        // Try to set just the API key if provider setting fails
        try {
          await setUserApiKey(interaction.user.id, apiKey);
          
          const warningEmbed = new EmbedBuilder()
            .setColor(0xFFAA00)
            .setTitle('⚠️ API Key Set, Provider Update Failed')
            .setDescription(`Your ${keyType} API key was saved, but we couldn't automatically update your provider.`)
            .addFields(
              { name: 'What to do next', value: `Please manually set your provider using \`/provider set\` and select **${keyType}**.` },
              { name: 'Key Preview', value: `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` }
            )
            .setTimestamp();
          
          await interaction.editReply({ embeds: [warningEmbed], ephemeral: true });
        } catch (keyError) {
          console.error('Error setting API key:', keyError);
          await interaction.editReply({ content: 'There was an error saving your API key. Please try again later.', ephemeral: true });
        }
      }
    } else if (subcommand === 'remove') {
      try {
        const removed = await removeUserApiKey(interaction.user.id);
        
        const embed = new EmbedBuilder()
          .setColor(removed ? 0x00FF00 : 0xFFAA00)
          .setTitle(removed ? '✅ API Key Removed' : 'ℹ️ No API Key Found')
          .setDescription(removed 
            ? 'Your personal API key and provider settings have been removed. The bot will now use the default API key for your requests.' 
            : 'You don\'t have a personal API key set.')
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed], ephemeral: true });
      } catch (error) {
        console.error('Error removing API key:', error);
        await interaction.editReply({ content: 'There was an error removing your API key. Please try again later.', ephemeral: true });
      }
    } else if (subcommand === 'check') {
      try {
        // Get the user's API key
        const apiKey = await getUserApiKey(interaction.user.id);
        
        if (!apiKey) {
          const embed = new EmbedBuilder()
            .setColor(0xFFAA00)
            .setTitle('ℹ️ No API Key Found')
            .setDescription('You don\'t have a personal API key set. The bot is using the default API key.')
            .setTimestamp();
          
          await interaction.editReply({ embeds: [embed], ephemeral: true });
          return;
        }
        
        // Detect the API key type and test with appropriate service
        let keyType = 'unknown';
        let responseText = '';
        let testSuccessful = false;
        
        try {
          if (apiKey.startsWith('AIza')) {
            // Test Gemini API key
            keyType = 'Gemini';
            const ai = new GoogleGenAI({ apiKey });
            
            const result = await ai.models.generateContent({
              model: "gemini-2.0-flash",
              contents: "Say 'API key is working!'"
            });
            
            responseText = result.text;
            testSuccessful = true;
            
          } else if (apiKey.startsWith('gsk_')) {
            // Test Groq API key
            keyType = 'Groq';
            const openai = new OpenAI({
              apiKey: apiKey,
              baseURL: "https://api.groq.com/openai/v1",
            });
            
            const testResponse = await openai.chat.completions.create({
              model: "llama-3.1-8b-instant",
              messages: [{ role: "user", content: "Say 'API key is working!'" }],
              max_tokens: 20
            });
            
            responseText = testResponse.choices[0].message.content;
            testSuccessful = true;
            
          } else if (apiKey.startsWith('sk-')) {
            // Test OpenAI API key
            keyType = 'OpenAI';
            const openai = new OpenAI({
              apiKey: apiKey,
              baseURL: "https://api.openai.com/v1",
            });
            
            const testResponse = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: "Say 'API key is working!'" }],
              max_tokens: 20
            });
            
            responseText = testResponse.choices[0].message.content;
            testSuccessful = true;
            
          } else {
            // Unknown key type
            keyType = 'Custom/Unknown';
            responseText = 'Cannot test unknown API key format automatically.';
          }
          
        } catch (error) {
          console.error('Error testing API key:', error);
          
          // Create a more helpful error message based on the error
          let errorTitle = '❌ API Key Error';
          let errorDescription = 'Your API key could not be verified.';
          let errorDetails = 'There was an error testing your API key.';
          
          // Handle different types of errors
          if (error.status === 401 || error.status === 403) {
            errorTitle = '❌ Invalid API Key';
            errorDescription = `Your ${keyType} API key is invalid or doesn't have permission.`;
            errorDetails = `Make sure you've enabled the appropriate API and your ${keyType} key has the right permissions.`;
          } else if (error.status === 429) {
            errorTitle = '❌ Rate Limited';
            errorDescription = `Your ${keyType} API key is rate limited or has reached its quota.`;
            errorDetails = 'Try again later or check your usage quota.';
          } else if (error.message?.includes('Network')) {
            errorTitle = '❌ Network Error';
            errorDescription = `Could not connect to the ${keyType} API.`;
            errorDetails = 'Check your internet connection or try again later.';
          } else if (keyType === 'Gemini' && error.message?.includes('API_KEY_INVALID')) {
            errorTitle = '❌ Invalid Gemini API Key';
            errorDescription = 'Your Gemini API key is invalid.';
            errorDetails = 'Make sure you\'ve copied the correct API key from Google AI Studio.';
          }
          
          const errorEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle(errorTitle)
            .setDescription(errorDescription)
            .addFields(
              { name: 'Provider', value: keyType, inline: true },
              { name: 'API Key', value: `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`, inline: true },
              { name: 'Error Details', value: errorDetails },
              { name: 'Next Steps', value: 'Try setting a new API key with `/apikey set` or remove it with `/apikey remove`.' }
            )
            .setTimestamp();
          
          await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
          return;
        }
        
        if (testSuccessful) {
          const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ API Key Verified')
            .setDescription(`Your ${keyType} API key is valid and working correctly!`)
            .addFields(
              { name: 'Provider', value: keyType, inline: true },
              { name: 'Security', value: '🔒 Encrypted Storage', inline: true },
              { name: 'API Key', value: `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`, inline: false },
              { name: 'Test Response', value: responseText.substring(0, 100) + (responseText.length > 100 ? '...' : '') },
              { name: 'Status', value: '✅ All systems operational' }
            )
            .setTimestamp();
          
          await interaction.editReply({ embeds: [embed], ephemeral: true });
        } else {
          const embed = new EmbedBuilder()
            .setColor(0xFFAA00)
            .setTitle('⚠️ Cannot Test API Key')
            .setDescription(`Your ${keyType} API key was saved but cannot be automatically tested.`)
            .addFields(
              { name: 'Provider', value: keyType, inline: true },
              { name: 'API Key', value: `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`, inline: true },
              { name: 'Note', value: 'Please make sure to set the correct provider with `/provider set` or `/provider endpoint`.' }
            )
            .setTimestamp();
          
          await interaction.editReply({ embeds: [embed], ephemeral: true });
        }
        
      } catch (error) {
        console.error('Error checking API key:', error);
        
        const errorEmbed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('❌ Error Checking API Key')
          .setDescription('There was an error while checking your API key.')
          .addFields(
            { name: 'Error Details', value: 'An unexpected error occurred while testing your API key.' },
            { name: 'Next Steps', value: 'Try again later or contact support if the problem persists.' }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  },
};