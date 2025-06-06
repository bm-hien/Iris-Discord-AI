# 🤖 Iris Discord AI Bot

<div align="center">

![Discord](https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

**Intelligent Discord AI Bot with Multi-Provider Support & Advanced Moderation**

[🚀 Add to Server](https://discord.com/oauth2/authorize?client_id=1329852158241411072&permissions=1409222306998&integration_type=0&scope=bot) • [📖 Self-Host Guide](#-quick-start) • [⚙️ Configuration](#️-configuration) • [🤝 Contributing](#-contributing)

[![Add to Discord](https://img.shields.io/badge/Add%20to-Discord-7289da?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com/oauth2/authorize?client_id=1329852158241411072&permissions=1409222306998&integration_type=0&scope=bot)
[![GitHub stars](https://img.shields.io/github/stars/bm-hien/Iris-Discord-AI?style=social)](https://github.com/bm-hien/Iris-Discord-AI/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/bm-hien/Iris-Discord-AI)](https://github.com/bm-hien/Iris-Discord-AI/issues)

</div>

---

## 📖 About

Iris is a powerful Discord AI bot that integrates multiple AI providers (Gemini, OpenAI, Groq) with advanced conversation capabilities, intelligent moderation, and rich media processing.

## ✨ Key Features

- 🧠 **Multi-AI Provider Support** - Seamlessly switch between Gemini, OpenAI, and Groq
- 🛡️ **AI-Powered Moderation** - Natural language command processing for server management
- 🌐 **URL Context Analysis** - Analyze web content directly in conversations
- 📱 **Rich Media Processing** - Image and video analysis with AI vision
- 💾 **Conversation Memory** - Persistent chat history with SQLite
- 🔑 **Personal API Keys** - Users can set their own API keys for unlimited usage

## 🚀 Quick Start

### Prerequisites
- Node.js 18.0.0 or higher
- Discord Bot Token
- AI API Key 

### Installation

```bash
# Clone and install
git clone https://github.com/bm-hien/Iris-Discord-AI.git
cd Iris-Discord-AI
npm install

# Configure environment
cp .env.example .env
# Edit .env with your tokens

# Start the bot
npm start
```

## ⚙️ Configuration

Edit your `.env` file:

```env
# Discord (Required)
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_bot_client_id

# AI Configuration
DEFAULT_AI_PROVIDER=gemini
DEFAULT_GEMINI_API_KEY=your_gemini_api_key

# Optional: Additional Providers
DEFAULT_OPENAI_API_KEY=your_openai_api_key
DEFAULT_GROQ_API_KEY=your_groq_api_key
```

## 📖 Commands

### Basic Usage
- Simply mention the bot or send a message to start chatting
- Use `/apikey set` to configure your personal API key
- Use `/model set` to switch between AI models
- Use `/clear-history` to reset conversation history

### Moderation (Natural Language)
- "Mute @user for spamming"
- "Clear 10 messages"
- "Lock this channel"
- "Ban @user for harassment"

## 🏗️ Architecture

```
AI/
├── ai.js                    # Main AI module
├── functions/               # Core AI processing
│   ├── generateResponse.js  # AI response generation
│   ├── mediaProcessor.js    # Image/video processing
│   └── functionCalling.js   # Discord function integration
├── commands/                # AI command processing
└── events/                  # Database & system management
```

## 🤝 Contributing

We welcome contributions! Please check our [issues](https://github.com/bm-hien/Iris-Discord-AI/issues) for ways to help.

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- **🤖 Add Public Bot**: [Invite to your server](https://discord.com/oauth2/authorize?client_id=1329852158241411072&permissions=1409222306998&integration_type=0&scope=bot)
- **📚 Documentation**: [Online Docs](https://bm-hien.github.io/Iris-Discord-AI/)
- **🐛 Bug Reports**: [Create an issue](https://github.com/bm-hien/Iris-Discord-AI/issues)
- **💡 Feature Requests**: [Submit suggestions](https://github.com/bm-hien/Iris-Discord-AI/issues)
- **💬 Support**: [Join our Discord](https://discord.gg/pevruS26Au)
- **☕ Support Development**: [Buy me a coffee](https://buymeacoffee.com/bmhien)

---

<div align="center">

**Made with ❤️ by [Bmhien](https://github.com/bm-hien)**

*Bringing AI-powered intelligence to Discord communities worldwide*

**☕ [Support the project](https://buymeacoffee.com/bmhien)**

</div>