const { findMember } = require('../Utils/shared/utils');

async function executeUnmute(message, command) {
  const { target } = command;
  const guild = message.guild;
  
  const member = await findMember(guild, target);
  if (!member) {
    return `Không tìm thấy thành viên: ${target}`;
  }
  
  try {
    await member.timeout(null);
    return `Đã bỏ hạn chế quyền chat cho ${member.user.username}.`;
  } catch (error) {
    console.error('Error unmuting member:', error);
    return 'Không thể unmute thành viên. Vui lòng kiểm tra quyền của bot.';
  }
}

module.exports = executeUnmute;