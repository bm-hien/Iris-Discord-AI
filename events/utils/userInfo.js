/**
 * Extract user information and server context for AI
 */
const { PermissionsBitField, ChannelType, ActivityType } = require('discord.js');
const { checkUserPermissions } = require('./permissions');
const { getUserWarningCount } = require('../../AI/events/database');
/**
 * Extract detailed server role information for AI understanding
 * @param {Guild} guild - Discord guild
 * @param {GuildMember} member - Current user member
 * @returns {Object} Complete server role information
 */
function getServerRoleInformation(guild, member) {
  if (!guild) return null;

  const roleInfo = {
    allRoles: [],
    userRoles: [],
    managableRoles: [],
    roleHierarchy: {
      admins: [],
      moderators: [],
      special: [],
      regular: []
    },
    statistics: {
      totalRoles: 0,
      totalMembers: guild.memberCount,
      rolesUserCanManage: 0
    }
  };

  // Get all roles except @everyone, sorted by position (highest first)
  const allRoles = guild.roles.cache
    .filter(role => role.name !== '@everyone')
    .sort((a, b) => b.position - a.position);

  roleInfo.statistics.totalRoles = allRoles.size;

  // Process all roles
  allRoles.forEach(role => {
    const roleData = {
      id: role.id,
      name: role.name,
      position: role.position,
      color: role.hexColor,
      permissions: role.permissions.toArray(),
      mentionable: role.mentionable,
      hoisted: role.hoist,
      managed: role.managed,
      memberCount: role.members.size,
      isUserRole: member ? member.roles.cache.has(role.id) : false,
      canUserManage: false
    };

    // Check if user can manage this role
    if (member && member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      const userHighestPosition = member.roles.highest.position;
      if (role.position < userHighestPosition && !role.managed) {
        roleData.canUserManage = true;
        roleInfo.managableRoles.push(roleData);
        roleInfo.statistics.rolesUserCanManage++;
      }
    }

    roleInfo.allRoles.push(roleData);

    // Categorize roles by permissions
    if (role.permissions.has(PermissionsBitField.Flags.Administrator)) {
      roleInfo.roleHierarchy.admins.push(roleData);
    } else if (role.permissions.has([
      PermissionsBitField.Flags.ModerateMembers,
      PermissionsBitField.Flags.ManageMessages,
      PermissionsBitField.Flags.KickMembers,
      PermissionsBitField.Flags.BanMembers
    ])) {
      roleInfo.roleHierarchy.moderators.push(roleData);
    } else if (role.permissions.has([
      PermissionsBitField.Flags.ManageChannels,
      PermissionsBitField.Flags.ManageRoles,
      PermissionsBitField.Flags.ManageGuild
    ])) {
      roleInfo.roleHierarchy.special.push(roleData);
    } else {
      roleInfo.roleHierarchy.regular.push(roleData);
    }

    // Track user's roles
    if (roleData.isUserRole) {
      roleInfo.userRoles.push(roleData);
    }
  });

  return roleInfo;
}

/**
 * Get detailed role analysis for AI understanding (legacy function for compatibility)
 * @param {GuildMember} member - Discord guild member
 * @param {Guild} guild - Discord guild
 * @returns {Object} Detailed role information
 */
function getRoleAnalysis(member, guild) {
  if (!member || !guild) return null;

  const analysis = {
    userRoles: [],
    roleHierarchy: [],
    canManageRoles: false,
    managableRoles: [],
    rolePermissions: {},
    roleColors: {},
    specialRoles: {
      admin: [],
      moderator: [],
      special: []
    }
  };

  // Get all guild roles sorted by position (highest first)
  const allRoles = guild.roles.cache
    .filter(role => role.name !== '@everyone')
    .sort((a, b) => b.position - a.position);

  // Get user's roles
  const userRoles = member.roles.cache
    .filter(role => role.name !== '@everyone')
    .sort((a, b) => b.position - a.position);

  // Analyze user's roles
  userRoles.forEach(role => {
    const roleInfo = {
      id: role.id,
      name: role.name,
      position: role.position,
      color: role.hexColor,
      permissions: role.permissions.toArray(),
      mentionable: role.mentionable,
      hoisted: role.hoist,
      managed: role.managed,
      memberCount: role.members.size
    };

    analysis.userRoles.push(roleInfo);

    // Categorize special roles
    if (role.permissions.has(PermissionsBitField.Flags.Administrator)) {
      analysis.specialRoles.admin.push(roleInfo);
    } else if (role.permissions.has([
      PermissionsBitField.Flags.ModerateMembers,
      PermissionsBitField.Flags.ManageMessages,
      PermissionsBitField.Flags.KickMembers,
      PermissionsBitField.Flags.BanMembers
    ])) {
      analysis.specialRoles.moderator.push(roleInfo);
    } else if (role.permissions.has([
      PermissionsBitField.Flags.ManageChannels,
      PermissionsBitField.Flags.ManageRoles
    ])) {
      analysis.specialRoles.special.push(roleInfo);
    }
  });

  // Check what roles the user can manage
  analysis.canManageRoles = member.permissions.has(PermissionsBitField.Flags.ManageRoles);
  
  if (analysis.canManageRoles) {
    const userHighestPosition = member.roles.highest.position;
    
    analysis.managableRoles = allRoles
      .filter(role => role.position < userHighestPosition && !role.managed)
      .map(role => ({
        id: role.id,
        name: role.name,
        position: role.position,
        color: role.hexColor,
        memberCount: role.members.size,
        canAssign: true,
        canRemove: true
      }));
  }

  // Create role hierarchy for AI understanding
  analysis.roleHierarchy = allRoles.map(role => ({
    id: role.id,
    name: role.name,
    position: role.position,
    color: role.hexColor,
    memberCount: role.members.size,
    isUserRole: userRoles.has(role.id),
    canUserManage: analysis.canManageRoles && role.position < member.roles.highest.position
  }));

  return analysis;
}

