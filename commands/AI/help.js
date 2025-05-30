const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { EmbedPaginator } = require('../../AI/utilities/pagination');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('🆘 Display help information and bot features')
    .addStringOption(option =>
      option.setName('category')
        .setDescription('Choose specific help category')
        .setRequired(false)
        .addChoices(
          { name: '🤖 AI Features', value: 'ai' },
          { name: '🛡️ Moderation', value: 'moderation' },
          { name: '⚙️ Configuration', value: 'config' },
          { name: '🎭 Role Management', value: 'roles' },
          { name: '📝 Nickname Management', value: 'nicknames' },
          { name: '🔧 API Keys', value: 'apikeys' },
          { name: '💡 Tips & Tricks', value: 'tips' }
        )
    ),

  async execute(interaction) {
    try {
      const category = interaction.options.getString('category');

      if (category) {
        // Show specific category
        const embed = createCategoryEmbed(category);
        await interaction.reply({ embeds: [embed], ephemeral: true });
      } else {
        // Show all categories with pagination
        const embeds = createAllHelpEmbeds();
        const paginator = new EmbedPaginator(embeds, interaction.user.id, 300000); // 5 minutes timeout

        const initialEmbed = paginator.getCurrentEmbed();
        const buttons = paginator.createButtons();

        const response = await interaction.reply({
          embeds: [initialEmbed],
          components: [buttons],
          ephemeral: true
        });

        paginator.setupCollector(response);
      }
    } catch (error) {
      console.error('Error in help command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Error')
        .setDescription('An error occurred while loading help information.')
        .setTimestamp();

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  }
};

