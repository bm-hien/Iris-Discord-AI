/**
 * Shared utility functions for command executors
 */

/**
 * Find a member in a guild by various identifiers
 * @param {Guild} guild - Discord guild object
 * @param {string} identifier - User ID, mention, or username
 * @returns {Promise<GuildMember|null>} - Found member or null
 */
async function findMember(guild, identifier) {
  if (!guild || !identifier) return null;
  
  try {
    // Remove mentions and get clean ID
    const cleanId = identifier.replace(/[<@!&>]/g, '');
    
    // Try to fetch by ID first
    if (/^\d+$/.test(cleanId)) {
      try {
        return await guild.members.fetch(cleanId);
      } catch (error) {
        // ID not found, continue to username search
      }
    }
    
    // Try to find by username or nickname
    const members = await guild.members.fetch();
    return members.find(member => 
      member.user.username.toLowerCase() === identifier.toLowerCase() ||
      (member.nickname && member.nickname.toLowerCase() === identifier.toLowerCase())
    ) || null;
    
  } catch (error) {
    console.error('Error finding member:', error);
    return null;
  }
}

/**
 * Parse duration string to milliseconds
 * @param {string} duration - Duration string like "1h", "30m", "7d"
 * @returns {number} - Duration in milliseconds
 */
function parseDuration(duration) {
  if (!duration || typeof duration !== 'string') return 0;
  
  const match = duration.match(/^(\d+)([smhd])$/i);
  if (!match) return 0;
  
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  switch (unit) {
    case 's': return value * 1000; // seconds
    case 'm': return value * 60 * 1000; // minutes
    case 'h': return value * 60 * 60 * 1000; // hours
    case 'd': return value * 24 * 60 * 60 * 1000; // days
    default: return 0;
  }
}

/**
 * Format duration from milliseconds to human readable string
 * @param {number} ms - Duration in milliseconds
 * @returns {string} - Formatted duration string
 */
function formatDuration(ms) {
  if (!ms || ms <= 0) return 'No duration';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  return `${seconds} second${seconds > 1 ? 's' : ''}`;
}

/**
 * Validate channel ID format
 * @param {string} channelId - Channel ID to validate
 * @returns {boolean} - Whether the ID is valid
 */
function isValidChannelId(channelId) {
  if (!channelId || typeof channelId !== 'string') return false;
  return /^\d{17,19}$/.test(channelId);
}

/**
 * Validate user ID format
 * @param {string} userId - User ID to validate
 * @returns {boolean} - Whether the ID is valid
 */
function isValidUserId(userId) {
  if (!userId || typeof userId !== 'string') return false;
  const cleanId = userId.replace(/[<@!&>]/g, '');
  return /^\d{17,19}$/.test(cleanId);
}

module.exports = {
  findMember,
  parseDuration,
  formatDuration,
  isValidChannelId,
  isValidUserId
};