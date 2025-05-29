/**
 * Kiểm tra quyền hạn của người dùng
 */
const { PermissionsBitField } = require('discord.js');

/**
 * Kiểm tra và trả về danh sách quyền quản trị của thành viên
 * @param {Object} member - Discord.js GuildMember
 * @returns {Array} Danh sách tên quyền hạn
 */
function checkUserPermissions(member) {
  if (!member) return [];
  
  // Log raw bitfield for debugging
  console.log(`${member.user.username} permissions bitfield:`, member.permissions.bitfield);
  
  // Define permissions to check with proper flags
  const permissionsToCheck = [
    { flag: PermissionsBitField.Flags.ModerateMembers, name: 'Moderate Members' },
    { flag: PermissionsBitField.Flags.KickMembers, name: 'Kick Members' },
    { flag: PermissionsBitField.Flags.BanMembers, name: 'Ban Members' },
    { flag: PermissionsBitField.Flags.ManageMessages, name: 'Manage Messages' },
    { flag: PermissionsBitField.Flags.Administrator, name: 'Administrator' }
  ];
  
  const userPerms = [];
  
  // Enhanced debugging to see exact permission values
  for (const perm of permissionsToCheck) {
    const hasPermission = member.permissions.has(perm.flag);
    
    console.log(`Checking ${perm.name} (${perm.flag}): ${hasPermission}`);
    
    if (hasPermission) {
      userPerms.push(perm.name);
    }
  }
  
  return userPerms;
}

module.exports = { checkUserPermissions };