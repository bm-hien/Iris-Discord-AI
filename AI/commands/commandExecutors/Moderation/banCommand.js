const { findMember, parseDuration } = require('../Utils/shared/utils');

async function executeBan(message, command) {
  const { target, reason, duration } = command;
  const guild = message.guild;
  
  const member = await findMember(guild, target);
  if (!member) {
    return `Không tìm thấy thành viên: ${target}`;
  }
  
  const banOptions = {
    reason: reason || 'Không có lý do'
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
    return `Đã ban ${member.user.username} khỏi server.`;
  } catch (error) {
    console.error('Error banning member:', error);
    return 'Không thể ban thành viên. Vui lòng kiểm tra quyền của bot.';
  }
}

module.exports = executeBan;