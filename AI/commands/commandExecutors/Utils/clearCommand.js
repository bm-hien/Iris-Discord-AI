async function executeClear(message, command) {
  const amount = parseInt(command.target) || 5; // Using target as amount
  
  if (isNaN(amount) || amount < 1 || amount > 100) {
    return 'Số lượng tin nhắn cần xóa phải từ 1 đến 100.';
  }
  
  try {
    const deleted = await message.channel.bulkDelete(amount, true);
    return `Đã xóa ${deleted.size} tin nhắn.`;
  } catch (error) {
    console.error('Error clearing messages:', error);
    return 'Không thể xóa tin nhắn. Tin nhắn cũ hơn 14 ngày không thể bị xóa.';
  }
}

module.exports = executeClear;