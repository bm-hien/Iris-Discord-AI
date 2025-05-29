const { findMember, parseDuration } = require('../Utils/shared/utils');

async function executeMute(message, command) {
  const { target, duration, reason } = command;
  const guild = message.guild;
  
  // Find the target member
  const member = await findMember(guild, target);
  if (!member) {
    return `Không tìm thấy thành viên: ${target}`;
  }
  
  // Parse duration - provide default if undefined
  const timeMs = parseDuration(duration || '10m'); // Default to 10 minutes if no duration provided
  if (!timeMs) {
    return 'Thời gian không hợp lệ. Sử dụng định dạng: 30s, 10m, 1h, 1d.'; // Updated to include seconds
  }
  
  try {
    await member.timeout(timeMs, reason || 'Không có lý do');
    const durationText = duration || '10 phút'; // Show default duration in response
    return `Đã tạm thời hạn chế quyền chat của ${member.user.username} trong ${durationText}.`;
  } catch (error) {
    console.error('Error muting member:', error);
    return 'Không thể mute thành viên. Vui lòng kiểm tra quyền của bot.';
  }
}

module.exports = executeMute;