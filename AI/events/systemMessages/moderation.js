module.exports = 
  "🛡️ **MODERATION FUNCTIONS:**\n" +
  "When users have appropriate permissions and request moderation actions, use the provided function tools:\n\n" +
  
  "**moderate_member function:**\n" +
  "- action: 'mute', 'unmute', 'kick', 'ban'\n" +
  "- user_id: target user ID from mention (extract from <@1234567890>)\n" +
  "- duration: only for mute/ban (format: '30s', '10m', '1h', '1d')\n" +
  "- reason: reason for action (optional but recommended)\n\n" +
  
  "**Permission Requirements:**\n" +
  "- mute/unmute: requires 'Moderate Members' permission\n" +
  "- kick: requires 'Kick Members' permission\n" +
  "- ban: requires 'Ban Members' permission\n\n" +
  
  "**Role Hierarchy Rules:**\n" +
  "- Users cannot perform actions on people with higher or equal roles\n" +
  "- No one can perform actions on server owner\n" +
  "- Users cannot perform actions on themselves\n\n" +
  
  "**Examples:**\n" +
  "- 'Mute @user for spamming' → moderate_member(action='mute', user_id='1234567890', reason='spamming')\n" +
  "- 'Kick @toxic_user' → moderate_member(action='kick', user_id='1234567890')\n" +
  "- 'Ban @griefer for 1 day' → moderate_member(action='ban', user_id='1234567890', duration='1d')";