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
          { name: '📤 Message Management', value: 'messages' },
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

      await interaction.reply({ 
        embeds: [errorEmbed], 
        ephemeral: true 
      }).catch(console.error);
    }
  }
};

function createAllHelpEmbeds() {
  const embeds = [];
  const baseColor = 0x3498db;

  // 1. Overview & Introduction
  embeds.push(new EmbedBuilder()
    .setColor(baseColor)
    .setTitle('🤖 Welcome to Iris AI Bot!')
    .setDescription(
      '**Your intelligent Discord assistant with advanced AI capabilities!**\n\n' +
      '🎯 **Core Features:**\n' +
      '• 🧠 **AI Chat** - Natural conversations with context memory\n' +
      '• 🛡️ **Smart Moderation** - AI-powered server management\n' +
      '• 🎭 **Role Management** - Intelligent role assignment\n' +
      '• 📤 **Message Management** - Send, pin, and react to messages\n' +
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
    .setFooter({ text: 'Iris AI Bot v1.0.2 • Page 1/8' })
    .setTimestamp()
  );

  // 2. AI Features & Capabilities
  embeds.push(new EmbedBuilder()
    .setColor(0x9B59B6)
    .setTitle('🧠 AI Features & Capabilities')
    .setDescription('**Experience the power of advanced AI conversation:**')
    .addFields([
      {
        name: '💬 Natural Conversations',
        value: '• **Context Memory**: Remembers previous messages\n• **Smart Responses**: Understands complex questions\n• **Multi-Language**: Supports multiple languages\n• **Personality**: Friendly, helpful, and engaging',
        inline: false
      },
      {
        name: '🖼️ Multimedia Processing',
        value: '• **Image Analysis**: Describe and analyze images\n• **Document Reading**: PDF, text files, code files\n• **Video Processing**: Extract information from videos\n• **URL Context**: Fetch and analyze web content',
        inline: false
      },
      {
        name: '🤖 AI Models Available',
        value: '• **Gemini 2.0 Flash** - Latest Google AI (Default)\n• **Gemini 1.5 Pro** - Advanced reasoning\n• **Groq Models** - Ultra-fast responses\n• **Anthropic Claude** - Premium quality\n• **OpenAI GPT** - Industry standard',
        inline: false
      },
      {
        name: '✨ Smart Features',
        value: '• **Function Calling**: Execute Discord commands via AI\n• **Context Switching**: Handle multiple topics\n• **Error Recovery**: Graceful handling of issues\n• **Rate Limiting**: Fair usage for all users',
        inline: false
      },
      {
        name: '🎯 Usage Examples',
        value: '```\n@Iris What\'s in this image?\n@Iris Explain this code file\n@Iris Help me moderate this server\n@Iris Translate this to Vietnamese\n```',
        inline: false
      }
    ])
    .setFooter({ text: 'Iris AI Bot v1.0.2 • Page 2/8' })
    .setTimestamp()
  );

  // 3. Moderation & Management
  embeds.push(new EmbedBuilder()
    .setColor(0xE74C3C)
    .setTitle('🛡️ Moderation & Server Management')
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
        value: '```\n@Iris create a new text channel "general-chat"\n@Iris delete the old announcements channel\n@Iris lock this channel for maintenance\n@Iris unlock the channel\n@Iris clear 10 messages\n```',
        inline: false
      },
      {
        name: '🎭 Role Management',
        value: '```\n@Iris add Helper role to @user\n@Iris remove Moderator from @user\n@Iris create a new role called "VIP"\n@Iris give me the Member role\n```',
        inline: false
      },
      {
        name: '📝 Nickname Management',
        value: '```\n@Iris change my nickname to SuperDev\n@Iris set @user nickname to Moderator\n@Iris reset my nickname\n```',
        inline: false
      },
      {
        name: '⚠️ Security Features',
        value: '• **Permission Validation**: Checks Discord permissions\n• **Role Hierarchy**: Prevents privilege escalation\n• **Audit Logging**: All actions are logged\n• **Anti-Abuse**: Rate limiting and validation',
        inline: false
      }
    ])
    .setFooter({ text: 'Iris AI Bot v1.0.2 • Page 3/8' })
    .setTimestamp()
  );

  // 4. Message Management (NEW)
  embeds.push(new EmbedBuilder()
    .setColor(0x00BFFF)
    .setTitle('📤 Message Management')
    .setDescription('**Send, pin, and react to messages with AI assistance:**')
    .addFields([
      {
        name: '📨 Sending Messages',
        value: '```\n@Iris send "Hello everyone!" to #general\n@Iris post this announcement in #updates\n@Iris send a welcome message to the bot channel\n```',
        inline: false
      },
      {
        name: '📌 Message Pinning',
        value: '```\n@Iris pin this message\n@Iris pin message ID 1234567890\n@Iris unpin that announcement\n@Iris unpin the pinned message\n```',
        inline: false
      },
      {
        name: '😊 Reactions',
        value: '```\n@Iris react with 👍 to that message\n@Iris add ✅ reaction to message ID 1234567890\n@Iris react with 🎉 to the announcement\n```',
        inline: false
      },
      {
        name: '⚠️ Requirements & Limits',
        value: '• **Send Messages**: "Manage Messages" permission required\n• **Pin/Unpin**: "Manage Messages" permission required\n• **Reactions**: "Add Reactions" permission required\n• **Content Limits**: 1000 characters max per message\n• **Channel Restriction**: Cannot send to same channel you\'re in',
        inline: false
      },
      {
        name: '🔒 Safety Notes',
        value: '• All mentions are automatically disabled for security\n• Links require "Manage Server" permission\n• Rate limiting prevents spam and abuse\n• Only designated channels are allowed\n• All actions are logged for moderation review',
        inline: false
      }
    ])
    .setFooter({ text: 'Iris AI Bot v1.0.2 • Page 4/8' })
    .setTimestamp()
  );

  // 5. Configuration & Settings
  embeds.push(new EmbedBuilder()
    .setColor(0x2ECC71)
    .setTitle('⚙️ Configuration & Settings')
    .setDescription('**Customize Iris to fit your needs:**')
    .addFields([
      {
        name: '🔑 Slash Commands',
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
    .setFooter({ text: 'Iris AI Bot v1.0.2 • Page 5/8' })
    .setTimestamp()
  );

  // 6. Role & Nickname Management
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
    .setFooter({ text: 'Iris AI Bot v1.0.2 • Page 6/8' })
    .setTimestamp()
  );

  // 7. API Keys & Performance
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
    .setFooter({ text: 'Iris AI Bot v1.0.2 • Page 7/8' })
    .setTimestamp()
  );

  // 8. Tips & Troubleshooting
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
        name: '📤 Message Management Tips',
        value: '• **Safe by Design**: All pings are automatically disabled\n• **Use Descriptions**: "Send announcement about server rules"\n• **Target Channels**: Specify exact channel names or IDs\n• **React Appropriately**: Use relevant emojis for context\n• **Check Permissions**: Ensure you have required permissions',
        inline: false
      },
      {
        name: '🚀 Best Practices',
        value: '• Set up personal API key for best experience\n• Use appropriate commands for moderation\n• Check permissions before using admin features\n• Keep conversations focused for better context',
        inline: false
      },
      {
        name: '🔧 Common Issues & Solutions',
        value: '**"No response from AI"**\n• Check API key status with `/apikey check`\n• Try switching models with `/model set`\n\n**"Permission denied"**\n• Verify Discord permissions\n• Check role hierarchy\n\n**"Cannot send message"**\n• Check "Manage Messages" permission\n• Verify target channel is allowed\n• Wait for rate limit cooldown\n\n**"Mentions not working"**\n• This is intentional for safety\n• All pings are disabled by design',
        inline: false
      },
      {
        name: '🆘 Need More Help?',
        value: '• **GitHub**: [Issues & Documentation](https://github.com/bm-hien/Iris-Discord-AI)\n• **Discord**: [Support Server](https://discord.gg/pevruS26Au)\n• **Developer**: Contact bm-hien for advanced support',
        inline: false
      }
    ])
    .setFooter({ text: 'Iris AI Bot v1.0.2 • Page 8/8 • Made with ❤️ by bm-hien' })
    .setTimestamp()
  );

  return embeds;
}