function createAllHelpEmbeds() {
  const embeds = [];

  // 1. Overview & Introduction
  embeds.push(new EmbedBuilder()
    .setColor(0x00D4FF)
    .setTitle('🤖 Iris Discord AI Bot - Help Center')
    .setDescription(
      '**Welcome to Iris!** 🎉\n\n' +
      'Iris is an advanced AI-powered Discord bot with intelligent conversation, ' +
      'moderation capabilities, and multi-provider AI support.\n\n' +
      '**🌟 Key Features:**\n' +
      '• 🧠 **Multi-AI Support** - Gemini, OpenAI, Groq\n' +
      '• 🛡️ **Smart Moderation** - Natural language commands\n' +
      '• 🌐 **URL Analysis** - Analyze web content from links\n' +
      '• 🖼️ **Media Processing** - Images, videos, documents\n' +
      '• 🎭 **Role Management** - Intelligent role assignment\n' +
      '• 📝 **Nickname Management** - Change nicknames easily\n\n' +
      '**📚 Navigation:**\n' +
      'Use the buttons below to navigate through different help sections.'
    )
    .addFields([
      { 
        name: '🚀 Quick Start', 
        value: '• Just mention `@Iris` with your question!\n• Use `/help category` for specific topics\n• Set up your API key with `/apikey set`', 
        inline: false 
      },
      { 
        name: '💡 Pro Tip', 
        value: 'Use your own API key for unlimited usage and faster responses!', 
        inline: false 
      }
    ])
    .setThumbnail('https://cdn.discordapp.com/avatars/1234567890/avatar.png') // Replace with your bot's avatar
    .setFooter({ text: 'Iris AI Bot v1.0.1 • Page 1/7' })
    .setTimestamp()
  );

  // 2. AI Features
  embeds.push(new EmbedBuilder()
    .setColor(0x9B59B6)
    .setTitle('🧠 AI Features & Capabilities')
    .setDescription(
      '**Iris supports multiple AI providers for diverse capabilities:**\n\n' +
      '**🔮 Supported Providers:**\n' +
      '• **Gemini** - Google\'s latest AI with URL context\n' +
      '• **OpenAI** - GPT models with advanced reasoning\n' +
      '• **Groq** - Ultra-fast inference for quick responses\n\n'
    )
    .addFields([
      {
        name: '🌐 URL Context Analysis',
        value: '• Analyze web pages, articles, and documents\n• Support multiple URLs in one message\n• Smart content summarization\n• Source citation in responses',
        inline: false
      },
      {
        name: '🖼️ Media Processing',
        value: '• **Images**: Analysis, description, OCR\n• **Videos**: Frame analysis and description\n• **Documents**: PDF processing and analysis\n• Support for multiple formats',
        inline: false
      },
      {
        name: '💬 Conversation Features',
        value: '• Context-aware conversations\n• Memory across messages\n• Personality customization\n• Multi-language support',
        inline: false
      },
      {
        name: '🔧 Usage Examples',
        value: '```\n@Iris explain this image\n@Iris summarize this article: [URL]\n@Iris what do you think about this?\n@Iris help me with coding\n```',
        inline: false
      }
    ])
    .setFooter({ text: 'Iris AI Bot v1.0.1 • Page 2/7' })
    .setTimestamp()
  );

  // 3. Moderation Commands
  embeds.push(new EmbedBuilder()
    .setColor(0xE74C3C)
    .setTitle('🛡️ Moderation & Management')
    .setDescription(
      '**Natural language moderation commands - just tell Iris what to do!**\n\n' +
      '**🔐 Permission Requirements:**\n' +
      'Commands require appropriate Discord permissions and role hierarchy.'
    )
    .addFields([
      {
        name: '👥 Member Moderation',
        value: '```\n@Iris mute @user for 1 hour spamming\n@Iris kick @user for breaking rules\n@Iris ban @user permanently\n@Iris unmute @user\n```',
        inline: false
      },
      {
        name: '💬 Channel Management',
        value: '```\n@Iris lock this channel\n@Iris unlock the channel\n@Iris clear 10 messages\n@Iris delete last 5 messages\n```',
        inline: false
      },
      {
        name: '🎭 Role Management',
        value: '```\n@Iris add Helper role to @user\n@Iris remove Moderator from @user\n@Iris give me the Member role\n```',
        inline: false
      },
      {
        name: '📝 Nickname Management',
        value: '```\n@Iris change my nickname to SuperDev\n@Iris set @user nickname to Moderator\n@Iris reset my nickname\n```',
        inline: false
      }
    ])
    .setFooter({ text: 'Iris AI Bot v1.0.1 • Page 3/7' })
    .setTimestamp()
  );

  // 4. Configuration Commands
  embeds.push(new EmbedBuilder()
    .setColor(0x3498DB)
    .setTitle('⚙️ Configuration & Settings')
    .setDescription('**Customize Iris to fit your needs:**')
    .addFields([
      {
        name: '🔑 API Key Management',
        value: '• `/apikey set` - Set your personal API key\n• `/apikey check` - View current API key status\n• `/apikey remove` - Remove your API key\n• `/apikey info` - Get API key setup guide',
        inline: false
      },
      {
        name: '🤖 AI Model Selection',
        value: '• `/model set` - Choose AI model\n• `/model list` - View available models\n• `/model info` - Get model information\n• `/provider set` - Switch AI provider',
        inline: false
      },
      {
        name: '💾 Data Management',
        value: '• `/clear` - Clear conversation history\n• `/history` - View conversation stats\n• `/export` - Export your data\n• `/settings` - Bot preferences',
        inline: false
      },
      {
        name: '🎨 Customization',
        value: '• Custom system messages\n• Personality adjustments\n• Response formatting\n• Language preferences',
        inline: false
      }
    ])
    .setFooter({ text: 'Iris AI Bot v1.0.1 • Page 4/7' })
    .setTimestamp()
  );

  // 5. Role & Nickname Management
  embeds.push(new EmbedBuilder()
    .setColor(0xF39C12)
    .setTitle('🎭 Role & Nickname Management')
    .setDescription('**Intelligent role and nickname management with AI:**')
    .addFields([
      {
        name: '🎭 Role Assignment',
        value: '• **Self-Assignment**: Assign lower roles to yourself\n• **Admin Assignment**: Manage others\' roles\n• **Hierarchy Protection**: Prevents privilege escalation\n• **Smart Validation**: Automatic permission checks',
        inline: false
      },
      {
        name: '📝 Nickname Changes',
        value: '• **Self-Change**: Modify your own nickname\n• **Admin Change**: Change others\' nicknames\n• **Length Validation**: 32 character limit\n• **Reset Option**: Return to original username',
        inline: false
      },
      {
        name: '🔒 Security Features',
        value: '• Role hierarchy enforcement\n• Permission validation\n• Audit logging\n• Anti-abuse protection',
        inline: false
      },
      {
        name: '💡 Usage Examples',
        value: '```\n"Add the Helper role to me"\n"Give @user the Moderator role"\n"Change my nickname to Developer"\n"Reset @user\'s nickname"\n```',
        inline: false
      }
    ])
    .setFooter({ text: 'Iris AI Bot v1.0.1 • Page 5/7' })
    .setTimestamp()
  );

  // 6. API Keys & Performance
  embeds.push(new EmbedBuilder()
    .setColor(0x1ABC9C)
    .setTitle('🔑 API Keys & Performance')
    .setDescription('**Get unlimited usage with your own API keys:**')
    .addFields([
      {
        name: '🆓 Free API Key Sources',
        value: '**Gemini (Recommended):**\n• Visit: https://aistudio.google.com/app/apikey\n• Free tier: 15 requests/minute\n• Best for URL context and general chat\n\n**Groq (Fast):**\n• Visit: https://console.groq.com/keys\n• Free tier: Very generous limits\n• Ultra-fast responses',
        inline: false
      },
      {
        name: '⚡ Performance Benefits',
        value: '• **Unlimited Usage**: No daily limits\n• **Faster Responses**: Direct API access\n• **Priority Processing**: Skip bot queues\n• **Advanced Features**: Access to latest models',
        inline: false
      },
      {
        name: '🔧 Setup Instructions',
        value: '1. Get API key from provider\n2. Use `/apikey set` command\n3. Paste your key securely\n4. Enjoy unlimited access!\n\n*Keys are encrypted and stored securely*',
        inline: false
      }
    ])
    .setFooter({ text: 'Iris AI Bot v1.0.1 • Page 6/7' })
    .setTimestamp()
  );

  // 7. Tips & Troubleshooting
  embeds.push(new EmbedBuilder()
    .setColor(0x95A5A6)
    .setTitle('💡 Tips, Tricks & Troubleshooting')
    .setDescription('**Get the most out of Iris:**')
    .addFields([
      {
        name: '🎯 Pro Tips',
        value: '• **Be Specific**: Detailed questions get better answers\n• **Use Context**: Reference previous messages\n• **Try Different Models**: Each has unique strengths\n• **Combine Features**: Use images + text for rich context',
        inline: false
      },
      {
        name: '🚀 Best Practices',
        value: '• Set up personal API key for best experience\n• Use appropriate commands for moderation\n• Check permissions before using admin features\n• Keep conversations focused for better context',
        inline: false
      },
      {
        name: '🔧 Common Issues & Solutions',
        value: '**"No response from AI"**\n• Check API key status with `/apikey check`\n• Try switching models with `/model set`\n\n**"Permission denied"**\n• Verify Discord permissions\n• Check role hierarchy\n\n**"Function not working"**\n• Ensure bot has required permissions\n• Try rephrasing your command',
        inline: false
      },
      {
        name: '🆘 Need More Help?',
        value: '• **GitHub**: [Issues & Documentation](https://github.com/bm-hien/Iris-Discord-AI)\n• **Discord**: [Support Server](https://discord.gg/pevruS26Au)\n• **Developer**: Contact bm-hien for advanced support',
        inline: false
      }
    ])
    .setFooter({ text: 'Iris AI Bot v1.0.1 • Page 7/7 • Made with ❤️ by bm-hien' })
    .setTimestamp()
  );

  return embeds;
}

