/**
 * Validate command structures
 */

// Validate the command structure
function validateCommand(command) {
  if (!command || typeof command !== 'object') return false;
  
  // Check if it has required fields
  if (!command.function) return false;
  
  // Validate command type - UPDATED to include all role functions
  const validFunctions = ['mute', 'kick', 'ban', 'unmute', 'clear', 'lock', 'unlock', 'add_role', 'remove_role', 'change_nickname', 'create_role', 'delete_role', 'edit_role', 'move_role', 'create_channel', 'delete_channel', 'edit_channel', 'clone_channel', 'send_message', 'pin_message', 'unpin_message', 'react_message'];
  if (!validFunctions.includes(command.function)) return false;
  
  // Role management and nickname commands have different structure
  if (['add_role', 'remove_role', 'change_nickname', 'create_role', 'delete_role', 'edit_role', 'move_role', 'create_channel', 'delete_channel', 'edit_channel', 'clone_channel', 'send_message', 'pin_message', 'unpin_message', 'react_message'].includes(command.function)) {
    // Check for parameters object
    if (!command.parameters || typeof command.parameters !== 'object') {
      return false;
    }
    if (['send_message'].includes(command.function)) {
      if (!command.parameters.content || typeof command.parameters.content !== 'string') {
        return false;
      }
    }
    if (['pin_message', 'unpin_message', 'react_message'].includes(command.function)) {
      if (!command.parameters.messageId || typeof command.parameters.messageId !== 'string') {
        return false;
      }
    }
    if (command.function === 'create_channel') {
      if (!command.parameters.channelName || typeof command.parameters.channelName !== 'string') {
        return false;
      }
    }
    if (['delete_channel', 'edit_channel', 'clone_channel'].includes(command.function)) {
      if (!command.parameters.channelId || typeof command.parameters.channelId !== 'string') {
        return false;
      }
    }
    // Validate required parameters based on function
    if (['add_role', 'remove_role', 'change_nickname'].includes(command.function)) {
      if (!command.parameters.userId) {
        return false;
      }
      
      // Validate userId format (Discord ID)
      if (typeof command.parameters.userId !== 'string' || !/^\d{17,19}$/.test(command.parameters.userId.replace(/[<@!&>]/g, ''))) {
        return false;
      }
    }
    
    // For role commands that need roleId
    if (['add_role', 'remove_role', 'delete_role', 'edit_role', 'move_role'].includes(command.function)) {
      if (!command.parameters.roleId || typeof command.parameters.roleId !== 'string') {
        return false;
      }
      
      // Validate roleId format (Discord ID) - except for create_role which doesn't need it
      if (!['create_role'].includes(command.function)) {
        if (!/^\d{17,19}$/.test(command.parameters.roleId)) {
          return false;
        }
      }
    }
    
    // For create_role, validate roleName
    if (command.function === 'create_role') {
      if (!command.parameters.roleName || typeof command.parameters.roleName !== 'string') {
        return false;
      }
    }
    
    // For nickname command, validate nickname if provided
    if (command.function === 'change_nickname' && command.parameters.nickname) {
      if (typeof command.parameters.nickname !== 'string' || command.parameters.nickname.length > 32) {
        return false;
      }
    }
    
    return true;
  }
  
  // Traditional moderation commands validation
  if (['mute', 'kick', 'ban', 'unmute'].includes(command.function) && !command.target) {
    return false;
  }
  
  // For clear command, target should be a number or a string that can be parsed to a number
  if (command.function === 'clear') {
    if (!command.target && !command.amount) {
      // Allow missing target/amount (will use default in clearCommand.js)
      return true;
    }
    
    const amount = command.amount || parseInt(command.target);
    if (isNaN(amount) || amount < 1 || amount > 100) {
      return false;
    }
  }
  
  return true;
}

module.exports = {
  validateCommand
};