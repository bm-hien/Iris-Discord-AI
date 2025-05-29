const { findMember } = require('../Utils/shared/utils');

async function executeUnmute(message, command) {
  const { target } = command;
  const guild = message.guild;
  
  const member = await findMember(guild, target);
  if (!member) {
    return `Member not found: ${target}`;
  }
  
  try {
    await member.timeout(null);
    return `Successfully unmuted ${member.user.username}.`;
  } catch (error) {
    console.error('Error unmuting member:', error);
    return 'Cannot unmute member. Please check bot permissions.';
  }
}

module.exports = executeUnmute;