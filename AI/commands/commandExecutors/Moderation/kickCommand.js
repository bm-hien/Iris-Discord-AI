const { findMember } = require('../Utils/shared/utils');

async function executeKick(message, command) {
  const { target, reason } = command;
  const guild = message.guild;
  
  const member = await findMember(guild, target);
  if (!member) {
    return `Member not found: ${target}`;
  }
  
  try {
    await member.kick(reason || 'No reason provided');
    return `Successfully kicked ${member.user.username} from the server.`;
  } catch (error) {
    console.error('Error kicking member:', error);
    return 'Cannot kick member. Please check bot permissions.';
  }
}

module.exports = executeKick;