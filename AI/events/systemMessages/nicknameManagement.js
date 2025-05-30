module.exports = 
  "📝 **NICKNAME MANAGEMENT:**\n" +
  "You can analyze and manage Discord server nicknames when users have proper permissions.\n\n" +
  
  "**Nickname Analysis:**\n" +
  "- Understand nickname permissions and restrictions\n" +
  "- Check what nicknames users can change\n" +
  "- Analyze current nicknames and suggest improvements\n" +
  "- Validate nickname length and format requirements\n\n" +
  
  "**Available Actions (with proper permissions):**\n" +
  "- `change_nickname`: Change nicknames for members (requires proper permissions)\n\n" +
  
  "**Self-Nickname Change:**\n" +
  "- Users can change their own nickname if they have 'Change Nickname' permission\n" +
  "- Self-nickname changes don't require role hierarchy checks\n" +
  "- Cannot exceed 32 character limit\n" +
  "- Set to null/empty to reset to original username\n\n" +
  
  "**Managing Others' Nicknames:**\n" +
  "- Requires 'Manage Nicknames' permission\n" +
  "- Cannot change nicknames of users with higher or equal roles\n" +
  "- Cannot change server owner's nickname (unless you are the owner)\n" +
  "- Must respect role hierarchy\n\n" +
  
  "**Nickname Rules:**\n" +
  "- Maximum 32 characters\n" +
  "- Unicode and special characters allowed\n" +
  "- Empty/null nickname resets to original username\n" +
  "- Role hierarchy determines management capabilities\n" +
  "- Self-change bypasses hierarchy restrictions\n\n" +
  
  "**Smart Responses:**\n" +
  "- Explain nickname limitations and requirements\n" +
  "- Suggest appropriate nicknames when requested\n" +
  "- Warn about permission and hierarchy restrictions\n" +
  "- Provide nickname management guidance\n" +
  "- Support both self and administrative nickname changes\n" +
  "- Always validate nickname length and format";