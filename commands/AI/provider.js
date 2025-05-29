const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { getUserApiKey, setUserProvider, getUserProvider, addCustomProvider, getUserCustomProviders, removeCustomProvider } = require('../../AI/events/database');
const { OpenAI } = require("openai");

// Available providers information
const AVAILABLE_PROVIDERS = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Google\'s latest AI model with excellent reasoning capabilities',
    emoji: '🤖',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    keyFormat: 'AIza...',
    defaultModel: 'gemini-2.0-flash'
  },
  {
    id: 'groq',
    name: 'Groq',
    description: 'Ultra-fast inference with Llama and Mixtral models',
    emoji: '⚡',
    endpoint: 'https://api.groq.com/openai/v1',
    keyFormat: 'gsk_...',
    defaultModel: 'llama-3.3-70b-versatile'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'ChatGPT and GPT models from OpenAI',
    emoji: '🧠',
    endpoint: 'https://api.openai.com/v1',
    keyFormat: 'sk-...',
    defaultModel: 'gpt-4o-mini'
  }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('provider')
    .setDescription('Manage your AI provider settings')
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Choose which AI provider to use'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all available AI providers'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('check')
        .setDescription('Check your current AI provider'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('endpoint')
        .setDescription('Set a custom endpoint for your provider')
        .addStringOption(option =>
          option.setName('url')
            .setDescription('The custom endpoint URL (OpenAI-compatible)')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Setup a new custom AI provider'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('custom')
        .setDescription('Manage your custom providers')
        .addStringOption(option =>
          option.setName('action')
            .setDescription('Action to perform')
            .setRequired(true)
            .addChoices(
              { name: 'List custom providers', value: 'list' },
              { name: 'Remove custom provider', value: 'remove' },
              { name: 'Test custom provider', value: 'test' }
            ))
        .addStringOption(option =>
          option.setName('name')
            .setDescription('Name of the custom provider (for remove/test actions)')
            .setRequired(false))),
  
  execute: async (interaction) => {
    // Handle modal submission for custom provider setup
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'custom_provider_modal') {
        await interaction.deferReply({ ephemeral: true });
        
        const name = interaction.fields.getTextInputValue('provider_name');
        const endpoint = interaction.fields.getTextInputValue('provider_endpoint');
        const defaultModel = interaction.fields.getTextInputValue('provider_model');
        const description = interaction.fields.getTextInputValue('provider_description') || 'Custom provider';
        const authHeader = interaction.fields.getTextInputValue('provider_auth_header') || 'Bearer';
        
        try {
          // Validate URL
          new URL(endpoint);
          
          // Check if provider name already exists
          const existingProviders = await getUserCustomProviders(interaction.user.id);
          if (existingProviders.some(p => p.name.toLowerCase() === name.toLowerCase())) {
            const errorEmbed = new EmbedBuilder()
              .setColor(0xFF0000)
              .setTitle('❌ Provider Name Already Exists')
              .setDescription(`You already have a custom provider named "${name}". Please choose a different name.`)
              .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
            return;
          }
          
          // Test the custom provider
          const apiKey = await getUserApiKey(interaction.user.id);
          if (!apiKey) {
            const errorEmbed = new EmbedBuilder()
              .setColor(0xFF0000)
              .setTitle('❌ API Key Required')
              .setDescription('You need to set an API key first using `/apikey set`.')
              .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
            return;
          }
          
          // Test the provider
          const openai = new OpenAI({
            apiKey: apiKey,
            baseURL: endpoint,
          });
          
          const testResponse = await openai.chat.completions.create({
            model: defaultModel,
            messages: [{ role: "user", content: "Say 'Test successful' in Vietnamese" }],
            max_tokens: 20
          });
          
          // Save the custom provider
          await addCustomProvider(interaction.user.id, name, endpoint, defaultModel, description, authHeader);
          
          const successEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Custom Provider Added Successfully')
            .setDescription(`Your custom provider "${name}" has been added and tested successfully!`)
            .addFields(
              { name: 'Provider Name', value: name, inline: true },
              { name: 'Endpoint', value: endpoint, inline: true },
              { name: 'Default Model', value: defaultModel, inline: true },
              { name: 'Description', value: description, inline: false },
              { name: 'Auth Header', value: authHeader, inline: true },
              { name: 'Test Response', value: testResponse.choices[0].message.content || 'No response' }
            )
            .setFooter({ text: 'Use /provider set to switch to this provider' })
            .setTimestamp();
          
          await interaction.editReply({ embeds: [successEmbed], ephemeral: true });
        } catch (error) {
          console.error('Error setting up custom provider:', error);
          
          let errorMessage = 'There was an error setting up your custom provider.';
          
          if (error.message.includes('Invalid URL')) {
            errorMessage = 'The endpoint URL you provided is not valid.';
          } else if (error.status === 401 || error.status === 403) {
            errorMessage = 'Your API key doesn\'t have access to this provider/model.';
          } else if (error.status === 404) {
            errorMessage = 'The model or endpoint was not found. Please check your settings.';
          }
          
          const errorEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ Setup Failed')
            .setDescription(errorMessage)
            .addFields(
              { name: 'Error Details', value: error.message || 'Unknown error' }
            )
            .setTimestamp();
          
          await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
        }
        return;
      }
    }
    
    await interaction.deferReply({ ephemeral: true });
    
    const subcommand = interaction.options.getSubcommand();
    
    // First check if the user has an API key for most subcommands
    const apiKey = await getUserApiKey(interaction.user.id);
    
    if (!apiKey && !['list'].includes(subcommand)) {
      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ API Key Required')
        .setDescription('You need to set a personal API key with `/apikey set` before you can manage providers.')
        .addFields(
          { name: 'Why do I need an API key?', value: 'Provider selection is only available for users with their own API keys.' }
        )
        .setTimestamp();
      
      await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
      return;
    }
    
    if (subcommand === 'set') {
      // Get user's custom providers
      const customProviders = await getUserCustomProviders(interaction.user.id);
      
      // Combine default and custom providers
      const allProviders = [
        ...AVAILABLE_PROVIDERS,
        ...customProviders.map(cp => ({
          id: `custom_${cp.name}`,
          name: `${cp.name} (Custom)`,
          description: cp.description,
          emoji: '🔧',
          endpoint: cp.endpoint,
          keyFormat: 'varies',
          defaultModel: cp.default_model
        }))
      ];
      
      // Create a select menu for provider selection
      const select = new StringSelectMenuBuilder()
        .setCustomId('provider_select')
        .setPlaceholder('Select an AI provider')
        .addOptions(
          allProviders.map(provider => 
            new StringSelectMenuOptionBuilder()
              .setLabel(provider.name)
              .setDescription(provider.description.substring(0, 100))
              .setValue(provider.id)
              .setEmoji(provider.emoji)
          )
        );
      
      const row = new ActionRowBuilder().addComponents(select);
      
      const currentProvider = await getUserProvider(interaction.user.id) || 'gemini';
      const currentProviderInfo = allProviders.find(p => p.id === currentProvider);
      
      const selectionEmbed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('🔧 Select AI Provider')
        .setDescription('Choose which AI provider you want to use for your interactions.')
        .addFields(
          { name: 'Current Provider', value: `${currentProviderInfo?.emoji || '🤖'} ${currentProviderInfo?.name || currentProvider}`, inline: false },
          { name: 'Available Options', value: `${AVAILABLE_PROVIDERS.length} built-in providers + ${customProviders.length} custom providers` },
          { name: 'Note', value: 'Different providers have different models and capabilities. Make sure your API key is compatible with the selected provider.' }
        )
        .setTimestamp();
      
      const response = await interaction.editReply({
        embeds: [selectionEmbed],
        components: [row],
        ephemeral: true
      });
      
      // Create a collector for the selection
      const collector = response.createMessageComponentCollector({ 
        time: 60000, // 1 minute timeout
        max: 1 // Only collect one interaction
      });
      
      collector.on('collect', async i => {
        const selectedProviderId = i.values[0];
        
        try {
          let endpoint;
          let providerName;
          
          if (selectedProviderId.startsWith('custom_')) {
            // Handle custom provider
            const customName = selectedProviderId.replace('custom_', '');
            const customProvider = customProviders.find(cp => cp.name === customName);
            
            if (!customProvider) {
              throw new Error('Custom provider not found');
            }
            
            endpoint = customProvider.endpoint;
            providerName = customProvider.name;
            
            await setUserProvider(interaction.user.id, selectedProviderId, endpoint);
          } else {
            // Handle default provider
            const selectedProvider = AVAILABLE_PROVIDERS.find(p => p.id === selectedProviderId);
            
            if (!selectedProvider) {
              throw new Error('Provider not found');
            }
            
            endpoint = selectedProvider.endpoint;
            providerName = selectedProvider.name;
            
            await setUserProvider(interaction.user.id, selectedProviderId, endpoint);
          }
          
          const successEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Provider Updated Successfully')
            .setDescription(`You are now using **${providerName}**`)
            .addFields(
              { name: 'Endpoint', value: endpoint },
              { name: 'Provider ID', value: selectedProviderId }
            )
            .setTimestamp();
          
          await i.update({ embeds: [successEmbed], components: [] });
        } catch (error) {
          console.error('Error setting provider:', error);
          
          const errorEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ Provider Selection Failed')
            .setDescription('Could not set the selected provider.')
            .addFields(
              { name: 'Error Details', value: error.message || 'Unknown error' }
            )
            .setTimestamp();
          
          await i.update({ embeds: [errorEmbed], components: [] });
        }
      });
      
      collector.on('end', async (collected) => {
        if (collected.size === 0) {
          const timeoutEmbed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('⏱️ Selection Timed Out')
            .setDescription('You did not make a selection in time. Your provider preference has not been changed.')
            .setTimestamp();
          
          await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
        }
      });
    }
    else if (subcommand === 'setup') {
      // Show modal for custom provider setup
      const modal = new ModalBuilder()
        .setCustomId('custom_provider_modal')
        .setTitle('Setup Custom AI Provider');

      const nameInput = new TextInputBuilder()
        .setCustomId('provider_name')
        .setLabel('Provider Name')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., MyCustomAI')
        .setRequired(true)
        .setMaxLength(50);

      const endpointInput = new TextInputBuilder()
        .setCustomId('provider_endpoint')
        .setLabel('API Endpoint')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('https://api.example.com/v1')
        .setRequired(true)
        .setMaxLength(200);

      const modelInput = new TextInputBuilder()
        .setCustomId('provider_model')
        .setLabel('Default Model')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('gpt-3.5-turbo')
        .setRequired(true)
        .setMaxLength(100);

      const descriptionInput = new TextInputBuilder()
        .setCustomId('provider_description')
        .setLabel('Description (Optional)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('A brief description of this provider...')
        .setRequired(false)
        .setMaxLength(500);

      const authHeaderInput = new TextInputBuilder()
        .setCustomId('provider_auth_header')
        .setLabel('Authorization Header (Optional)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Bearer or Authorization (leave empty for default)')
        .setRequired(false)
        .setMaxLength(50);

      const firstActionRow = new ActionRowBuilder().addComponents(nameInput);
      const secondActionRow = new ActionRowBuilder().addComponents(endpointInput);
      const thirdActionRow = new ActionRowBuilder().addComponents(modelInput);
      const fourthActionRow = new ActionRowBuilder().addComponents(descriptionInput);
      const fifthActionRow = new ActionRowBuilder().addComponents(authHeaderInput);

      modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow, fifthActionRow);

      await interaction.showModal(modal);
      return;
    }
    else if (subcommand === 'custom') {
      const action = interaction.options.getString('action');
      const name = interaction.options.getString('name');
      
      if (action === 'list') {
        const customProviders = await getUserCustomProviders(interaction.user.id);
        
        if (customProviders.length === 0) {
          const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('📋 Your Custom Providers')
            .setDescription('You haven\'t set up any custom providers yet.')
            .addFields(
              { name: 'Get Started', value: 'Use `/provider setup` to add your first custom provider!' }
            )
            .setTimestamp();
          
          await interaction.editReply({ embeds: [embed], ephemeral: true });
          return;
        }

        const embed = new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle('📋 Your Custom Providers')
          .setDescription(`You have ${customProviders.length} custom provider(s) configured:`)
          .setTimestamp();

        customProviders.forEach((provider, index) => {
          embed.addFields({
            name: `${index + 1}. 🔧 ${provider.name}`,
            value: `**Endpoint:** \`${provider.endpoint}\`\n**Default Model:** \`${provider.default_model}\`\n**Description:** ${provider.description || 'No description'}\n**Auth:** ${provider.auth_header || 'Bearer'}`,
            inline: false
          });
        });

        embed.setFooter({ text: 'Use /provider custom action:test/remove to manage' });

        await interaction.editReply({ embeds: [embed], ephemeral: true });
      }
      else if (action === 'remove') {
        if (!name) {
          const errorEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ Provider Name Required')
            .setDescription('Please provide the name of the custom provider to remove.')
            .setTimestamp();
          
          await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
          return;
        }
        
        try {
          const removed = await removeCustomProvider(interaction.user.id, name);
          
          const embed = new EmbedBuilder()
            .setColor(removed ? 0x00FF00 : 0xFFAA00)
            .setTitle(removed ? '✅ Provider Removed' : 'ℹ️ Provider Not Found')
            .setDescription(removed 
              ? `Custom provider "${name}" has been removed successfully.`
              : `No custom provider named "${name}" was found.`)
            .setTimestamp();
          
          await interaction.editReply({ embeds: [embed], ephemeral: true });
        } catch (error) {
          console.error('Error removing custom provider:', error);
          
          const errorEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ Error')
            .setDescription('There was an error removing the custom provider.')
            .setTimestamp();
          
          await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
        }
      }
      else if (action === 'test') {
        if (!name) {
          const errorEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ Provider Name Required')
            .setDescription('Please provide the name of the custom provider to test.')
            .setTimestamp();
          
          await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
          return;
        }
        
        try {
          const customProviders = await getUserCustomProviders(interaction.user.id);
          const provider = customProviders.find(p => p.name === name);
          
          if (!provider) {
            const embed = new EmbedBuilder()
              .setColor(0xFF0000)
              .setTitle('❌ Provider Not Found')
              .setDescription(`No custom provider named "${name}" was found.`)
              .setTimestamp();
            
            await interaction.editReply({ embeds: [embed], ephemeral: true });
            return;
          }

          // Test the provider
          const openai = new OpenAI({
            apiKey: apiKey,
            baseURL: provider.endpoint,
          });

          const testResponse = await openai.chat.completions.create({
            model: provider.default_model,
            messages: [{ role: "user", content: "Say 'Test successful' in Vietnamese" }],
            max_tokens: 20
          });

          const successEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Provider Test Successful')
            .setDescription(`Custom provider "${name}" is working correctly!`)
            .addFields(
              { name: 'Provider', value: provider.name, inline: true },
              { name: 'Model', value: provider.default_model, inline: true },
              { name: 'Endpoint', value: provider.endpoint, inline: false },
              { name: 'Test Response', value: testResponse.choices[0].message.content || 'No response' }
            )
            .setTimestamp();
          
          await interaction.editReply({ embeds: [successEmbed], ephemeral: true });
        } catch (error) {
          console.error('Error testing custom provider:', error);
          
          let errorMessage = 'The custom provider test failed.';
          
          if (error.status === 401 || error.status === 403) {
            errorMessage = 'Your API key doesn\'t have access to this provider/model.';
          } else if (error.status === 404) {
            errorMessage = 'The model or endpoint was not found.';
          } else if (error.status === 429) {
            errorMessage = 'Rate limit exceeded. Try again later.';
          }
          
          const errorEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ Provider Test Failed')
            .setDescription(errorMessage)
            .addFields(
              { name: 'Error Details', value: error.message || 'Unknown error' }
            )
            .setTimestamp();
          
          await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
        }
      }
    }
    else if (subcommand === 'list') {
      const customProviders = await getUserCustomProviders(interaction.user.id);
      
      const providersEmbed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('🔧 Available AI Providers')
        .setDescription('Here are the AI providers you can choose from:')
        .addFields(
          AVAILABLE_PROVIDERS.map(provider => ({
            name: `${provider.emoji} ${provider.name}`,
            value: `${provider.description}\n**Endpoint:** \`${provider.endpoint}\`\n**Key Format:** \`${provider.keyFormat}\`\n**Default Model:** \`${provider.defaultModel}\``,
            inline: false
          }))
        )
        .setTimestamp();
      
      if (customProviders.length > 0) {
        providersEmbed.addFields({
          name: '🔧 Your Custom Providers',
          value: customProviders.map(cp => `• **${cp.name}**: ${cp.description}`).join('\n') || 'None',
          inline: false
        });
      }
      
      providersEmbed.setFooter({ text: 'Use /provider set to change • /provider setup to add custom' });
      
      await interaction.editReply({ embeds: [providersEmbed], ephemeral: true });
    }
    else if (subcommand === 'check') {
      const currentProvider = await getUserProvider(interaction.user.id) || 'gemini';
      const customProviders = await getUserCustomProviders(interaction.user.id);
      
      let providerInfo;
      
      if (currentProvider.startsWith('custom_')) {
        const customName = currentProvider.replace('custom_', '');
        const customProvider = customProviders.find(cp => cp.name === customName);
        
        if (customProvider) {
          providerInfo = {
            emoji: '🔧',
            name: `${customProvider.name} (Custom)`,
            description: customProvider.description,
            endpoint: customProvider.endpoint,
            defaultModel: customProvider.default_model
          };
        }
      } else {
        providerInfo = AVAILABLE_PROVIDERS.find(p => p.id === currentProvider);
      }
      
      const currentProviderEmbed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('🔧 Your Current AI Provider')
        .setDescription(`You are currently using: **${providerInfo?.emoji || '🤖'} ${providerInfo?.name || currentProvider}**`)
        .addFields(
          { name: 'Description', value: providerInfo?.description || 'No description available' },
          { name: 'Endpoint', value: providerInfo?.endpoint || 'Unknown' },
          { name: 'Default Model', value: providerInfo?.defaultModel || 'Unknown' },
          { name: 'Provider ID', value: `\`${currentProvider}\`` },
          { name: 'Change Provider', value: 'Use `/provider set` to change to a different provider' }
        )
        .setTimestamp();
      
      await interaction.editReply({ embeds: [currentProviderEmbed], ephemeral: true });
    }
    else if (subcommand === 'endpoint') {
      const customEndpoint = interaction.options.getString('url');
      
      // Basic URL validation
      try {
        new URL(customEndpoint);
      } catch (error) {
        const errorEmbed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('❌ Invalid URL')
          .setDescription('The provided URL is not valid. Please provide a valid HTTP/HTTPS URL.')
          .setTimestamp();
        
        await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
        return;
      }
      
      try {
        // Set custom provider with the custom endpoint
        await setUserProvider(interaction.user.id, 'custom', customEndpoint);
        
        const successEmbed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('✅ Custom Endpoint Set')
          .setDescription('Your custom endpoint has been set successfully.')
          .addFields(
            { name: 'Provider', value: '🔧 Custom Provider' },
            { name: 'Endpoint', value: customEndpoint },
            { name: 'Note', value: 'Make sure your endpoint is OpenAI-compatible and your API key works with it.' }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [successEmbed], ephemeral: true });
      } catch (error) {
        console.error('Error setting custom endpoint:', error);
        
        const errorEmbed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('❌ Error Setting Endpoint')
          .setDescription('There was an error setting your custom endpoint. Please try again later.')
          .setTimestamp();
        
        await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  },
};