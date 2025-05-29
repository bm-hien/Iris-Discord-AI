const { findMember, parseDuration } = require('../Utils/shared/utils');

async function executeBan(message, command) {
  const { target, reason, duration } = command;
  const guild = message.guild;
  
  const member = await findMember(guild, target);
  if (!member) {
    return `Member not found: ${target}`;
  }
  
  const banOptions = {
    reason: reason || 'No reason provided'
  };
  
  // If duration is specified, add days option
  if (duration) {
    const days = Math.ceil(parseDuration(duration) / (24 * 60 * 60 * 1000));
    if (days > 0 && days <= 7) {
      banOptions.deleteMessageDays = days;
    }
  }
  
  try {
    await member.ban(banOptions);
    return `Successfully banned ${member.user.username} from the server.`;
  } catch (error) {
    console.error('Error banning member:', error);
    return 'Cannot ban member. Please check bot permissions.';
  }
}

module.exports = executeBan;