/**
 * Get what the user can do with another member
 * @param {GuildMember} executor - The member who wants to perform actions
 * @param {GuildMember} target - The target member
 * @returns {Object} Available actions
 */
function getAvailableActions(executor, target) {
  if (!executor || !target) return null;

  const actions = {
    canKick: false,
    canBan: false,
    canMute: false,
    canManageRoles: false,
    canManageNickname: false,
    canChangeOwnNickname: false,
    managableRoles: [],
    selfAssignableRoles: [],
    restrictions: []
  };

  // Check if target is server owner
  if (target.id === executor.guild.ownerId) {
    actions.restrictions.push('Cannot perform actions on server owner');
    return actions;
  }

  // Check if target is executor themselves (special handling for self-role assignment)
  if (target.id === executor.id) {
    // For self-actions
    actions.canChangeOwnNickname = executor.permissions.has(PermissionsBitField.Flags.ChangeNickname);
    
    // For self-assignment, check what roles they can assign to themselves
    if (executor.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      const guild = executor.guild;
      const userHighestPosition = executor.roles.highest.position;
      
      // Find roles that are lower than user's highest role and not managed
      const selfAssignableRoles = guild.roles.cache
        .filter(role => 
          role.position < userHighestPosition && 
          !role.managed && 
          role.name !== '@everyone' &&
          !executor.roles.cache.has(role.id) // Don't include roles they already have
        );

      actions.selfAssignableRoles = selfAssignableRoles.map(role => ({
        id: role.id,
        name: role.name,
        position: role.position,
        color: role.hexColor,
        memberCount: role.members.size,
        canAdd: true,
        canRemove: false
      }));
    }
    
    actions.restrictions.push('Self-actions only (roles and nickname)');
    return actions;
  }

  // Check role hierarchy
  const executorHighest = executor.roles.highest.position;
  const targetHighest = target.roles.highest.position;

  if (executorHighest <= targetHighest) {
    actions.restrictions.push('Target has equal or higher role position');
    return actions;
  }

  // Check permissions
  actions.canKick = executor.permissions.has(PermissionsBitField.Flags.KickMembers);
  actions.canBan = executor.permissions.has(PermissionsBitField.Flags.BanMembers);
  actions.canMute = executor.permissions.has(PermissionsBitField.Flags.ModerateMembers);
  actions.canManageRoles = executor.permissions.has(PermissionsBitField.Flags.ManageRoles);
  actions.canManageNickname = executor.permissions.has(PermissionsBitField.Flags.ManageNicknames);

  // Get roles that executor can assign/remove from target
  if (actions.canManageRoles) {
    const guild = executor.guild;
    const managableRoles = guild.roles.cache
      .filter(role => 
        role.position < executorHighest && 
        !role.managed && 
        role.name !== '@everyone'
      );

    actions.managableRoles = managableRoles.map(role => ({
      id: role.id,
      name: role.name,
      hasRole: target.roles.cache.has(role.id),
      canAdd: !target.roles.cache.has(role.id),
      canRemove: target.roles.cache.has(role.id)
    }));
  }

  return actions;
}

/**
 * Format role information for AI context
 * @param {Object} roleInfo - Role information object
 * @returns {string} Formatted role context
 */
