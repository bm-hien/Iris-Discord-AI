/**
 * Check user permissions
 */
const { PermissionsBitField } = require('discord.js');

/**
 * Check and return list of member's administrative permissions
 * @param {Object} member - Discord.js GuildMember
 * @returns {Array} List of permission names
 */
function checkUserPermissions(member) {
  if (!member) return [];
  
  // Define permissions to check with proper flags
  const permissionsToCheck = [
    { flag: PermissionsBitField.Flags.ModerateMembers, name: 'Moderate Members' },
    { flag: PermissionsBitField.Flags.KickMembers, name: 'Kick Members' },
    { flag: PermissionsBitField.Flags.BanMembers, name: 'Ban Members' },
    { flag: PermissionsBitField.Flags.ManageMessages, name: 'Manage Messages' },
    { flag: PermissionsBitField.Flags.ManageChannels, name: 'Manage Channels' },
    { flag: PermissionsBitField.Flags.Administrator, name: 'Administrator' }
  ];
  
  const userPerms = [];
  
  // Check permissions without spam logging
  for (const perm of permissionsToCheck) {
    if (member.permissions.has(perm.flag)) {
      userPerms.push(perm.name);
    }
  }
  
  return userPerms;
}

module.exports = { checkUserPermissions };