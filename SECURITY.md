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
- **🔑 API Key Encryption**: Personal API keys encrypted with ChaCha20-Poly1305 (military-grade encryption)
- **🔐 Automatic Key Management**: Encryption keys auto-generated and stored securely
- **🔄 Legacy Migration**: Existing unencrypted keys automatically upgraded to encrypted format
- **🚫 No Data Collection**: Bot doesn't collect, store, or transmit user data to external services
- **🧹 User Control**: Users can clear their conversation history anytime with `/clear-history`

### 🛡️ Permission System

- **📊 Role Hierarchy Validation**: Prevents privilege escalation in moderation commands
- **✅ Permission Checks**: All moderation actions validate user permissions
- **🎭 Self-Action Prevention**: Users cannot perform moderation actions on themselves
- **👑 Owner Protection**: Server owners are protected from moderation actions

### 🔒 Encryption Details

- **Algorithm**: ChaCha20-Poly1305 (AEAD cipher)
- **Key Length**: 256 bits (32 bytes)
- **Nonce**: 96 bits (12 bytes) - randomly generated per encryption
- **Authentication**: 128-bit Poly1305 authentication tag
- **Key Storage**: Encryption keys stored in `.env` file (auto-generated if missing)
- **Format**: `nonce:ciphertext:auth_tag` (all base64 encoded)