function formatRoleContext(roleInfo) {
  if (!roleInfo) return '';

  let context = `\n🎭 **SERVER ROLE INFORMATION:**\n`;
  context += `Total Roles: ${roleInfo.statistics.totalRoles} | Total Members: ${roleInfo.statistics.totalMembers}\n`;

  // User's current roles
  if (roleInfo.userRoles.length > 0) {
    context += `\n👤 **Your Roles (${roleInfo.userRoles.length}):**\n`;
    roleInfo.userRoles.forEach(role => {
      context += `• ${role.name} (Position: ${role.position}, Members: ${role.memberCount})\n`;
    });
  }

  // Roles user can manage
  if (roleInfo.managableRoles.length > 0) {
    context += `\n🔧 **Roles You Can Manage (${roleInfo.managableRoles.length}):**\n`;
    roleInfo.managableRoles.slice(0, 10).forEach(role => { // Limit to 10 for brevity
      context += `• ${role.name} (ID: ${role.id}, Position: ${role.position}, Members: ${role.memberCount})\n`;
    });
    if (roleInfo.managableRoles.length > 10) {
      context += `... and ${roleInfo.managableRoles.length - 10} more roles\n`;
    }
  }

  // Role hierarchy
  if (roleInfo.roleHierarchy.admins.length > 0) {
    context += `\n👑 **Admin Roles (${roleInfo.roleHierarchy.admins.length}):**\n`;
    roleInfo.roleHierarchy.admins.forEach(role => {
      context += `• ${role.name} (${role.memberCount} members)\n`;
    });
  }

  if (roleInfo.roleHierarchy.moderators.length > 0) {
    context += `\n🛡️ **Moderator Roles (${roleInfo.roleHierarchy.moderators.length}):**\n`;
    roleInfo.roleHierarchy.moderators.forEach(role => {
      context += `• ${role.name} (${role.memberCount} members)\n`;
    });
  }

  if (roleInfo.roleHierarchy.special.length > 0) {
    context += `\n⭐ **Special Roles (${roleInfo.roleHierarchy.special.length}):**\n`;
    roleInfo.roleHierarchy.special.slice(0, 5).forEach(role => { // Limit to 5
      context += `• ${role.name} (${role.memberCount} members)\n`;
    });
  }

  // All roles summary (for reference)
  context += `\n📋 **All Server Roles:**\n`;
  roleInfo.allRoles.slice(0, 15).forEach(role => { // Show top 15 roles
    const indicators = [];
    if (role.isUserRole) indicators.push('👤');
    if (role.canUserManage) indicators.push('🔧');
    if (role.managed) indicators.push('🤖');
    
    context += `• ${role.name} (ID: ${role.id}, Pos: ${role.position}, ${role.memberCount} members) ${indicators.join('')}\n`;
  });

  if (roleInfo.allRoles.length > 15) {
    context += `... and ${roleInfo.allRoles.length - 15} more roles\n`;
  }

  context += `\n🔍 **Legend:** 👤 = Your role, 🔧 = You can manage, 🤖 = Bot managed\n`;

  return context;
}

/**
 * Get server channels for context
 * @param {Guild} guild - Discord guild
 * @returns {Array} Array of channel information
 */
function getServerChannels(guild) {
  if (!guild) return [];

  return guild.channels.cache.map(channel => ({
    id: channel.id,
    name: channel.name,
    type: channel.type,
    position: channel.position || 0
  }));
}

/**
 * Extract user presence information
 * @param {GuildMember} member - Discord guild member
 * @returns {Object} Presence information
 */
function extractUserPresence(member) {
  const presence = {
    status: 'unknown',
    activities: [],
    isOnline: false,
    statusText: 'Unknown',
    customStatus: null,
    isStreaming: false,
    isListening: false,
    isWatching: false,
    isPlaying: false,
    currentGame: null,
    currentApp: null
  };

  if (!member || !member.presence) return presence;

  const userPresence = member.presence;
  
  // Basic status
  presence.status = userPresence.status || 'unknown';
  presence.isOnline = ['online', 'idle', 'dnd'].includes(presence.status);
  
  // Status text mapping
  const statusMap = {
    'online': 'Online',
    'idle': 'Away',
    'dnd': 'Do Not Disturb',
    'offline': 'Offline',
    'invisible': 'Invisible'
  };
  presence.statusText = statusMap[presence.status] || 'Unknown';

  // Activities
  if (userPresence.activities && userPresence.activities.length > 0) {
    presence.activities = userPresence.activities.map(activity => ({
      name: activity.name,
      type: activity.type,
      details: activity.details,
      state: activity.state,
      url: activity.url
    }));

    // Analyze activity types
    userPresence.activities.forEach(activity => {
      switch (activity.type) {
        case ActivityType.Playing:
          presence.isPlaying = true;
          presence.currentGame = activity.name;
          break;
        case ActivityType.Streaming:
          presence.isStreaming = true;
          break;
        case ActivityType.Listening:
          presence.isListening = true;
          break;
        case ActivityType.Watching:
          presence.isWatching = true;
          break;
        case ActivityType.Custom:
          presence.customStatus = activity.state;
          break;
      }
    });
  }

  return presence;
}

