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
 * Create a new role
 */
async function executeCreateRole(message, command) {
  try {
    const { roleName, color, permissions, mentionable, hoist } = command.parameters;
    
    if (!roleName) {
      return {
        success: false,
        message: 'Missing required parameter: roleName'
      };
    }

    const guild = message.guild;
    const executor = message.member;

    // Check if user has permission to manage roles
    if (!executor.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return {
        success: false,
        message: 'You need "Manage Roles" permission to create roles'
      };
    }

    // Check if role name already exists
    const existingRole = guild.roles.cache.find(role => role.name.toLowerCase() === roleName.toLowerCase());
    if (existingRole) {
      return {
        success: false,
        message: `Role "${roleName}" already exists`
      };
    }

    // Prepare role options
    const roleOptions = {
      name: roleName,
      mentionable: mentionable || false,
      hoist: hoist || false
    };

    // Handle color parameter
    if (color) {
      // Support hex colors (#ffffff), color names, or numbers
      if (typeof color === 'string') {
        if (color.startsWith('#')) {
          roleOptions.color = color;
        } else {
          // Try to parse as hex without #
          roleOptions.color = `#${color}`;
        }
      } else if (typeof color === 'number') {
        roleOptions.color = color;
      }
    }

    // Handle permissions parameter
    if (permissions && Array.isArray(permissions)) {
      const validPermissions = [];
      for (const perm of permissions) {
        if (PermissionsBitField.Flags[perm]) {
          validPermissions.push(PermissionsBitField.Flags[perm]);
        }
      }
      if (validPermissions.length > 0) {
        roleOptions.permissions = validPermissions;
      }
    }

    // Create the role
    const newRole = await guild.roles.create(roleOptions);

    // Position the role below the executor's highest role (if possible)
    try {
      const executorHighestRole = executor.roles.highest;
      if (executorHighestRole.position > 1) {
        await newRole.setPosition(executorHighestRole.position - 1);
      }
    } catch (positionError) {
      console.log('Could not set role position:', positionError.message);
    }

    return {
      success: true,
      message: `Successfully created role "${newRole.name}"`,
      embed: new EmbedBuilder()
        .setColor(newRole.color || 0x99AAB5)
        .setTitle('✅ Role Created')
        .setDescription(`**${newRole.name}** has been created successfully`)
        .addFields([
          { name: 'Role Name', value: newRole.name, inline: true },
          { name: 'Role ID', value: newRole.id, inline: true },
          { name: 'Color', value: newRole.hexColor, inline: true },
          { name: 'Position', value: newRole.position.toString(), inline: true },
          { name: 'Mentionable', value: newRole.mentionable ? 'Yes' : 'No', inline: true },
          { name: 'Hoisted', value: newRole.hoist ? 'Yes' : 'No', inline: true },
          { name: 'Created By', value: executor.user.tag, inline: true },
          { name: 'Members', value: '0', inline: true }
        ])
        .setTimestamp()
        .setFooter({ text: 'Iris AI Role Management' })
    };

  } catch (error) {
    console.error('Error in executeCreateRole:', error);
    return {
      success: false,
      message: `Error creating role: ${error.message}`
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
 * Delete a role
 */
async function executeDeleteRole(message, command) {
  try {
    const { roleId } = command.parameters;
    
    if (!roleId) {
      return {
        success: false,
        message: 'Missing required parameter: roleId'
      };
    }

    const guild = message.guild;
    const executor = message.member;
    const role = guild.roles.cache.get(roleId);

    if (!role) {
      return {
        success: false,
        message: 'Role not found'
      };
    }

    // Check if user has permission to manage roles
    if (!executor.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return {
        success: false,
        message: 'You need "Manage Roles" permission to delete roles'
      };
    }

    // Check if role can be deleted (hierarchy rules)
    if (role.position >= executor.roles.highest.position) {
      return {
        success: false,
        message: 'You cannot delete roles higher than or equal to your highest role'
      };
    }

    // Check if role is managed (bot roles)
    if (role.managed) {
      return {
        success: false,
        message: 'Cannot delete managed roles (bot roles)'
      };
    }

    // Check if it's @everyone role
    if (role.id === guild.id) {
      return {
        success: false,
        message: 'Cannot delete the @everyone role'
      };
    }

    const roleName = role.name;
    const memberCount = role.members.size;

    // Delete the role
    await role.delete();

    return {
      success: true,
      message: `Successfully deleted role "${roleName}"`,
      embed: new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('🗑️ Role Deleted')
        .setDescription(`**${roleName}** has been deleted successfully`)
        .addFields([
          { name: 'Role Name', value: roleName, inline: true },
          { name: 'Previous Members', value: memberCount.toString(), inline: true },
          { name: 'Deleted By', value: executor.user.tag, inline: true }
        ])
        .setTimestamp()
        .setFooter({ text: 'Iris AI Role Management' })
    };

  } catch (error) {
    console.error('Error in executeDeleteRole:', error);
    return {
      success: false,
      message: `Error deleting role: ${error.message}`
    };
  }
}

/**
 * Edit a role's properties
 */
async function executeEditRole(message, command) {
  try {
    const { roleId, name, color, permissions, mentionable, hoist } = command.parameters;
    
    if (!roleId) {
      return {
        success: false,
        message: 'Missing required parameter: roleId'
      };
    }

    const guild = message.guild;
    const executor = message.member;
    const role = guild.roles.cache.get(roleId);

    if (!role) {
      return {
        success: false,
        message: 'Role not found'
      };
    }

    // Check if user has permission to manage roles
    if (!executor.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return {
        success: false,
        message: 'You need "Manage Roles" permission to edit roles'
      };
    }

    // Check if role can be edited (hierarchy rules)
    if (role.position >= executor.roles.highest.position) {
      return {
        success: false,
        message: 'You cannot edit roles higher than or equal to your highest role'
      };
    }

    // Check if role is managed (bot roles)
    if (role.managed) {
      return {
        success: false,
        message: 'Cannot edit managed roles (bot roles)'
      };
    }

    // Check if it's @everyone role
    if (role.id === guild.id && name) {
      return {
        success: false,
        message: 'Cannot change the name of @everyone role'
      };
    }

    // Prepare edit options
    const editOptions = {};
    
    if (name !== undefined) {
      // Check if new name already exists
      const existingRole = guild.roles.cache.find(r => r.name.toLowerCase() === name.toLowerCase() && r.id !== roleId);
      if (existingRole) {
        return {
          success: false,
          message: `Role name "${name}" already exists`
        };
      }
      editOptions.name = name;
    }

    if (color !== undefined) {
      if (typeof color === 'string') {
        if (color.startsWith('#')) {
          editOptions.color = color;
        } else {
          editOptions.color = `#${color}`;
        }
      } else if (typeof color === 'number') {
        editOptions.color = color;
      }
    }

    if (permissions !== undefined && Array.isArray(permissions)) {
      const validPermissions = [];
      for (const perm of permissions) {
        if (PermissionsBitField.Flags[perm]) {
          validPermissions.push(PermissionsBitField.Flags[perm]);
        }
      }
      if (validPermissions.length > 0) {
        editOptions.permissions = validPermissions;
      }
    }

    if (mentionable !== undefined) {
      editOptions.mentionable = mentionable;
    }

    if (hoist !== undefined) {
      editOptions.hoist = hoist;
    }

    // Edit the role
    const oldValues = {
      name: role.name,
      color: role.hexColor,
      mentionable: role.mentionable,
      hoist: role.hoist
    };

    await role.edit(editOptions);

    const changes = [];
    if (editOptions.name) changes.push(`Name: ${oldValues.name} → ${role.name}`);
    if (editOptions.color) changes.push(`Color: ${oldValues.color} → ${role.hexColor}`);
    if (editOptions.mentionable !== undefined) changes.push(`Mentionable: ${oldValues.mentionable ? 'Yes' : 'No'} → ${role.mentionable ? 'Yes' : 'No'}`);
    if (editOptions.hoist !== undefined) changes.push(`Hoisted: ${oldValues.hoist ? 'Yes' : 'No'} → ${role.hoist ? 'Yes' : 'No'}`);
    if (editOptions.permissions) changes.push(`Permissions updated`);

    return {
      success: true,
      message: `Successfully edited role "${role.name}"`,
      embed: new EmbedBuilder()
        .setColor(role.color || 0x99AAB5)
        .setTitle('✏️ Role Edited')
        .setDescription(`**${role.name}** has been edited successfully`)
        .addFields([
          { name: 'Role Name', value: role.name, inline: true },
          { name: 'Role ID', value: role.id, inline: true },
          { name: 'Color', value: role.hexColor, inline: true },
          { name: 'Changes Made', value: changes.join('\n') || 'No changes', inline: false },
          { name: 'Edited By', value: executor.user.tag, inline: true }
        ])
        .setTimestamp()
        .setFooter({ text: 'Iris AI Role Management' })
    };

  } catch (error) {
    console.error('Error in executeEditRole:', error);
    return {
      success: false,
      message: `Error editing role: ${error.message}`
    };
  }
}

/**
 * Move a role's position
 */
async function executeMoveRole(message, command) {
  try {
    const { roleId, position, direction } = command.parameters;
    
    if (!roleId) {
      return {
        success: false,
        message: 'Missing required parameter: roleId'
      };
    }

    const guild = message.guild;
    const executor = message.member;
    const role = guild.roles.cache.get(roleId);

    if (!role) {
      return {
        success: false,
        message: 'Role not found'
      };
    }

    // Check if user has permission to manage roles
    if (!executor.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return {
        success: false,
        message: 'You need "Manage Roles" permission to move roles'
      };
    }

    // Check if role can be moved (hierarchy rules)
    if (role.position >= executor.roles.highest.position) {
      return {
        success: false,
        message: 'You cannot move roles higher than or equal to your highest role'
      };
    }

    // Check if role is managed (bot roles)
    if (role.managed) {
      return {
        success: false,
        message: 'Cannot move managed roles (bot roles)'
      };
    }

    const oldPosition = role.position;
    let newPosition;

    if (position !== undefined) {
      // Move to specific position
      newPosition = Math.max(1, Math.min(position, executor.roles.highest.position - 1));
    } else if (direction) {
      // Move up or down
      if (direction === 'up') {
        newPosition = Math.min(role.position + 1, executor.roles.highest.position - 1);
      } else if (direction === 'down') {
        newPosition = Math.max(role.position - 1, 1);
      } else {
        return {
          success: false,
          message: 'Invalid direction. Use "up" or "down"'
        };
      }
    } else {
      return {
        success: false,
        message: 'Missing required parameter: position or direction'
      };
    }

    // Move the role
    await role.setPosition(newPosition);

    return {
      success: true,
      message: `Successfully moved role "${role.name}" from position ${oldPosition} to ${newPosition}`,
      embed: new EmbedBuilder()
        .setColor(role.color || 0x99AAB5)
        .setTitle('📍 Role Position Changed')
        .setDescription(`**${role.name}** position has been updated`)
        .addFields([
          { name: 'Role Name', value: role.name, inline: true },
          { name: 'Old Position', value: oldPosition.toString(), inline: true },
          { name: 'New Position', value: role.position.toString(), inline: true },
          { name: 'Moved By', value: executor.user.tag, inline: true }
        ])
        .setTimestamp()
        .setFooter({ text: 'Iris AI Role Management' })
    };

  } catch (error) {
    console.error('Error in executeMoveRole:', error);
    return {
      success: false,
      message: `Error moving role: ${error.message}`
    };
  }
}

module.exports = {
  executeAddRole,
  executeRemoveRole,
  executeCreateRole,
  executeDeleteRole,
  executeEditRole,
  executeMoveRole
};