function createCategoryEmbed(category) {
  const baseColor = 0x00D4FF;
  
  switch (category) {
    case 'ai':
      return new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle('🧠 AI Features & Capabilities')
        .setDescription('**Comprehensive AI-powered features:**')
        .addFields([
          {
            name: '🤖 Multi-Provider Support',
            value: '• **Gemini**: Google\'s latest AI models\n• **OpenAI**: GPT-4 and GPT-3.5 models\n• **Groq**: Ultra-fast inference models\n• **Custom**: Support for custom endpoints',
            inline: false
          },
          {
            name: '🌐 URL Context Analysis',
            value: '• Analyze web pages and articles\n• Multi-URL comparison\n• Automatic content extraction\n• Smart summarization',
            inline: true
          },
          {
            name: '🖼️ Media Processing',
            value: '• Image analysis and description\n• Video frame processing\n• PDF document analysis\n• OCR text extraction',
            inline: true
          },
          {
            name: '💬 Conversation Features',
            value: '• Context-aware responses\n• Memory across conversations\n• Personality customization\n• Multi-language support',
            inline: false
          },
          {
            name: '🔧 Usage Examples',
            value: '```\n@Iris analyze this image\n@Iris summarize: https://example.com\n@Iris what do you think?\n@Iris help with coding\n@Iris translate this to Spanish\n```',
            inline: false
          }
        ])
        .setTimestamp();

    case 'moderation':
      return new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('🛡️ Moderation Commands')
        .setDescription('**Natural language moderation - just tell Iris what to do!**')
        .addFields([
          {
            name: '👤 Member Actions',
            value: '```\nMute @user for 1 hour\nKick @user for spam\nBan @user permanently\nUnmute @user\n```',
            inline: false
          },
          {
            name: '💬 Message Management',
            value: '```\nClear 10 messages\nDelete last 5 messages\nRemove messages from @user\n```',
            inline: false
          },
          {
            name: '🔒 Channel Control',
            value: '```\nLock this channel\nUnlock the channel\nLock #general for 30 minutes\n```',
            inline: false
          },
          {
            name: '⚠️ Requirements',
            value: '• Appropriate Discord permissions\n• Higher role than target user\n• Bot must have required permissions\n• Cannot action server owner',
            inline: false
          }
        ])
        .setTimestamp();

    case 'config':
      return new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('⚙️ Configuration Commands')
        .setDescription('**Customize your Iris experience:**')
        .addFields([
          {
            name: '🔑 API Key Commands',
            value: '• `/apikey set` - Set personal API key\n• `/apikey check` - Check key status\n• `/apikey remove` - Remove key\n• `/apikey info` - Setup guide',
            inline: false
          },
          {
            name: '🤖 Model Commands',
            value: '• `/model set [model]` - Choose AI model\n• `/model list` - Available models\n• `/model info` - Model details\n• `/provider set [provider]` - Switch provider',
            inline: false
          },
          {
            name: '💾 Data Commands',
            value: '• `/clear` - Clear conversation history\n• `/history` - View conversation stats\n• `/export` - Export your data\n• `/settings` - Bot preferences',
            inline: false
          }
        ])
        .setTimestamp();

    case 'roles':
      return new EmbedBuilder()
        .setColor(0xF39C12)
        .setTitle('🎭 Role Management')
        .setDescription('**Smart role assignment with AI assistance:**')
        .addFields([
          {
            name: '➕ Adding Roles',
            value: '```\nAdd Helper role to @user\nGive me the Member role\nAssign Moderator to @user\n```',
            inline: false
          },
          {
            name: '➖ Removing Roles',
            value: '```\nRemove Admin from @user\nTake away Moderator role\nRemove my Helper role\n```',
            inline: false
          },
          {
            name: '🔒 Security Features',
            value: '• **Self-Assignment**: Only lower roles\n• **Hierarchy Check**: Prevents privilege escalation\n• **Permission Validation**: Automatic checks\n• **Audit Logging**: Track all changes',
            inline: false
          },
          {
            name: '⚠️ Limitations',
            value: '• Cannot assign roles higher than yours\n• Cannot modify server owner roles\n• Requires "Manage Roles" permission\n• Bot must have higher role than target',
            inline: false
          }
        ])
        .setTimestamp();

    case 'nicknames':
      return new EmbedBuilder()
        .setColor(0x8E44AD)
        .setTitle('📝 Nickname Management')
        .setDescription('**Change nicknames with natural language:**')
        .addFields([
          {
            name: '✏️ Changing Nicknames',
            value: '```\nChange my nickname to Developer\nSet @user nickname to Helper\nRename @user to Moderator\n```',
            inline: false
          },
          {
            name: '🔄 Resetting Nicknames',
            value: '```\nReset my nickname\nRemove @user\'s nickname\nClear my display name\n```',
            inline: false
          },
          {
            name: '📏 Rules & Limits',
            value: '• **Length**: Maximum 32 characters\n• **Self-Change**: Change your own nickname\n• **Admin Change**: Modify others (with permission)\n• **Reset**: Return to original username',
            inline: false
          },
          {
            name: '🔐 Permissions',
            value: '• **Self**: "Change Nickname" permission\n• **Others**: "Manage Nicknames" permission\n• **Hierarchy**: Cannot change higher role users\n• **Owner**: Cannot change server owner',
            inline: false
          }
        ])
        .setTimestamp();

    case 'apikeys':
      return new EmbedBuilder()
        .setColor(0x1ABC9C)
        .setTitle('🔑 API Key Setup Guide')
        .setDescription('**Get unlimited access with your own API keys:**')
        .addFields([
          {
            name: '🔮 Gemini API (Recommended)',
            value: '**Steps:**\n1. Visit: https://aistudio.google.com/app/apikey\n2. Sign in with Google account\n3. Click "Create API Key"\n4. Copy key (starts with "AIza...")\n5. Use `/apikey set` in Discord\n\n**Benefits:** URL context, free tier',
            inline: false
          },
          {
            name: '⚡ Groq API (Fast)',
            value: '**Steps:**\n1. Visit: https://console.groq.com/keys\n2. Create free account\n3. Generate new API key\n4. Copy key (starts with "gsk_...")\n5. Use `/apikey set` in Discord\n\n**Benefits:** Ultra-fast responses, generous limits',
            inline: false
          },
          {
            name: '🧠 OpenAI API (Advanced)',
            value: '**Steps:**\n1. Visit: https://platform.openai.com/api-keys\n2. Create account (requires payment)\n3. Generate API key\n4. Copy key (starts with "sk-...")\n5. Use `/apikey set` in Discord\n\n**Benefits:** GPT-4, advanced reasoning',
            inline: false
          },
          {
            name: '🔒 Security & Privacy',
            value: '• Keys are encrypted before storage\n• Only you can access your key\n• Use `/apikey remove` to delete\n• Keys never shared or logged',
            inline: false
          }
        ])
        .setTimestamp();

    case 'tips':
      return new EmbedBuilder()
        .setColor(0x95A5A6)
        .setTitle('💡 Tips, Tricks & Best Practices')
        .setDescription('**Master Iris with these pro tips:**')
        .addFields([
          {
            name: '🎯 Getting Better Responses',
            value: '• **Be Specific**: "Analyze this error message" > "Help"\n• **Provide Context**: Include relevant details\n• **Use Examples**: Show what you want\n• **Ask Follow-ups**: Build on previous responses',
            inline: false
          },
          {
            name: '🚀 Performance Tips',
            value: '• **Set API Key**: Get unlimited usage\n• **Choose Right Model**: Gemini for URLs, Groq for speed\n• **Split Complex Tasks**: Break down big requests\n• **Use Attachments**: Images often worth 1000 words',
            inline: false
          },
          {
            name: '🛠️ Troubleshooting',
            value: '**Common Issues:**\n• No response → Check `/apikey check`\n• Slow responses → Try Groq provider\n• Permission errors → Verify Discord permissions\n• Function errors → Rephrase command naturally',
            inline: false
          },
          {
            name: '💝 Advanced Features',
            value: '• **Multi-URL Analysis**: Send multiple links\n• **Image + Text**: Combine for rich context\n• **Conversation Memory**: Reference earlier messages\n• **Custom Models**: Use `/model set` for specific needs',
            inline: false
          }
        ])
        .setTimestamp();

    default:
      return new EmbedBuilder()
        .setColor(baseColor)
        .setTitle('❓ Unknown Category')
        .setDescription('Sorry, that help category doesn\'t exist. Use `/help` without options to see all available help.')
        .setTimestamp();
  }
}