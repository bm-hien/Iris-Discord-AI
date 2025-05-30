const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { getAvailableActions } = require('../../../../events/utils/userInfo');

/**
 * Add role to a member
 */
async function executeAddRole(message, command) {
  try {
    const { userId, roleId } = command.parameters;
    
    if (!userId || !roleId) {
      return {
        success: false,
        message: 'Missing required parameters: userId and roleId'
      };
    }

    const guild = message.guild;
    const executor = message.member;
    const target = await guild.members.fetch(userId);
    const role = guild.roles.cache.get(roleId);

    if (!target) {
      return {
        success: false,
        message: 'Target member not found'
      };
    }

    if (!role) {
      return {
        success: false,
        message: 'Role not found'
      };
    }

    // Check if target already has the role
    if (target.roles.cache.has(roleId)) {
      return {
        success: false,
        message: 'Member already has this role'
      };
    }

    // Special handling for self-role assignment
    const isSelfAssignment = target.id === executor.id;
    
    if (isSelfAssignment) {
      // For self-assignment, check if role is lower than user's highest role
      const userHighestPosition = executor.roles.highest.position;
      
      if (role.position >= userHighestPosition) {
        return {
          success: false,
          message: `Cannot assign this role to yourself. The role "${role.name}" (position: ${role.position}) is equal to or higher than your highest role "${executor.roles.highest.name}" (position: ${userHighestPosition}).`
        };
      }
      
      // Check if role is managed (bot roles)
      if (role.managed) {
        return {
          success: false,
          message: 'Cannot assign managed roles (bot roles) to yourself'
        };
      }
      
      // Check if user has Manage Roles permission for self-assignment
      if (!executor.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        return {
          success: false,
          message: 'You need "Manage Roles" permission to assign roles to yourself'
        };
      }
    } else {
      // For assigning to others, use the existing permission system
      const actions = getAvailableActions(executor, target);
      if (!actions.canManageRoles) {
        return {
          success: false,
          message: 'You do not have permission to manage roles'
        };
      }

      const managableRole = actions.managableRoles.find(r => r.id === roleId);
      if (!managableRole) {
        return {
          success: false,
          message: 'You cannot manage this role (role hierarchy)'
        };
      }

      if (!managableRole.canAdd) {
        return {
          success: false,
          message: 'Member already has this role'
        };
      }
    }

    // Add the role
    await target.roles.add(role);

    const actionType = isSelfAssignment ? 'self-assigned' : 'added';
    const targetDisplay = isSelfAssignment ? 'yourself' : target.user.username;

    return {
      success: true,
      message: `Successfully ${actionType} role "${role.name}" ${isSelfAssignment ? '' : `to ${targetDisplay}`}`,
      embed: new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Role Added')
        .setDescription(`**${role.name}** has been ${actionType} ${isSelfAssignment ? '' : `to **${target.user.username}**`}`)
        .addFields([
          { name: 'Target', value: target.user.tag, inline: true },
          { name: 'Role', value: role.name, inline: true },
          { name: 'Executor', value: executor.user.tag, inline: true },
          { name: 'Role Position', value: role.position.toString(), inline: true },
          { name: 'Action Type', value: isSelfAssignment ? 'Self-Assignment' : 'Admin Assignment', inline: true }
        ])
        .setTimestamp()
        .setFooter({ text: 'Iris AI Role Management' })
    };

  } catch (error) {
    console.error('Error in executeAddRole:', error);
    return {
      success: false,
      message: `Error adding role: ${error.message}`
    };
  }
}

/**
 * Remove role from a member
 */
