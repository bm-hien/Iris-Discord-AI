// filepath: d:\Main\discord AI\AI\AI commands\commandsValidator.js
/**
 * Validate command structures
 */

// Validate the command structure
function validateCommand(command) {
  if (!command || typeof command !== 'object') return false;
  
  // Check if it has required fields
  if (!command.function) return false;
  
  // Validate command type - UPDATED to include lock and unlock
  const validFunctions = ['mute', 'kick', 'ban', 'unmute', 'clear', 'lock', 'unlock'];
  if (!validFunctions.includes(command.function)) return false;
  
  // Additional validation based on command type
  if (['mute', 'kick', 'ban', 'unmute'].includes(command.function) && !command.target) {
    return false;
  }
  
  // For clear command, target should be a number or a string that can be parsed to a number
  if (command.function === 'clear') {
    if (!command.target) {
      // Allow missing target (will use default in clearCommand.js)
      return true;
    }
    
    const amount = parseInt(command.target);
    if (isNaN(amount) || amount < 1 || amount > 100) {
      return false;
    }
  }
  
  // For lock and unlock commands, no target is required, reason is optional
  if (['lock', 'unlock'].includes(command.function)) {
    return true; // These commands don't require a target
  }
  
  return true;
}

module.exports = {
  validateCommand
};