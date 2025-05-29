const { findMember, parseDuration } = require('../Utils/shared/utils');

async function executeMute(message, command) {
  const { target, duration, reason } = command;
  const guild = message.guild;
  
  // Find the target member
  const member = await findMember(guild, target);
  if (!member) {
    return `Member not found: ${target}`;
  }
  
  // Parse duration - provide default if undefined
  const timeMs = parseDuration(duration || '10m'); // Default to 10 minutes if no duration provided
  if (!timeMs) {
    return 'Invalid duration format. Use format: 30s, 10m, 1h, 1d.';
  }
  
  try {
    await member.timeout(timeMs, reason || 'No reason provided');
    const durationText = duration || '10 minutes'; // Show default duration in response
    return `Successfully muted ${member.user.username} for ${durationText}.`;
  } catch (error) {
    console.error('Error muting member:', error);
    return 'Cannot mute member. Please check bot permissions.';
  }
}

module.exports = executeMute;