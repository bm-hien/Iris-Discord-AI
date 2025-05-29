const { findMember } = require('../Utils/shared/utils');

async function executeKick(message, command) {
  const { target, reason } = command;
  const guild = message.guild;
  
  const member = await findMember(guild, target);
  if (!member) {
    return `Không tìm thấy thành viên: ${target}`;
  }
  
  try {
    await member.kick(reason || 'Không có lý do');
    return `Đã kick ${member.user.username} khỏi server.`;
  } catch (error) {
    console.error('Error kicking member:', error);
    return 'Không thể kick thành viên. Vui lòng kiểm tra quyền của bot.';
  }
}

module.exports = executeKick;