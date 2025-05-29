/**
 * Shared utility functions for command executors
 */

// Helper function to find a member by mention or username
async function findMember(guild, targetStr) {
  // Clean the mention string
  const userId = targetStr.replace(/[<@!&>]/g, '');
  
  try {
    // Try to fetch by ID first
    let member = await guild.members.fetch(userId).catch(() => null);
    
    // If not found by ID, try by username
    if (!member) {
      const members = await guild.members.fetch();
      member = members.find(m => 
        m.user.username.toLowerCase() === targetStr.toLowerCase() ||
        (m.nickname && m.nickname.toLowerCase() === targetStr.toLowerCase())
      );
    }
    
    return member;
  } catch (error) {
    console.error('Error finding member:', error);
    return null;
  }
}

// Parse duration string to milliseconds
function parseDuration(duration) {
  if (!duration || typeof duration !== 'string') {
    return null;
  }
  
  const match = duration.match(/^(\d+)([smhd])$/i);
  if (!match) {
    return null;
  }
  
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  switch (unit) {
    case 's': // seconds
      return value * 1000;
    case 'm': // minutes
      return value * 60 * 1000;
    case 'h': // hours
      return value * 60 * 60 * 1000;
    case 'd': // days
      return value * 24 * 60 * 60 * 1000;
    default:
      return null;
  }
}

module.exports = {
  findMember,
  parseDuration
};