# 🛡️ Security Policy

## Supported Versions

We actively maintain and provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | ✅ Fully supported |
| 0.x     | ❌ No longer supported |

---

## 🔒 Security Features

### 🔐 Data Protection

- **🗄️ Local Storage**: All conversation history stored locally in SQLite
- **🔑 API Key Encryption**: Personal API keys securely stored and never logged
- **🚫 No Data Collection**: Bot doesn't collect, store, or transmit user data to external services
- **🧹 User Control**: Users can clear their conversation history anytime with `/clear-history`

### 🛡️ Permission System

- **📊 Role Hierarchy Validation**: Prevents privilege escalation in moderation commands
- **✅ Permission Checks**: All moderation actions validate user permissions
- **🎭 Self-Action Prevention**: Users cannot perform moderation actions on themselves
- **👑 Owner Protection**: Server owners are protected from moderation actions

