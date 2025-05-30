const { EmbedBuilder, PermissionsBitField } = require('discord.js');

/**
 * Change nickname of a member
 */
async function executeChangeNickname(message, command) {
  try {
    const { userId, nickname } = command.parameters;
    
    if (!userId) {
      return {
        success: false,
        message: 'Missing required parameter: userId'
      };
    }

    const guild = message.guild;
    const executor = message.member;
    const target = await guild.members.fetch(userId).catch(() => null);

    if (!target) {
      return {
        success: false,
        message: 'Target member not found'
      };
    }

    // Check if it's self-nickname change
    const isSelfChange = target.id === executor.id;
    
    // Validate nickname length and content
    if (nickname && nickname.length > 32) {
      return {
        success: false,
        message: 'Nickname cannot be longer than 32 characters'
      };
    }

    // Check permissions
    if (isSelfChange) {
      // For self-nickname change, user needs Change Nickname permission
      if (!executor.permissions.has(PermissionsBitField.Flags.ChangeNickname)) {
        return {
          success: false,
          message: 'You need "Change Nickname" permission to change your own nickname'
        };
      }
    } else {
      // For changing others' nicknames, need Manage Nicknames permission
      if (!executor.permissions.has(PermissionsBitField.Flags.ManageNicknames)) {
        return {
          success: false,
          message: 'You need "Manage Nicknames" permission to change others\' nicknames'
        };
      }

      // Check role hierarchy (cannot change nickname of equal/higher role users)
      if (target.id !== executor.guild.ownerId) { // Skip check if target is owner
        const executorHighest = executor.roles.highest.position;
        const targetHighest = target.roles.highest.position;

        if (executorHighest <= targetHighest && executor.id !== executor.guild.ownerId) {
          return {
            success: false,
            message: 'Cannot change nickname of users with equal or higher roles'
          };
        }
      }

      // Cannot change server owner's nickname (unless you are the owner)
      if (target.id === executor.guild.ownerId && executor.id !== executor.guild.ownerId) {
        return {
          success: false,
          message: 'Cannot change the server owner\'s nickname'
        };
      }
    }

    // Store old nickname for logging
    const oldNickname = target.nickname || target.user.username;
    const newNickname = nickname || null; // null resets to username

    // Change the nickname (removed reason parameter)
    await target.setNickname(newNickname);

    const actionType = isSelfChange ? 'changed their own' : 'changed';
    const targetDisplay = isSelfChange ? 'your' : `${target.user.username}'s`;
    const displayName = newNickname || target.user.username;

    return {
      success: true,
      message: `Successfully ${actionType} nickname to "${displayName}"`,
      embed: new EmbedBuilder()
        .setColor(0x00FF9F)
        .setTitle('✅ Nickname Changed')
        .setDescription(`**${targetDisplay}** nickname has been changed`)
        .addFields([
          { name: 'Target', value: target.user.tag, inline: true },
          { name: 'Old Nickname', value: oldNickname, inline: true },
          { name: 'New Nickname', value: displayName, inline: true },
          { name: 'Changed By', value: executor.user.tag, inline: true },
          { name: 'Action Type', value: isSelfChange ? 'Self-Change' : 'Admin Change', inline: true }
        ])
        .setTimestamp()
        .setFooter({ text: 'Iris AI Nickname Management' })
    };

  } catch (error) {
    console.error('Error in executeChangeNickname:', error);
    
    // Handle specific Discord API errors
    if (error.code === 50013) {
      return {
        success: false,
        message: 'Missing permissions to change this user\'s nickname'
      };
    }
    
    if (error.code === 50035) {
      return {
        success: false,
        message: 'Invalid nickname format'
      };
    }

    return {
      success: false,
      message: `Error changing nickname: ${error.message}`
    };
  }
}

module.exports = {
  executeChangeNickname
};