async function executeRemoveRole(message, command) {
  try {
    const { userId, roleId } = command.parameters;
    
    if (!userId || !roleId) {
      return {
        success: false,
        message: 'Missing required parameters: userId and roleId'
      };
    }

    const guild = message.guild;
    const executor = message.member;
    const target = await guild.members.fetch(userId);
    const role = guild.roles.cache.get(roleId);

    if (!target) {
      return {
        success: false,
        message: 'Target member not found'
      };
    }

    if (!role) {
      return {
        success: false,
        message: 'Role not found'
      };
    }

    // Check if target has the role
    if (!target.roles.cache.has(roleId)) {
      return {
        success: false,
        message: 'Member does not have this role'
      };
    }

    // Check permissions and hierarchy (no special self-handling for remove)
    const actions = getAvailableActions(executor, target);
    if (!actions.canManageRoles) {
      return {
        success: false,
        message: 'You do not have permission to manage roles'
      };
    }

    const managableRole = actions.managableRoles.find(r => r.id === roleId);
    if (!managableRole) {
      return {
        success: false,
        message: 'You cannot manage this role (role hierarchy)'
      };
    }

    if (!managableRole.canRemove) {
      return {
        success: false,
        message: 'Member does not have this role'
      };
    }

    // Remove the role
    await target.roles.remove(role);

    return {
      success: true,
      message: `Successfully removed role "${role.name}" from ${target.user.username}`,
      embed: new EmbedBuilder()
        .setColor(0xFF6B6B)
        .setTitle('✅ Role Removed')
        .setDescription(`**${role.name}** has been removed from **${target.user.username}**`)
        .addFields([
          { name: 'Target', value: target.user.tag, inline: true },
          { name: 'Role', value: role.name, inline: true },
          { name: 'Executor', value: executor.user.tag, inline: true }
        ])
        .setTimestamp()
        .setFooter({ text: 'Iris AI Role Management' })
    };

  } catch (error) {
    console.error('Error in executeRemoveRole:', error);
    return {
      success: false,
      message: `Error removing role: ${error.message}`
    };
  }
}

/**
 * List member's roles and available actions
 */
async function executeListRoles(message, command) {
  try {
    const { userId } = command.parameters;
    
    const guild = message.guild;
    const executor = message.member;
    const target = userId ? await guild.members.fetch(userId) : executor;

    if (!target) {
      return {
        success: false,
        message: 'Target member not found'
      };
    }

    const userRoles = target.roles.cache
      .filter(role => role.name !== '@everyone')
      .sort((a, b) => b.position - a.position);

    const actions = getAvailableActions(executor, target);

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle(`🎭 Role Information for ${target.user.username}`)
      .setThumbnail(target.user.displayAvatarURL())
      .setTimestamp();

    // Current roles
    if (userRoles.size > 0) {
      const roleList = userRoles.map(role => {
        const managable = actions.managableRoles?.find(r => r.id === role.id);
        const indicator = managable ? (managable.canRemove ? '🔧' : '') : '';
        return `${indicator} **${role.name}** (${role.members.size} members)`;
      }).join('\n');

      embed.addFields([
        { name: `Current Roles (${userRoles.size})`, value: roleList, inline: false }
      ]);
    } else {
      embed.addFields([
        { name: 'Current Roles', value: 'No roles assigned', inline: false }
      ]);
    }

    // Available actions
    if (target.id !== executor.id && actions.managableRoles?.length > 0) {
      const addableRoles = actions.managableRoles
        .filter(role => role.canAdd)
        .slice(0, 10); // Limit to 10 for embed space

      if (addableRoles.length > 0) {
        const addableList = addableRoles.map(role => 
          `➕ **${role.name}** (${role.memberCount} members)`
        ).join('\n');

        embed.addFields([
          { name: 'Roles You Can Add', value: addableList, inline: false }
        ]);
      }
    }

    // Restrictions
    if (actions.restrictions?.length > 0) {
      embed.addFields([
        { name: '⚠️ Restrictions', value: actions.restrictions.join('\n'), inline: false }
      ]);
    }

    return {
      success: true,
      message: `Role information for ${target.user.username}`,
      embed
    };

  } catch (error) {
    console.error('Error in executeListRoles:', error);
    return {
      success: false,
      message: `Error listing roles: ${error.message}`
    };
  }
}

module.exports = {
  executeAddRole,
  executeRemoveRole,
  executeListRoles
};