function createCategoryEmbed(category) {
  switch (category) {
    case 'ai':
      return new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle('🧠 AI Features')
        .setDescription('**Advanced AI capabilities for natural conversations:**')
        .addFields([
          {
            name: '💬 Conversation Features',
            value: '• **Context Memory**: Remembers conversation history\n• **Natural Language**: Understands complex requests\n• **Multi-Language**: Supports various languages\n• **Smart Responses**: Contextually appropriate answers',
            inline: false
          },
          {
            name: '🖼️ Media Processing',
            value: '• **Image Analysis**: Describe and analyze images\n• **Document Reading**: PDF, text, code files\n• **Video Processing**: Extract video information\n• **URL Context**: Analyze web content',
            inline: false
          },
          {
            name: '🤖 Available Models',
            value: '• **Gemini 2.0 Flash** - Google\'s latest AI\n• **Gemini 1.5 Pro** - Advanced reasoning\n• **Groq Models** - Ultra-fast responses\n• **Claude & GPT** - Premium alternatives',
            inline: false
          },
          {
            name: '🎯 Usage Tips',
            value: '• Mention @Iris to start conversations\n• Upload images for analysis\n• Share documents for reading\n• Include URLs for web content analysis',
            inline: false
          }
        ])
        .setTimestamp();

    case 'moderation':
      return new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('🛡️ Moderation Commands')
        .setDescription('**AI-powered server moderation with natural language:**')
        .addFields([
          {
            name: '👥 Member Actions',
            value: '```\nMute @user for 1 hour\nKick @user for breaking rules\nBan @user permanently\nUnmute @user\n```',
            inline: false
          },
          {
            name: '💬 Channel Actions',
            value: '```\nLock this channel\nUnlock the channel\nClear 10 messages\nDelete last 5 messages\n```',
            inline: false
          },
          {
            name: '🔐 Requirements',
            value: '• **Mute/Kick/Ban**: Appropriate moderation permissions\n• **Channel Lock**: "Manage Channels" permission\n• **Clear Messages**: "Manage Messages" permission\n• **Role Hierarchy**: Bot must be higher than target',
            inline: false
          },
          {
            name: '⚠️ Safety Features',
            value: '• Permission validation before execution\n• Role hierarchy enforcement\n• Audit logging for all actions\n• Anti-abuse protection with rate limiting',
            inline: false
          }
        ])
        .setTimestamp();

    case 'messages':
      return new EmbedBuilder()
        .setColor(0x00BFFF)
        .setTitle('📤 Message Management')
        .setDescription('**Send, pin, and react to messages with AI:**')
        .addFields([
          {
            name: '📨 Sending Messages',
            value: '```\nSend "Hello everyone!" to #general\nPost this announcement in #updates\nSend a message to the bot channel\n```',
            inline: false
          },
          {
            name: '📌 Message Pinning',
            value: '```\nPin this message\nPin message ID 1234567890\nUnpin that announcement\n```',
            inline: false
          },
          {
            name: '😊 Reactions',
            value: '```\nReact with 👍 to that message\nAdd ✅ reaction to message ID 1234567890\nReact with 🎉 to the announcement\n```',
            inline: false
          },
          {
            name: '🛡️ Security Features',
            value: '• **No Pings**: All mentions disabled for safety\n• **Rate Limited**: 30 second cooldown between sends\n• **Content Filtered**: URL and spam protection\n• **Channel Whitelist**: Only safe channels allowed\n• **Permission Checked**: Proper Discord permissions required',
            inline: false
          },
          {
            name: '⚠️ Requirements',
            value: '• **Send Messages**: "Manage Messages" permission\n• **Pin/Unpin**: "Manage Messages" permission\n• **Reactions**: "Add Reactions" permission\n• **Restrictions**: Cannot send to same channel\n• **Content Limits**: 1000 characters max',
            inline: false
          },
          {
            name: '🔒 Safety Notes',
            value: '• All @everyone/@here mentions are disabled\n• Links require "Manage Server" permission\n• Rate limiting prevents spam\n• Only designated channels allowed\n• All actions are logged for moderation',
            inline: false
          }
        ])
        .setTimestamp();

    case 'config':
      return new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('⚙️ Configuration')
        .setDescription('**Customize Iris settings and preferences:**')
        .addFields([
          {
            name: '🔑 API Key Management',
            value: '• `/apikey set` - Add your personal API key\n• `/apikey check` - View current status\n• `/apikey remove` - Remove your key\n• `/apikey info` - Setup instructions',
            inline: false
          },
          {
            name: '🤖 Model Selection',
            value: '• `/model set` - Choose AI model\n• `/model list` - View available models\n• `/model info` - Get model details\n• `/provider set` - Switch providers',
            inline: false
          },
          {
            name: '💾 Data Management',
            value: '• `/clear` - Clear conversation history\n• `/history` - View conversation stats\n• `/export` - Export your data\n• `/settings` - Adjust preferences',
            inline: false
          },
          {
            name: '🎨 Personalization',
            value: '• Custom response styles\n• Language preferences\n• Personality adjustments\n• Output formatting options',
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
            name: '👤 Self-Management',
            value: '```\nAdd the Helper role to me\nGive me the Member role\nRemove VIP from me\n```',
            inline: false
          },
          {
            name: '👥 Admin Management',
            value: '```\nGive @user the Moderator role\nRemove Helper from @user\nAdd VIP role to @user\n```',
            inline: false
          },
          {
            name: '🛠️ Role Creation',
            value: '```\nCreate a new role called "VIP"\nMake a Developer role with blue color\nCreate Staff role with permissions\n```',
            inline: false
          },
          {
            name: '🔒 Security',
            value: '• **Hierarchy Protection**: Cannot assign higher roles\n• **Permission Validation**: Checks Discord permissions\n• **Self-Assignment Limits**: Only lower roles allowed\n• **Admin Override**: Admins can manage all roles',
            inline: false
          }
        ])
        .setTimestamp();

    case 'nicknames':
      return new EmbedBuilder()
        .setColor(0xFF6B6B)
        .setTitle('📝 Nickname Management')
        .setDescription('**Change nicknames with AI assistance:**')
        .addFields([
          {
            name: '👤 Self-Management',
            value: '```\nChange my nickname to Developer\nSet my nickname to SuperUser\nReset my nickname\n```',
            inline: false
          },
          {
            name: '👥 Admin Management',
            value: '```\nChange @user nickname to Moderator\nSet @user\'s nickname to Helper\nReset @user\'s nickname\n```',
            inline: false
          },
          {
            name: '📏 Limitations',
            value: '• **Length Limit**: 32 characters maximum\n• **Permission Required**: "Manage Nicknames" for others\n• **Hierarchy Respect**: Cannot change higher role nicknames\n• **Content Filter**: Appropriate names only',
            inline: false
          },
          {
            name: '💡 Tips',
            value: '• Use clear, descriptive commands\n• Specify exact nickname you want\n• Use "reset" to return to original username\n• Check permissions before trying to change others',
            inline: false
          }
        ])
        .setTimestamp();

    case 'apikeys':
      return new EmbedBuilder()
        .setColor(0x1ABC9C)
        .setTitle('🔑 API Keys')
        .setDescription('**Get unlimited usage with personal API keys:**')
        .addFields([
          {
            name: '🆓 Free Sources',
            value: '**Gemini API (Recommended):**\n• Visit: https://aistudio.google.com/app/apikey\n• Free tier: 15 requests/minute\n\n**Groq API (Fast):**\n• Visit: https://console.groq.com/keys\n• Free tier: Very generous limits',
            inline: false
          },
          {
            name: '⚡ Benefits',
            value: '• **Unlimited Usage**: No daily limits\n• **Faster Responses**: Direct API access\n• **Priority Processing**: Skip queues\n• **Advanced Features**: Latest models',
            inline: false
          },
          {
            name: '🔧 Setup',
            value: '1. Get API key from provider\n2. Use `/apikey set` command\n3. Paste key securely\n4. Enjoy unlimited access!',
            inline: false
          },
          {
            name: '🔒 Security',
            value: '• Keys are encrypted and stored securely\n• Only you can access your key\n• Can be removed anytime\n• Never shared or logged',
            inline: false
          }
        ])
        .setTimestamp();

    case 'tips':
      return new EmbedBuilder()
        .setColor(0x17A2B8)
        .setTitle('💡 Tips & Tricks')
        .setDescription('**Master Iris with these pro tips:**')
        .addFields([
          {
            name: '🗣️ Natural Language Commands',
            value: '• **Be Conversational**: "Hey Iris, can you mute that user?"\n• **Provide Context**: "Lock this channel for maintenance"\n• **Be Specific**: "Send welcome message to #general"\n• **Chain Actions**: Multiple commands in one message work!',
            inline: false
          },
          {
            name: '📤 Message Management Tips',
            value: '• **Safe by Design**: All pings are automatically disabled\n• **Use Descriptions**: "Send announcement about server rules"\n• **Target Channels**: Specify exact channel names\n• **React Appropriately**: Use relevant emojis for context',
            inline: false
          },
          {
            name: '🎯 Best Practices',
            value: '• Set up personal API key for unlimited usage\n• Use appropriate permissions for moderation\n• Keep conversations focused for better context\n• Upload relevant images for better AI understanding',
            inline: false
          },
          {
            name: '🚀 Advanced Features',
            value: '• **Multi-Model**: Try different models for different tasks\n• **Context Memory**: Reference previous conversations\n• **Media Processing**: Upload documents and images\n• **Function Chaining**: Combine multiple actions',
            inline: false
          }
        ])
        .setTimestamp();

    default:
      return new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Category Not Found')
        .setDescription('The requested help category was not found.')
        .setTimestamp();
  }
}