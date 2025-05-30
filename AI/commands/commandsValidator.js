/**
 * Validate command structures
 */

// Validate the command structure
function validateCommand(command) {
  if (!command || typeof command !== 'object') return false;
  
  // Check if it has required fields
  if (!command.function) return false;
  
  // Validate command type - UPDATED to include role management
  const validFunctions = ['mute', 'kick', 'ban', 'unmute', 'clear', 'lock', 'unlock', 'add_role', 'remove_role'];
  if (!validFunctions.includes(command.function)) return false;
  
  // Role management commands have different structure
  if (['add_role', 'remove_role'].includes(command.function)) {
    // Check for parameters object
    if (!command.parameters || typeof command.parameters !== 'object') {
      return false;
    }
    
    // Validate required parameters
    if (!command.parameters.userId || !command.parameters.roleId) {
      return false;
    }
    
    // Validate userId format (Discord ID)
    if (typeof command.parameters.userId !== 'string' || !/^\d{17,19}$/.test(command.parameters.userId.replace(/[<@!&>]/g, ''))) {
      return false;
    }
    
    // Validate roleId format (Discord ID)
    if (typeof command.parameters.roleId !== 'string' || !/^\d{17,19}$/.test(command.parameters.roleId)) {
      return false;
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