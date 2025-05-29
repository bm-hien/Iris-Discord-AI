const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } = require('discord.js');
const { getUserApiKey, setUserModel, getUserModel, getUserProvider } = require('../../AI/events/database');
const { OpenAI } = require("openai");
const { GoogleGenAI } = require("@google/genai");

function getModelsForProvider(providerId) {
  switch (providerId) {
    case 'groq':
      return [
        // Most popular and capable models first
        { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', description: 'Latest and most capable Llama model', emoji: '🦙' },
        { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill Llama 70B', description: 'Advanced reasoning model based on Llama 70B', emoji: '🧠' },
        { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick 17B', description: 'Experimental Llama 4 model with 128 experts', emoji: '🚀' },
        { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout 17B', description: 'High-throughput Llama 4 model', emoji: '⚡' },
        { id: 'mistral-saba-24b', name: 'Mistral Saba 24B', description: 'Mistral\'s latest mid-size model', emoji: '🎯' },
        { id: 'qwen-qwq-32b', name: 'Qwen QwQ 32B', description: 'Alibaba\'s reasoning-focused model', emoji: '🤔' },
        { id: 'llama3-70b-8192', name: 'Llama 3 70B', description: 'Stable Llama 3 70B model', emoji: '🔥' },
        { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', description: 'Fast and efficient Llama model', emoji: '💨' },
        { id: 'gemma2-9b-it', name: 'Gemma 2 9B IT', description: 'Google\'s Gemma model optimized for instructions', emoji: '💎' },
        { id: 'llama3-8b-8192', name: 'Llama 3 8B', description: 'Compact Llama 3 model', emoji: '📱' },
        { id: 'compound-beta', name: 'Compound Beta', description: 'Experimental compound model', emoji: '🧪' },
        { id: 'compound-beta-mini', name: 'Compound Beta Mini', description: 'Smaller compound model', emoji: '🔬' },
        { id: 'allam-2-7b', name: 'Allam 2 7B', description: 'IBM\'s Allam language model', emoji: '🏢' }
      ];
    case 'openai':
      return [
        { id: 'gpt-4o', name: 'GPT-4o', description: 'Latest GPT-4 optimized model', emoji: '🧠' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Smaller, faster GPT-4 model', emoji: '⚡' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Enhanced GPT-4 model', emoji: '🚀' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and efficient model', emoji: '💨' },
        { id: 'o1-preview', name: 'o1 Preview', description: 'Advanced reasoning model', emoji: '🤖' },
        { id: 'o1-mini', name: 'o1 Mini', description: 'Smaller reasoning model', emoji: '🔍' }
      ];
    case 'gemini':
    default:
      return [
        // Models with URL context support first (marked with 🌐)
        { 
          id: 'gemini-2.5-flash-preview-05-20', 
          name: 'Gemini 2.5 Flash Preview', 
          description: 'Latest with URL context, adaptive thinking, and stable function calling ⭐🌐', 
          emoji: '🌐',
          supportsUrlContext: true
        },
        { 
          id: 'gemini-2.5-pro-preview-05-06', 
          name: 'Gemini 2.5 Pro Preview', 
          description: 'Enhanced thinking, reasoning, and URL context support 🌐', 
          emoji: '🧠',
          supportsUrlContext: true
        },
        { 
          id: 'gemini-2.0-flash', 
          name: 'Gemini 2.0 Flash', 
          description: 'Next generation with URL context (experimental function calling) 🌐', 
          emoji: '🧪',
          supportsUrlContext: true
        },
        { 
          id: 'gemini-2.0-flash-live-001', 
          name: 'Gemini 2.0 Flash Live', 
          description: 'Live model with URL context support 🌐', 
          emoji: '📡',
          supportsUrlContext: true
        },
        
        // Stable models without URL context
        { 
          id: 'gemini-1.5-flash', 
          name: 'Gemini 1.5 Flash', 
          description: 'Fast, versatile, and proven function calling', 
          emoji: '⚡',
          supportsUrlContext: false
        },
        { 
          id: 'gemini-1.5-pro', 
          name: 'Gemini 1.5 Pro', 
          description: 'Complex reasoning and stable function calling', 
          emoji: '🎯',
          supportsUrlContext: false
        },
        
        // Other models without URL context
        { 
          id: 'gemini-2.0-flash-lite', 
          name: 'Gemini 2.0 Flash-Lite', 
          description: 'Cost efficient (basic function calling)', 
          emoji: '💨',
          supportsUrlContext: false
        },
        { 
          id: 'gemini-1.5-flash-8b', 
          name: 'Gemini 1.5 Flash-8B', 
          description: 'High volume tasks (limited function calling)', 
          emoji: '📊',
          supportsUrlContext: false
        }
      ];
  }
}

function modelSupportsUrlContext(modelId) {
  const urlContextSupportedModels = [
    'gemini-2.5-pro-preview-05-06',
    'gemini-2.5-flash-preview-05-20',
    'gemini-2.0-flash',
    'gemini-2.0-flash-live-001'
  ];
  
  return urlContextSupportedModels.includes(modelId);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('model')
    .setDescription('Select which AI model to use for your interactions')
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Choose which AI model to use for your interactions'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all available AI models'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('check')
        .setDescription('Check which AI model you are currently using')),
  
  execute: async (interaction) => {
    await interaction.deferReply({ ephemeral: true });
    
    const subcommand = interaction.options.getSubcommand();
    
    // First check if the user has an API key
    const apiKey = await getUserApiKey(interaction.user.id);
    
    if (!apiKey) {
      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ API Key Required')
        .setDescription('You need to set a personal API key with `/apikey set` before you can select a model.')
        .addFields(
          { name: 'Why do I need an API key?', value: 'Model selection is only available for users with their own API keys, as different models have different quota and pricing requirements.' }
        )
        .setTimestamp();
      
      await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
      return;
    }
    
    if (subcommand === 'set') {
      // Get user's current provider
      const userProvider = await getUserProvider(interaction.user.id) || 'gemini';
      const availableModels = getModelsForProvider(userProvider);
      
      // Create select menus (Discord has a 25 option limit per menu)
      const selectMenus = [];
      const maxOptionsPerMenu = 25;
      
      for (let i = 0; i < availableModels.length; i += maxOptionsPerMenu) {
        const batch = availableModels.slice(i, i + maxOptionsPerMenu);
        const menuIndex = Math.floor(i / maxOptionsPerMenu);
        
        const select = new StringSelectMenuBuilder()
          .setCustomId(`model_select_${menuIndex}`)
          .setPlaceholder(`Select a model (${menuIndex + 1}/${Math.ceil(availableModels.length / maxOptionsPerMenu)})`)
          .addOptions(
            batch.map(model => 
              new StringSelectMenuOptionBuilder()
                .setLabel(model.name)
                .setDescription(model.description.substring(0, 100)) // Discord description limit
                .setValue(model.id)
                .setEmoji(model.emoji)
            )
          );
        
        selectMenus.push(new ActionRowBuilder().addComponents(select));
      }
      
      const currentModel = await getUserModel(interaction.user.id) || getDefaultModelForProvider(userProvider);
      const currentModelInfo = availableModels.find(m => m.id === currentModel) || { emoji: '⚡', name: currentModel };
      
      const selectionEmbed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('🤖 Select AI Model')
        .setDescription(`Choose which AI model you want to use for your interactions.\n\n**Current Provider:** ${userProvider.charAt(0).toUpperCase() + userProvider.slice(1)}`)
        .addFields(
          { name: 'Current Model', value: `${currentModelInfo?.emoji || '⚡'} ${currentModelInfo?.name || currentModel}`, inline: false },
          { name: 'Available Models', value: `${availableModels.length} models available for ${userProvider}`, inline: true },
          { name: 'Note', value: 'Different models have different capabilities and response speeds. Your selection will be used for all future interactions until you change it again.' }
        )
        .setTimestamp();
      
      const response = await interaction.editReply({
        embeds: [selectionEmbed],
        components: selectMenus,
        ephemeral: true
      });
      
      // Create a collector for all select menus
      const collector = response.createMessageComponentCollector({ 
        time: 60000, // 1 minute timeout
        max: 1 // Only collect one interaction
      });
      
      collector.on('collect', async i => {
        const selectedModelId = i.values[0];
        const selectedModel = availableModels.find(m => m.id === selectedModelId);
        
        try {
          // Remove the API testing part - just save the model preference directly
          await setUserModel(interaction.user.id, selectedModelId);
          
          const successEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Model Updated Successfully')
            .setDescription(`You are now using **${selectedModel.emoji} ${selectedModel.name}**`)
            .addFields(
              { name: 'Provider', value: userProvider.charAt(0).toUpperCase() + userProvider.slice(1), inline: true },
              { name: 'Model ID', value: `\`${selectedModelId}\``, inline: true },
              { name: 'Description', value: selectedModel.description },
              { name: 'Note', value: 'Your model preference has been saved. The bot will use this model for all future interactions.' }
            )
            .setTimestamp();
          
          await i.update({ embeds: [successEmbed], components: [] });
        } catch (error) {
          console.error('Error setting model:', error);
          
          const errorEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ Model Selection Failed')
            .setDescription(`Could not save your model preference.`)
            .addFields(
              { name: 'Provider', value: userProvider.charAt(0).toUpperCase() + userProvider.slice(1), inline: true },
              { name: 'Model', value: selectedModel.name, inline: true },
              { name: 'Error Details', value: 'There was an error saving your model preference to the database.' },
              { name: 'Fallback', value: 'Please try again or contact support if the issue persists.' }
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
            .setDescription('You did not make a selection in time. Your model preference has not been changed.')
            .setTimestamp();
          
          await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
        }
      });
    }
    else if (subcommand === 'list') {
      // Get user's provider to show relevant models
      const userProvider = await getUserProvider(interaction.user.id) || 'gemini';
      const availableModels = getModelsForProvider(userProvider);
      
      // Create multiple embeds if we have too many models
      const maxFieldsPerEmbed = 10;
      const embeds = [];
      
      for (let i = 0; i < availableModels.length; i += maxFieldsPerEmbed) {
        const batch = availableModels.slice(i, i + maxFieldsPerEmbed);
        const embedIndex = Math.floor(i / maxFieldsPerEmbed);
        
        const embed = new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle(embedIndex === 0 ? `🤖 Available AI Models for ${userProvider.charAt(0).toUpperCase() + userProvider.slice(1)}` : `🤖 Models (continued ${embedIndex + 1})`)
          .setDescription(embedIndex === 0 ? 'Here are the AI models you can choose from with your current provider:' : 'Additional models:')
          .addFields(
            batch.map(model => ({
              name: `${model.emoji} ${model.name}`,
              value: `\`${model.id}\`\n${model.description}`,
              inline: false
            }))
          );
        
        if (embedIndex === 0) {
          embed.setFooter({ text: 'Use /model set to change your model • Use /provider set to change providers' });
        }
        
        embed.setTimestamp();
        embeds.push(embed);
      }
      
      await interaction.editReply({ embeds: embeds, ephemeral: true });
    }
    else if (subcommand === 'check') {
      const userProvider = await getUserProvider(interaction.user.id) || 'gemini';
      const availableModels = getModelsForProvider(userProvider);
      const currentModel = await getUserModel(interaction.user.id) || getDefaultModelForProvider(userProvider);
      const modelInfo = availableModels.find(m => m.id === currentModel) || { emoji: '⚡', name: currentModel, description: 'Custom model' };
      
      const currentModelEmbed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('🤖 Your Current AI Model')
        .setDescription(`You are currently using: **${modelInfo?.emoji || '⚡'} ${modelInfo?.name || currentModel}**`)
        .addFields(
          { name: 'Provider', value: userProvider.charAt(0).toUpperCase() + userProvider.slice(1), inline: true },
          { name: 'Model ID', value: `\`${currentModel}\``, inline: true },
          { name: 'Description', value: modelInfo?.description || 'No description available' },
          { name: 'Change Model', value: 'Use `/model set` to change to a different model' },
          { name: 'Change Provider', value: 'Use `/provider set` to switch to a different AI provider' }
        )
        .setTimestamp();
      
      await interaction.editReply({ embeds: [currentModelEmbed], ephemeral: true });
    }
  },
  getModelsForProvider,
  getDefaultModelForProvider,
  modelSupportsUrlContext
};



// Helper function to get default model for each provider
function getDefaultModelForProvider(providerId) {
  switch (providerId) {
    case 'groq':
      return 'llama-3.3-70b-versatile'; // Latest and most capable
    case 'openai':
      return 'gpt-4o-mini';
    case 'gemini':
    default:
      return 'gemini-2.5-flash-preview-05-20';
  }
}