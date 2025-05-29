# 🤖 Iris Discord AI Bot

<div align="center">

![Discord](https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)

**🎯 Intelligent Discord AI Bot with Multi-Provider Support & Advanced Moderation**

[🚀 Demo](#-demo) • [📋 Features](#-features) • [🛠️ Setup](#️-setup) • [📖 Usage](#-usage) • [🤝 Contributing](#-contributing)

</div>

---

## 📖 About

**Iris Discord AI Bot** is an intelligent, feature-rich Discord bot powered by multiple AI providers including Gemini, OpenAI, and Groq. Built with Node.js, it offers advanced conversational AI capabilities, powerful moderation tools, and rich media processing - all through an intuitive interface.

### ✨ Why Choose Iris?

- 🧠 **Multi-AI Provider Support** - Seamlessly switch between Gemini, OpenAI, and Groq
- 🔧 **AI-Powered Moderation** - Smart function calling for automated server management
- 🌐 **URL Context Analysis** - Read and analyze web content directly in conversations
- 📱 **Rich Discord Integration** - Beautiful embeds, slash commands, and interactive elements
- 🛡️ **Advanced Permission System** - Role hierarchy checks and security validation
- 📊 **Conversation Memory** - Persistent chat history for contextual conversations
- 🎨 **Media Processing** - Image and video analysis with AI vision capabilities

---

## 🎯 Key Features

### 🤖 AI & Conversation
```
✅ Multi-Provider AI Support (Gemini, OpenAI, Groq)
✅ Intelligent conversation memory with SQLite storage
✅ Custom AI personalities per user
✅ Advanced prompt engineering with system messages
✅ Automatic failover between providers
✅ Personal API key support for unlimited usage
```

### 🌐 URL Context & Web Analysis
```
✅ Direct web content analysis from URLs
✅ Multi-URL comparison and synthesis
✅ Smart model compatibility detection
✅ Automatic content summarization
✅ Source citation and metadata display
```

### 🛡️ AI-Powered Moderation
```
✅ Function calling for moderation actions
✅ Natural language command processing
✅ Role hierarchy validation
✅ Permission-based access control
✅ Comprehensive audit logging
```

**Available Moderation Commands:**
- **Member Management**: `mute`, `unmute`, `kick`, `ban`
- **Message Management**: Bulk delete with smart filtering
- **Channel Control**: `lock`, `unlock` channels
- **Advanced Targeting**: Support for mentions, usernames, and IDs

### 📱 Rich Media Support
```
✅ Image analysis and description
✅ Video frame processing
✅ Multi-format support (JPEG, PNG, GIF, MP4, etc.)
✅ Detailed Vietnamese descriptions
✅ Context-aware media interpretation
```

### 🔧 Technical Features
```
✅ Slash commands (/apikey, /model, /clear-history)
✅ Environment-based configuration
✅ Comprehensive error handling
✅ Rate limiting protection
✅ Graceful shutdown handling
✅ Modular architecture
```

---

## 🛠️ Setup

### 📋 Prerequisites
- **Node.js** 18.0.0 or higher
- **NPM** or **Yarn** package manager
- **Discord Bot Token** ([Get one here](https://discord.com/developers/applications))
- **AI API Key** (Optional but recommended)

### 1️⃣ Clone & Install

```bash
# Clone the repository
git clone https://github.com/yourusername/iris-discord-ai.git
cd iris-discord-ai

# Install dependencies
npm install

# Create environment configuration
cp .env.example .env
```

### 2️⃣ Discord Bot Setup

1. **Create Discord Application**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Click **"New Application"** → Enter bot name
   - Navigate to **"Bot"** section → Click **"Add Bot"**

2. **Configure Bot Permissions**
   - In **Bot** section, copy the **Token**
   - Enable these **Privileged Gateway Intents**:
     - ✅ **Message Content Intent**
     - ✅ **Server Members Intent** 
     - ✅ **Presence Intent**

3. **Invite Bot to Server**
   - Go to **OAuth2** → **URL Generator**
   - Select **Scopes**: `bot`, `applications.commands`
   - Select **Bot Permissions**: `Administrator` (or customize as needed)
   - Use generated URL to invite bot

### 3️⃣ Environment Configuration

Edit your `.env` file:

```env
# Discord Configuration (REQUIRED)
DISCORD_BOT_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_bot_client_id_here

# AI Configuration
DEFAULT_AI_PROVIDER=gemini
DEFAULT_GEMINI_API_KEY=your_gemini_api_key_here
DEFAULT_GEMINI_MODEL=gemini-2.5-flash-preview-05-20

# Optional: Additional Providers
DEFAULT_OPENAI_API_KEY=your_openai_api_key_here
DEFAULT_GROQ_API_KEY=your_groq_api_key_here

# Bot Settings
BOT_NAME=Iris
BOT_VERSION=1.0.0
BOT_STUDIO=Iris Studio
```

### 4️⃣ Launch Bot

```bash
# Start the bot
npm start

# For development (with auto-restart)
npm run dev
```

**✅ Success!** Your bot should now be online and ready to use.

---

## 🎯 Usage

### 💬 Basic Chat

Simply mention the bot or send a DM to start chatting:

```
@Iris Hello! How are you today?
Iris, can you help me with something?
```

**Bot Response Example:**
```
🤖 Iris

Hi! I'm Iris, your AI assistant! 😊 

I can help you:
• 💬 Chat and answer questions
• 🌐 Parse content from URLs
• 🛡️ Manage servers (if you have permissions)
• 🖼️ Describe images and videos

What can I help you with today?✨

Reply to @username • Provider: gemini
```

### 🔑 API Key Management

**Set Personal API Key:**
```bash
/apikey set your-api-key-here
```

**Check API Key Status:**
```bash
/apikey info
```

**Remove API Key:**
```bash
/apikey remove
```

**🆓 Get Free API Keys:**
- **Gemini**: [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Groq**: [Groq Console](https://console.groq.com/keys)  
- **OpenAI**: [OpenAI Platform](https://platform.openai.com/api-keys)

### 🤖 AI Model Management

**List Available Models:**
```bash
/model list
```

**Switch Models:**
```bash
/model set gemini-2.5-flash-preview-05-20
/model set gpt-4o-mini
/model set llama-3.3-70b-versatile
```

**Check Current Model:**
```bash
/model info
```

### 🌐 URL Context Analysis

Send URLs in your message for automatic analysis:

```
Iris, please summarize this article: https://example.com/article

Compare these two websites:
- https://site1.com
- https://site2.com
```

**⚠️ URL Context Requirements:**
- Only works with compatible Gemini models
- Cannot be used simultaneously with function calling
- Supports up to 5 URLs per message

**✅ Compatible Models:**
- `gemini-2.5-flash-preview-05-20` (Recommended)
- `gemini-2.5-pro-preview-05-06`
- `gemini-2.0-flash`
- `gemini-2.0-flash-live-001`

### 🛡️ AI-Powered Moderation

Iris can execute moderation commands through natural language when you have the appropriate permissions:

**Member Moderation:**
```
Iris, mute @user for 10 minutes spam
Kick @troublemaker from the server
Ban @spammer reason: repeated violations
```

**Message Management:**
```
Delete the last 50 messages
Clear 20 messages from this channel
```

**Channel Control:**
```
Lock this channel
Unlock the general channel
```

**📋 Required Permissions:**
- **Mute/Unmute**: `Moderate Members`
- **Kick**: `Kick Members`
- **Ban**: `Ban Members`
- **Clear Messages**: `Manage Messages`
- **Lock/Unlock**: `Manage Channels`

### 🖼️ Media Analysis

Send images or videos with your message:

```
@Iris [Upload image] What do you see in this image?
@Iris [Upload video] Describe what's happening in this video
```

**Supported Formats:**
- **Images**: JPEG, PNG, GIF, WebP
- **Videos**: MP4, MOV, AVI, WebM

### 📊 System Commands

**Clear Conversation History:**
```bash
/clear-history
```

**System Information** (Developer only):
```bash
/system
```

---

## 🏗️ Architecture

```
iris-discord-ai/
├── 📁 AI/                          # Core AI functionality
│   ├── 📁 commands/                # Command processing system
│   │   ├── commandExtractor.js     # Extract commands from text
│   │   ├── commandHandler.js       # Handle command execution
│   │   ├── commandsValidator.js    # Validate commands
│   │   └── 📁 commandExecutors/    # Individual command implementations
│   │       ├── 📁 Moderation/      # Moderation command executors
│   │       └── 📁 Utils/           # Utility command executors
│   ├── 📁 events/                  # AI events & database
│   │   ├── database.js             # SQLite database operations
│   │   └── systemMessage.js        # System prompts & personalities
│   ├── 📁 functions/               # Core AI processing
│   │   ├── functionCalling.js      # Function calling definitions
│   │   ├── generateResponse.js     # Main AI response generation
│   │   ├── mediaProcessor.js       # Image/video processing
│   │   └── responseFormatter.js    # Format responses for Discord
│   ├── 📁 utilities/               # Helper utilities
│   │   ├── formatters.js           # Text formatting utilities
│   │   ├── pagination.js           # Embed pagination system
│   │   └── urlExtractor.js         # URL extraction & validation
│   └── ai.js                       # Main AI module exports
├── 📁 commands/                    # Discord slash commands
│   └── 📁 AI/                      # AI-related slash commands
├── 📁 config/                      # Configuration management
│   └── config.js                   # Environment configuration loader
├── 📁 events/                      # Discord event handlers
│   ├── 📁 utils/                   # Event utility functions
│   │   ├── permissions.js          # Permission checking system
│   │   └── userInfo.js             # User information extraction
│   ├── interactionCreate.js        # Slash command handler
│   ├── messageCreate.js            # Message event handler
│   └── ready.js                    # Bot ready event handler
├── 📁 locale/                      # Internationalization (future)
│   └── en.js                       # English locale definitions
├── 📄 .env.example                 # Environment variables template
├── 📄 .gitignore                   # Git ignore rules
├── 📄 index.js                     # Application entry point
├── 📄 package.json                 # Project dependencies
└── 📄 README.md                    # This file
```

### 🔧 Key Components

**🧠 AI Engine** ([`AI/functions/generateResponse.js`](AI/functions/generateResponse.js))
- Multi-provider AI integration
- Function calling support
- URL context processing
- Media analysis capabilities

**🛡️ Moderation System** ([`AI/commands/`](AI/commands/))
- Natural language command extraction
- Permission validation
- Role hierarchy checking
- Comprehensive audit logging

**💾 Database Layer** ([`AI/events/database.js`](AI/events/database.js))
- SQLite conversation storage
- User preferences management
- API key secure storage
- Chat history persistence

**🎨 Response Formatting** ([`AI/functions/responseFormatter.js`](AI/functions/responseFormatter.js))
- Markdown to Discord formatting
- Code block extraction
- Embed generation
- Content pagination

---

## ⚙️ Configuration

### 🔧 Advanced Settings

Customize your bot behavior in `.env`:

```env
# Features Toggle
ENABLE_URL_CONTEXT=true
ENABLE_FUNCTION_CALLING=true
ENABLE_IMAGE_PROCESSING=true
ENABLE_VIDEO_PROCESSING=true

# Bot Behavior
MAX_CONVERSATION_HISTORY=10
BOT_STATUS=online
BOT_ACTIVITY_TYPE=WATCHING
BOT_ACTIVITY_TEXT=for /help commands

# Development
DEBUG_MODE=false
DEVELOPER_GUILD_ID=your_test_server_id
```

### 📊 Database Schema

```sql
-- Conversation History
conversations (
  id INTEGER PRIMARY KEY,
  user_id TEXT,
  role TEXT,
  content TEXT,
  username TEXT,
  timestamp DATETIME
)

-- User Settings  
user_settings (
  user_id TEXT PRIMARY KEY,
  api_key TEXT,
  model TEXT,
  provider TEXT,
  endpoint TEXT
)

-- Custom System Messages
custom_system_messages (
  user_id TEXT PRIMARY KEY,
  bot_name TEXT,
  personality TEXT,
  instructions TEXT
)
```

---

## 🚀 Development

### 🔧 Contributing

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open Pull Request**

### 🧪 Development Setup

```bash
# Install development dependencies
npm install --dev

# Run in development mode with auto-restart
npm run dev

# Check configuration
npm run config:check

# Create environment from example
npm run config:example
```

### 📝 Code Style

- **Language**: JavaScript (ES6+)
- **Comments**: English for code, Vietnamese for user-facing content
- **Formatting**: 2-space indentation, semicolons required
- **Documentation**: JSDoc for all functions

---

## 🔒 Security & Privacy

### 🛡️ Security Features

- **🔐 API Key Encryption**: Personal API keys stored securely
- **🎭 Permission Validation**: Role hierarchy and permission checks
- **🚫 Rate Limiting**: Built-in protection against abuse
- **🔍 Input Validation**: Sanitized user inputs and commands
- **📋 Audit Logging**: Comprehensive action logging

### 🔒 Privacy Commitment

- **📊 Local Storage**: All data stored locally in SQLite
- **🚫 No Data Mining**: Bot doesn't collect or sell user data
- **🗂️ Data Control**: Users can clear their data anytime
- **🔒 API Key Security**: Personal keys never logged or shared

---

## 📞 Support & Resources

### 🆘 Getting Help

- **📚 Documentation**: Check this README and inline code comments
- **🐛 Bug Reports**: [Create an issue](https://github.com/bm-hien/Iris-Discord-AI/issues)
- **💡 Feature Requests**: [Submit suggestions](https://github.com/bm-hien/Iris-Discord-AI/issues)
- **💬 Community**: [Join our Discord server](https://discord.gg/pevruS26Au)

### 📖 Useful Links

- **🔧 Discord Developer Portal**: https://discord.com/developers/applications
- **🤖 Discord.js Documentation**: https://discord.js.org/
- **🧠 Gemini API Docs**: https://ai.google.dev/docs
- **⚡ Groq API Docs**: https://console.groq.com/docs
- **🔥 OpenAI API Docs**: https://platform.openai.com/docs

### 🔍 Troubleshooting

**❌ Bot not responding?**
- Check if bot is online in server member list
- Verify bot has necessary permissions
- Ensure correct intents are enabled

**❌ Function calling not working?**
- Confirm user has required permissions
- Check if target user role hierarchy allows action
- Verify model supports function calling

**❌ URL context not working?**
- Ensure using compatible Gemini model
- Check if URLs are valid and accessible
- Verify no function calling conflict

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2025 Iris Studio

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

## 🙏 Acknowledgments

### 💎 Built With

- **[Discord.js](https://discord.js.org/)** - Discord API library
- **[Google Generative AI](https://ai.google.dev/)** - Gemini API integration
- **[OpenAI](https://openai.com/)** - GPT models and API
- **[Groq](https://groq.com/)** - Fast AI inference
- **[SQLite3](https://www.sqlite.org/)** - Local database solution

### 👥 Contributors

- **[bmhien](https://github.com/bm-hien)** - Lead Developer (lol)

### 🎉 Special Thanks

- Discord.js community for excellent documentation
- Google AI team for powerful Gemini API
- Open source community for inspiration and tools

---

<div align="center">

**⭐ Star this repository if you find it useful! ⭐**

**🔗 Share with your Discord community! 🔗**

---

**Made with ❤️ by [Bmhien](https://github.com/bm-hien)**

*"Bringing AI-powered intelligence to Discord communities worldwide"*

[![GitHub stars](https://img.shields.io/github/stars/bm-hien/Iris-Discord-AI?style=social)](https://github.com/bm-hien/Iris-Discord-AI/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/bm-hien/Iris-Discord-AI?style=social)](https://github.com/bm-hien/Iris-Discord-AI/network/members)
[![GitHub issues](https://img.shields.io/github/issues/bm-hien/Iris-Discord-AI)](https://github.com/bm-hien/Iris-Discord-AI/issues)

</div>
