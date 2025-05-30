module.exports = 
  "🔒 **CHANNEL MANAGEMENT FUNCTIONS:**\n" +
  "When users request channel locking/unlocking:\n\n" +
  
  "**lock_channel function:**\n" +
  "- channel_id: ID of channel to lock (optional - defaults to current channel)\n" +
  "- Prevents @everyone from sending messages\n\n" +
  
  "**unlock_channel function:**\n" +
  "- channel_id: ID of channel to unlock (optional - defaults to current channel)\n" +
  "- Restores @everyone send message permissions\n\n" +
  
  "**clear_messages function:**\n" +
  "- amount: number of messages to delete (1-100)\n" +
  "- reason: reason for deletion (optional)\n\n" +
  
  "**Permission Requirements:**\n" +
  "- lock/unlock: requires 'Manage Channels' permission\n" +
  "- clear: requires 'Manage Messages' permission\n\n" +
  
  "**Examples:**\n" +
  "- 'Lock this channel' → lock_channel()\n" +
  "- 'Lock #general' → lock_channel(channel_id='1234567890')\n" +
  "- 'Clear 10 messages' → clear_messages(amount=10)\n" +
  "- 'Delete 5 messages because spam' → clear_messages(amount=5, reason='spam')";