/**
 * Get user information for AI context
 * @param {Message} message - Discord message object
 * @returns {Object} Complete user information
 */
async function getUserInfo(message) {
  const user = message.author;
  const userInfo = {
    username: user.username,
    tag: user.tag,
    isAdmin: false,
    isOwner: false,
    roles: null,
    serverName: null,
    permissions: [],
    rolePositions: {
      highest: 0,
      lowest: 0
    },
    highestRole: null,
    lowestRole: null,
    hasPermissions: false,
    // Channel information
    currentChannel: {
      id: message.channel.id,
      name: message.channel.name,
      type: message.channel.type
    },
    channels: [], // Will contain all server channels
    // Rich Presence information
    presence: {
      status: 'unknown',
      activities: [],
      isOnline: false,
      statusText: 'Unknown',
      customStatus: null,
      isStreaming: false,
      isListening: false,
      isWatching: false,
      isPlaying: false,
      currentGame: null,
      currentApp: null
    },
    // Complete server role information
    serverRoles: null,
    roleContext: ''
  };

  // If message is in a guild (server), add additional context
  if (message.guild) {
    userInfo.serverName = message.guild.name;
    
    // Get all channels in the server
    userInfo.channels = getServerChannels(message.guild);
    
    try {
    userInfo.warningCount = await getUserWarningCount(user.id, message.guild.id);
  } catch (error) {
    console.error('Error getting warning count:', error);
    userInfo.warningCount = 0;
  }
    
    // Get user's member object in the guild
    const member = message.guild.members.cache.get(user.id);
    if (member) {
      // Check if user is an admin or owner
      userInfo.isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);
      userInfo.isOwner = message.guild.ownerId === user.id;
      
      // Get user roles
      if (member.roles.cache.size > 0) {
        // Get roles except @everyone
        const userRoles = member.roles.cache.filter(role => role.name !== '@everyone');
        
        // Store role names
        userInfo.roles = userRoles.map(role => role.name).join(', ');
        
        // Add detailed role analysis
        userInfo.roleAnalysis = getRoleAnalysis(member, message.guild);
        
        // Add bot's capabilities in this server
        const botMember = message.guild.members.cache.get(message.client.user.id);
        if (botMember) {
          userInfo.botCapabilities = {
            roleAnalysis: getRoleAnalysis(botMember, message.guild),
            canManageServer: botMember.permissions.has(PermissionsBitField.Flags.ManageGuild),
            canManageChannels: botMember.permissions.has(PermissionsBitField.Flags.ManageChannels),
            canManageRoles: botMember.permissions.has(PermissionsBitField.Flags.ManageRoles),
            canKickMembers: botMember.permissions.has(PermissionsBitField.Flags.KickMembers),
            canBanMembers: botMember.permissions.has(PermissionsBitField.Flags.BanMembers),
            canModerateMembers: botMember.permissions.has(PermissionsBitField.Flags.ModerateMembers)
          };
        }
        
        // Get highest and lowest role positions for hierarchy checks
        if (userRoles.size > 0) {
          const highestRole = member.roles.highest;
          const lowestRole = Array.from(userRoles.values()).reduce((lowest, role) => 
            role.position < lowest.position ? role : lowest
          );
          
          userInfo.highestRole = highestRole.name;
          userInfo.lowestRole = lowestRole.name;
          userInfo.rolePositions = {
            highest: highestRole.position,
            lowest: lowestRole.position
          };
        }
      }
      
      // Use the permission checking function to get accurate permissions
      userInfo.permissions = checkUserPermissions(member);
      
      // Set hasPermissions flag for clear AI instructions
      userInfo.hasPermissions = userInfo.permissions.length > 0;
      
      // Extract Rich Presence information
      userInfo.presence = extractUserPresence(member);

      // Get complete server role information
      userInfo.serverRoles = getServerRoleInformation(message.guild, member);
      userInfo.roleContext = formatRoleContext(userInfo.serverRoles);
    }
  } else {
    // For DM channels, try to get presence from client cache
    const client = message.client;
    const userFromCache = client.users.cache.get(user.id);
    if (userFromCache) {
      // Get presence from any mutual guild
      const mutualGuilds = client.guilds.cache.filter(guild => 
        guild.members.cache.has(user.id)
      );
      
      if (mutualGuilds.size > 0) {
        const firstMutualGuild = mutualGuilds.first();
        const member = firstMutualGuild.members.cache.get(user.id);
        if (member) {
          userInfo.presence = extractUserPresence(member);
        }
      }
    }
    
    // For DM channels
    userInfo.currentChannel.name = 'Direct Message';
    userInfo.currentChannel.type = 'DM';
  }

  return userInfo;
}

module.exports = { 
  getUserInfo, 
  getRoleAnalysis, 
  getAvailableActions,
  getServerRoleInformation,
  formatRoleContext
};