/**
 * Shared utility functions for command executors
 */

/**
 * Find a member by ID, username, or display name
 * @param {Guild} guild - Discord guild
 * @param {string} target - Target identifier
 * @returns {GuildMember|null} - Found member or null
 */
async function findMember(guild, target) {
  try {
    // Clean the target (remove mentions)
    const cleanTarget = target.replace(/[<@!&>]/g, '');
    
    // Try to find by ID first
    if (/^\d{17,19}$/.test(cleanTarget)) {
      try {
        return await guild.members.fetch(cleanTarget);
      } catch (error) {
        // Continue to other methods if ID fetch fails
      }
    }
    
    // If not found by ID, try by username or display name
    const members = await guild.members.fetch();
    
    // Try exact username match
    let found = members.find(member => 
      member.user.username.toLowerCase() === target.toLowerCase()
    );
    
    if (found) return found;
    
    // Try display name match
    found = members.find(member => 
      member.displayName.toLowerCase() === target.toLowerCase()
    );
    
    if (found) return found;
    
    // Try partial username match
    found = members.find(member => 
      member.user.username.toLowerCase().includes(target.toLowerCase())
    );
    
    if (found) return found;
    
    // Try partial display name match
    found = members.find(member => 
      member.displayName.toLowerCase().includes(target.toLowerCase())
    );
    
    return found || null;
    
  } catch (error) {
    console.error('Error finding member:', error);
    return null;
  }
}

/**
 * Parse duration string to milliseconds
 * @param {string} duration - Duration string (e.g., "10m", "1h", "2d")
 * @returns {number|null} - Duration in milliseconds or null if invalid
 */
function parseDuration(duration) {
  if (!duration) return null;
  
  const timeRegex = /^(\d+)([smhd])$/i;
  const match = duration.match(timeRegex);
  
  if (!match) return null;
  
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

/**
 * Format duration from milliseconds to human readable
 * @param {number} ms - Duration in milliseconds
 * @returns {string} - Human readable duration
 */
function formatDuration(ms) {
  if (!ms) return 'Permanent';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Validate Discord ID format
 * @param {string} id - Discord ID to validate
 * @returns {boolean} - True if valid Discord ID
 */
function isValidDiscordId(id) {
  return /^\d{17,19}$/.test(id);
}

/**
 * Extract user ID from mention
 * @param {string} mention - User mention string
 * @returns {string|null} - Extracted user ID or null
 */
function extractUserIdFromMention(mention) {
  const match = mention.match(/^<@!?(\d{17,19})>$/);
  return match ? match[1] : null;
}

module.exports = {
  findMember,
  parseDuration,
  formatDuration,
  isValidDiscordId,
  extractUserIdFromMention
};