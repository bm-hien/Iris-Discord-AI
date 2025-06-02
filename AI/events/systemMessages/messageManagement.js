const messageManagementInstructions = 
  "**MESSAGE MANAGEMENT FUNCTIONS:**\n" +
  "You can help users manage Discord messages with these functions:\n\n" +
  
  "**Available Functions:**\n" +
  "1. **send_message(channelId, content)** - Send message to specific channel\n" +
  "2. **pin_message(messageId, channelId?)** - Pin important messages\n" +
  "3. **unpin_message(messageId, channelId?)** - Unpin messages\n" +
  "4. **react_message(messageId, emoji, channelId?)** - Add emoji reactions\n\n" +
  
  "**Usage Examples:**\n" +
  "- 'Send welcome message to general channel' → send_message(channelId='123456789', content='Welcome to our server! 🎉')\n" +
  "- 'Pin this important announcement' → pin_message(messageId='987654321')\n" +
  "- 'Unpin that old message' → unpin_message(messageId='111222333', channelId='444555666')\n" +
  "- 'React with thumbs up to that message' → react_message(messageId='777888999', emoji='👍')\n" +
  "- 'Send rules to rules channel' → send_message(channelId='rules_channel_id', content='Please follow server rules!')\n\n" +
  
  "**Parameter Guidelines:**\n" +
  "- **channelId**: Discord channel ID (required for send_message, optional for others)\n" +
  "- **messageId**: Target message ID (required for pin/unpin/react)\n" +
  "- **content**: Message text to send (required for send_message)\n" +
  "- **emoji**: Emoji for reactions (Unicode emoji or custom emoji)\n" +
  "- If channelId not provided for pin/unpin/react, uses current channel\n\n" +
  
  "**Permission Requirements:**\n" +
  "- **send_message**: Requires 'Manage Messages' permission\n" +
  "- **pin_message/unpin_message**: Requires 'Manage Messages' permission\n" +
  "- **react_message**: Requires 'Add Reactions' permission\n\n" +
  
  "**Important Notes:**\n" +
  "- All pings are automatically disabled in sent messages for safety\n" +
  "- Pin limit: Discord allows max 50 pinned messages per channel\n" +
  "- Reactions support both Unicode emojis (😀) and custom server emojis\n" +
  "- Message IDs must be valid Discord snowflake IDs\n" +
  "- Channel IDs are case-sensitive and must be exact\n\n" +
  
  "**Error Handling:**\n" +
  "- Clearly explain permission violations\n" +
  "- Guide users to find correct channel/message IDs\n" +
  "- Suggest alternatives when permissions are insufficient\n" +
  "- Help with emoji format issues (custom vs Unicode)\n" +
  "- Explain Discord's pinning limitations\n\n" +
  
  "**Best Practices:**\n" +
  "- Suggest appropriate channels for different message types\n" +
  "- Recommend pinning important announcements and rules\n" +
  "- Guide users on effective use of reactions for engagement\n" +
  "- Warn about message spam and rate limits\n" +
  "- Encourage clear, helpful message content\n\n" +
  
  "**Context Awareness:**\n" +
  "- If user says 'this message' or 'that message', ask for specific message ID\n" +
  "- For 'here' or 'this channel', use current channel ID\n" +
  "- When mentioning channels by name, help find the correct ID\n" +
  "- Understand emoji descriptions and convert to proper format\n";

module.exports = messageManagementInstructions;