/**
 * Trích xuất thông tin người dùng để AI hiểu ngữ cảnh
 */
const { PermissionsBitField, ChannelType, ActivityType } = require('discord.js');
const { checkUserPermissions } = require('./permissions');

/**
 * Trích xuất thông tin người dùng từ message
 * @param {Object} message - Tin nhắn Discord 
 * @returns {Object} Thông tin người dùng
 */
function getUserInfo(message) {
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
    // NEW: Rich Presence information
    presence: {
      status: 'unknown',
      activities: [],
      isOnline: false,
      statusText: 'Không xác định',
      customStatus: null,
      isStreaming: false,
      isListening: false,
      isWatching: false,
      isPlaying: false,
      currentGame: null,
      currentApp: null
    }
  };

  // If message is in a guild (server), add additional context
  if (message.guild) {
    userInfo.serverName = message.guild.name;
    
    // Get all channels in the server
    userInfo.channels = getServerChannels(message.guild);
    
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
      
      // NEW: Extract Rich Presence information
      userInfo.presence = extractUserPresence(member);
      
      // Log the raw permissions bitfield for debugging
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

/**
 * Extract user's rich presence information
 * @param {GuildMember} member - Discord guild member
 * @returns {Object} Presence information
 */
function extractUserPresence(member) {
  const presence = member.presence;
  const presenceInfo = {
    status: 'offline',
    activities: [],
    isOnline: false,
    statusText: 'Offline',
    customStatus: null,
    isStreaming: false,
    isListening: false,
    isWatching: false,
    isPlaying: false,
    currentGame: null,
    currentApp: null,
    devices: []
  };

  if (!presence) {
    return presenceInfo;
  }

  // Extract basic status
  presenceInfo.status = presence.status;
  presenceInfo.isOnline = ['online', 'idle', 'dnd'].includes(presence.status);
  
  // Convert status to Vietnamese
  switch (presence.status) {
    case 'online':
      presenceInfo.statusText = 'Đang hoạt động';
      break;
    case 'idle':
      presenceInfo.statusText = 'Đang rời';
      break;
    case 'dnd':
      presenceInfo.statusText = 'Không làm phiền';
      break;
    case 'offline':
    default:
      presenceInfo.statusText = 'Offline';
      break;
  }

  // Extract client status (devices)
  if (presence.clientStatus) {
    presenceInfo.devices = Object.keys(presence.clientStatus).map(device => {
      const deviceNames = {
        desktop: 'Máy tính',
        mobile: 'Điện thoại',
        web: 'Trình duyệt'
      };
      return deviceNames[device] || device;
    });
  }

  // Extract activities
  if (presence.activities && presence.activities.length > 0) {
    for (const activity of presence.activities) {
      const activityInfo = {
        name: activity.name,
        type: activity.type,
        details: activity.details || null,
        state: activity.state || null,
        url: activity.url || null,
        startedAt: activity.timestamps?.start ? new Date(activity.timestamps.start) : null,
        largeImageText: activity.assets?.largeText || null,
        smallImageText: activity.assets?.smallText || null
      };

      presenceInfo.activities.push(activityInfo);

      // Set flags based on activity type
      switch (activity.type) {
        case ActivityType.Playing:
          presenceInfo.isPlaying = true;
          presenceInfo.currentGame = activity.name;
          break;
        case ActivityType.Streaming:
          presenceInfo.isStreaming = true;
          break;
        case ActivityType.Listening:
          presenceInfo.isListening = true;
          break;
        case ActivityType.Watching:
          presenceInfo.isWatching = true;
          break;
        case ActivityType.Custom:
          presenceInfo.customStatus = activity.state;
          break;
        case ActivityType.Competing:
          // Handle competing activities
          break;
      }

      // For applications (like VS Code, Spotify, etc.)
      if (activity.applicationId) {
        presenceInfo.currentApp = activity.name;
      }
    }
  }

  return presenceInfo;
}

/**
 * Get organized list of all channels in the server
 * @param {Guild} guild - Discord guild object
 * @returns {Object} Organized channel information
 */
function getServerChannels(guild) {
  const channels = {
    text: [],
    voice: [],
    category: [],
    forum: [],
    announcement: [],
    stage: [],
    thread: []
  };

  guild.channels.cache.forEach(channel => {
    const channelInfo = {
      id: channel.id,
      name: channel.name,
      position: channel.position || 0
    };

    switch (channel.type) {
      case ChannelType.GuildText:
        channels.text.push(channelInfo);
        break;
      case ChannelType.GuildVoice:
        channels.voice.push(channelInfo);
        break;
      case ChannelType.GuildCategory:
        channels.category.push(channelInfo);
        break;
      case ChannelType.GuildForum:
        channels.forum.push(channelInfo);
        break;
      case ChannelType.GuildAnnouncement:
        channels.announcement.push(channelInfo);
        break;
      case ChannelType.GuildStageVoice:
        channels.stage.push(channelInfo);
        break;
      case ChannelType.PublicThread:
      case ChannelType.PrivateThread:
        channels.thread.push(channelInfo);
        break;
    }
  });

  // Sort channels by position
  Object.keys(channels).forEach(type => {
    channels[type].sort((a, b) => a.position - b.position);
  });

  return channels;
}

module.exports = { getUserInfo };