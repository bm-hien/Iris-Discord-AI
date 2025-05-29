async function executeClear(message, command) {
  const { amount, reason } = command;
  const channel = message.channel;
  
  // Validate amount
  const deleteCount = parseInt(amount);
  if (isNaN(deleteCount) || deleteCount < 1 || deleteCount > 100) {
    return 'Invalid amount. Please specify a number between 1 and 100.';
  }
  
  try {
    // Fetch messages to delete (including the command message)
    const messages = await channel.messages.fetch({ limit: deleteCount });
    
    // Bulk delete messages
    const deletedMessages = await channel.bulkDelete(messages, true);
    
    // Log the action
    console.log(`${deletedMessages.size} messages deleted in #${channel.name} by ${message.author.username}. Reason: ${reason || 'No reason provided'}`);
    
    return `Successfully deleted ${deletedMessages.size} messages.`;
  } catch (error) {
    console.error('Error clearing messages:', error);
    
    // Handle specific error cases
    if (error.code === 50034) {
      return 'Cannot delete messages older than 14 days.';
    }
    
    return 'Cannot delete messages. Please check bot permissions.';
  }
}

module.exports = executeClear;