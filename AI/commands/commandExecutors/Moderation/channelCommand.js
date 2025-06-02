const { PermissionsBitField, ChannelType, EmbedBuilder } = require('discord.js');

/**
 * Create a new channel
 */
async function executeCreateChannel(message, command) {
  try {
    const { channelName, channelType, category, topic, slowmode, nsfw } = command.parameters;
    
    if (!channelName) {
      return {
        success: false,
        message: 'Missing required parameter: channelName'
      };
    }

    const guild = message.guild;
    const executor = message.member;

    // Check if user has permission to manage channels
    if (!executor.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return {
        success: false,
        message: 'You need "Manage Channels" permission to create channels'
      };
    }

    // Check if channel name already exists
    const existingChannel = guild.channels.cache.find(channel => 
      channel.name.toLowerCase() === channelName.toLowerCase()
    );
    if (existingChannel) {
      return {
        success: false,
        message: `Channel "${channelName}" already exists`
      };
    }

    // Prepare channel options
    const channelOptions = {
      name: channelName,
      type: channelType === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText
    };

    // Add optional properties
    if (topic) channelOptions.topic = topic;
    if (slowmode && channelType !== 'voice') {
      const slowmodeSeconds = parseInt(slowmode);
      if (slowmodeSeconds >= 0 && slowmodeSeconds <= 21600) { // Max 6 hours
        channelOptions.rateLimitPerUser = slowmodeSeconds;
      }
    }
    if (nsfw !== undefined && channelType !== 'voice') {
      channelOptions.nsfw = nsfw;
    }

    // Find category if specified
    if (category) {
      const categoryChannel = guild.channels.cache.find(c => 
        c.type === ChannelType.GuildCategory && 
        (c.name.toLowerCase() === category.toLowerCase() || c.id === category)
      );
      if (categoryChannel) {
        channelOptions.parent = categoryChannel.id;
      }
    }

    // Create the channel
    const newChannel = await guild.channels.create(channelOptions);

    return {
      success: true,
      message: `Successfully created ${channelType || 'text'} channel "${newChannel.name}"`,
      embed: new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Channel Created')
        .setDescription(`**${newChannel.name}** has been created successfully`)
        .addFields([
          { name: 'Channel Name', value: newChannel.name, inline: true },
          { name: 'Channel ID', value: newChannel.id, inline: true },
          { name: 'Type', value: channelType === 'voice' ? 'Voice' : 'Text', inline: true },
          { name: 'Category', value: newChannel.parent?.name || 'None', inline: true },
          { name: 'Position', value: newChannel.position.toString(), inline: true },
          { name: 'Created By', value: executor.user.tag, inline: true }
        ])
        .setTimestamp()
        .setFooter({ text: 'Iris AI Channel Management' })
    };

  } catch (error) {
    console.error('Error in executeCreateChannel:', error);
    return {
      success: false,
      message: `Error creating channel: ${error.message}`
    };
  }
}

/**
 * Delete a channel
 */
async function executeDeleteChannel(message, command) {
  try {
    const { channelId } = command.parameters;
    
    if (!channelId) {
      return {
        success: false,
        message: 'Missing required parameter: channelId'
      };
    }

    const guild = message.guild;
    const executor = message.member;
    const channel = guild.channels.cache.get(channelId);

    if (!channel) {
      return {
        success: false,
        message: 'Channel not found'
      };
    }

    // Check if user has permission to manage channels
    if (!executor.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return {
        success: false,
        message: 'You need "Manage Channels" permission to delete channels'
      };
    }

    const channelName = channel.name;
    const channelType = channel.type;

    // Delete the channel
    await channel.delete();

    return {
      success: true,
      message: `Successfully deleted channel "${channelName}"`,
      embed: new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('🗑️ Channel Deleted')
        .setDescription(`**${channelName}** has been deleted successfully`)
        .addFields([
          { name: 'Channel Name', value: channelName, inline: true },
          { name: 'Type', value: channelType === ChannelType.GuildVoice ? 'Voice' : 'Text', inline: true },
          { name: 'Deleted By', value: executor.user.tag, inline: true }
        ])
        .setTimestamp()
        .setFooter({ text: 'Iris AI Channel Management' })
    };

  } catch (error) {
    console.error('Error in executeDeleteChannel:', error);
    return {
      success: false,
      message: `Error deleting channel: ${error.message}`
    };
  }
}

/**
 * Edit channel properties
 */
async function executeEditChannel(message, command) {
  try {
    const { channelId, name, topic, slowmode, nsfw, position } = command.parameters;
    
    if (!channelId) {
      return {
        success: false,
        message: 'Missing required parameter: channelId'
      };
    }

    const guild = message.guild;
    const executor = message.member;
    const channel = guild.channels.cache.get(channelId);

    if (!channel) {
      return {
        success: false,
        message: 'Channel not found'
      };
    }

    // Check if user has permission to manage channels
    if (!executor.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return {
        success: false,
        message: 'You need "Manage Channels" permission to edit channels'
      };
    }

    // Prepare edit options
    const editOptions = {};
    const changes = [];
    
    if (name !== undefined) {
      // Check if new name already exists
      const existingChannel = guild.channels.cache.find(c => 
        c.name.toLowerCase() === name.toLowerCase() && c.id !== channelId
      );
      if (existingChannel) {
        return {
          success: false,
          message: `Channel name "${name}" already exists`
        };
      }
      editOptions.name = name;
      changes.push(`Name: ${channel.name} → ${name}`);
    }

    if (topic !== undefined && channel.type === ChannelType.GuildText) {
      editOptions.topic = topic;
      changes.push(`Topic: ${channel.topic || 'None'} → ${topic || 'None'}`);
    }

    if (slowmode !== undefined && channel.type === ChannelType.GuildText) {
      const slowmodeSeconds = parseInt(slowmode);
      if (slowmodeSeconds >= 0 && slowmodeSeconds <= 21600) {
        editOptions.rateLimitPerUser = slowmodeSeconds;
        changes.push(`Slowmode: ${channel.rateLimitPerUser}s → ${slowmodeSeconds}s`);
      }
    }

    if (nsfw !== undefined && channel.type === ChannelType.GuildText) {
      editOptions.nsfw = nsfw;
      changes.push(`NSFW: ${channel.nsfw ? 'Yes' : 'No'} → ${nsfw ? 'Yes' : 'No'}`);
    }

    if (position !== undefined) {
      editOptions.position = position;
      changes.push(`Position: ${channel.position} → ${position}`);
    }

    // Edit the channel
    await channel.edit(editOptions);

    return {
      success: true,
      message: `Successfully edited channel "${channel.name}"`,
      embed: new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('✏️ Channel Edited')
        .setDescription(`**${channel.name}** has been edited successfully`)
        .addFields([
          { name: 'Channel Name', value: channel.name, inline: true },
          { name: 'Channel ID', value: channel.id, inline: true },
          { name: 'Type', value: channel.type === ChannelType.GuildVoice ? 'Voice' : 'Text', inline: true },
          { name: 'Changes Made', value: changes.join('\n') || 'No changes', inline: false },
          { name: 'Edited By', value: executor.user.tag, inline: true }
        ])
        .setTimestamp()
        .setFooter({ text: 'Iris AI Channel Management' })
    };

  } catch (error) {
    console.error('Error in executeEditChannel:', error);
    return {
      success: false,
      message: `Error editing channel: ${error.message}`
    };
  }
}

/**
 * Clone a channel
 */
async function executeCloneChannel(message, command) {
  try {
    const { channelId, newName } = command.parameters;
    
    if (!channelId) {
      return {
        success: false,
        message: 'Missing required parameter: channelId'
      };
    }

    const guild = message.guild;
    const executor = message.member;
    const sourceChannel = guild.channels.cache.get(channelId);

    if (!sourceChannel) {
      return {
        success: false,
        message: 'Source channel not found'
      };
    }

    // Check if user has permission to manage channels
    if (!executor.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return {
        success: false,
        message: 'You need "Manage Channels" permission to clone channels'
      };
    }

    const cloneName = newName || `${sourceChannel.name}-clone`;

    // Check if clone name already exists
    const existingChannel = guild.channels.cache.find(channel => 
      channel.name.toLowerCase() === cloneName.toLowerCase()
    );
    if (existingChannel) {
      return {
        success: false,
        message: `Channel "${cloneName}" already exists`
      };
    }

    // Clone the channel
    const clonedChannel = await sourceChannel.clone({
      name: cloneName
    });

    return {
      success: true,
      message: `Successfully cloned channel "${sourceChannel.name}" as "${clonedChannel.name}"`,
      embed: new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle('📋 Channel Cloned')
        .setDescription(`**${sourceChannel.name}** has been cloned successfully`)
        .addFields([
          { name: 'Original Channel', value: sourceChannel.name, inline: true },
          { name: 'Cloned Channel', value: clonedChannel.name, inline: true },
          { name: 'New Channel ID', value: clonedChannel.id, inline: true },
          { name: 'Type', value: clonedChannel.type === ChannelType.GuildVoice ? 'Voice' : 'Text', inline: true },
          { name: 'Cloned By', value: executor.user.tag, inline: true }
        ])
        .setTimestamp()
        .setFooter({ text: 'Iris AI Channel Management' })
    };

  } catch (error) {
    console.error('Error in executeCloneChannel:', error);
    return {
      success: false,
      message: `Error cloning channel: ${error.message}`
    };
  }
}

/**
 * Lock a channel to prevent members from sending messages
 */
async function executeLockChannel(message, command) {
  try {
    const { channel_id } = command.parameters || command;
    let targetChannel = message.channel; // Default to current channel
    
    // If channel_id is provided, try to find that channel
    if (channel_id) {
      try {
        targetChannel = await message.guild.channels.fetch(channel_id);
        if (!targetChannel) {
          return {
            success: false,
            message: `Channel not found with ID: ${channel_id}`
          };
        }
        
        // Check if it's a text channel that can be locked
        if (!targetChannel.isTextBased()) {
          return {
            success: false,
            message: `Channel **${targetChannel.name}** is not a text channel and cannot be locked.`
          };
        }
      } catch (error) {
        console.error('Error fetching target channel:', error);
        return {
          success: false,
          message: `Cannot find channel with ID: ${channel_id}`
        };
      }
    }
    
    if (!targetChannel.guild) {
      return {
        success: false,
        message: 'Cannot lock DM channels.'
      };
    }

    const executor = message.member;

    // Check if user has permission to manage channels
    if (!executor.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return {
        success: false,
        message: 'You need "Manage Channels" permission to lock channels'
      };
    }
    
    try {
      // Get @everyone role
      const everyoneRole = targetChannel.guild.roles.everyone;
      
      // Remove SEND_MESSAGES permission for @everyone
      await targetChannel.permissionOverwrites.edit(everyoneRole, {
        SendMessages: false
      });
      
      // Log the action
      console.log(`Channel #${targetChannel.name} (${targetChannel.id}) locked by ${message.author.username}.`);
      
      // Different messages for current vs specific channel
      let successMessage;
      if (channel_id && targetChannel.id !== message.channel.id) {
        successMessage = `Successfully locked channel **#${targetChannel.name}** (ID: ${targetChannel.id}). Only users with manage permissions can send messages.`;
      } else {
        successMessage = `Successfully locked channel **#${targetChannel.name}**. Only users with manage permissions can send messages.`;
      }

      return {
        success: true,
        message: successMessage,
        embed: new EmbedBuilder()
          .setColor(0xFF6600)
          .setTitle('🔒 Channel Locked')
          .setDescription(`**${targetChannel.name}** has been locked successfully`)
          .addFields([
            { name: 'Channel Name', value: targetChannel.name, inline: true },
            { name: 'Channel ID', value: targetChannel.id, inline: true },
            { name: 'Locked By', value: executor.user.tag, inline: true },
            { name: 'Status', value: 'Only users with manage permissions can send messages', inline: false }
          ])
          .setTimestamp()
          .setFooter({ text: 'Iris AI Channel Management' })
      };
      
    } catch (error) {
      console.error('Error locking channel:', error);
      return {
        success: false,
        message: 'Cannot lock channel. Please check bot permissions.'
      };
    }

  } catch (error) {
    console.error('Error in executeLockChannel:', error);
    return {
      success: false,
      message: `Error locking channel: ${error.message}`
    };
  }
}

/**
 * Unlock a channel to allow members to send messages again
 */
async function executeUnlockChannel(message, command) {
  try {
    const { channel_id } = command.parameters || command;
    let targetChannel = message.channel; // Default to current channel
    
    // If channel_id is provided, try to find that channel
    if (channel_id) {
      try {
        targetChannel = await message.guild.channels.fetch(channel_id);
        if (!targetChannel) {
          return {
            success: false,
            message: `Channel not found with ID: ${channel_id}`
          };
        }
        
        // Check if it's a text channel that can be unlocked
        if (!targetChannel.isTextBased()) {
          return {
            success: false,
            message: `Channel **${targetChannel.name}** is not a text channel and cannot be unlocked.`
          };
        }
      } catch (error) {
        console.error('Error fetching target channel:', error);
        return {
          success: false,
          message: `Cannot find channel with ID: ${channel_id}`
        };
      }
    }
    
    if (!targetChannel.guild) {
      return {
        success: false,
        message: 'Cannot unlock DM channels.'
      };
    }

    const executor = message.member;

    // Check if user has permission to manage channels
    if (!executor.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return {
        success: false,
        message: 'You need "Manage Channels" permission to unlock channels'
      };
    }
    
    try {
      // Get @everyone role
      const everyoneRole = targetChannel.guild.roles.everyone;
      
      // Restore SEND_MESSAGES permission for @everyone (set to null to use default)
      await targetChannel.permissionOverwrites.edit(everyoneRole, {
        SendMessages: null
      });
      
      // Log the action
      console.log(`Channel #${targetChannel.name} (${targetChannel.id}) unlocked by ${message.author.username}.`);
      
      // Different messages for current vs specific channel
      let successMessage;
      if (channel_id && targetChannel.id !== message.channel.id) {
        successMessage = `Successfully unlocked channel **#${targetChannel.name}** (ID: ${targetChannel.id}). Members can send messages again.`;
      } else {
        successMessage = `Successfully unlocked channel **#${targetChannel.name}**. Members can send messages again.`;
      }

      return {
        success: true,
        message: successMessage,
        embed: new EmbedBuilder()
          .setColor(0x00FF66)
          .setTitle('🔓 Channel Unlocked')
          .setDescription(`**${targetChannel.name}** has been unlocked successfully`)
          .addFields([
            { name: 'Channel Name', value: targetChannel.name, inline: true },
            { name: 'Channel ID', value: targetChannel.id, inline: true },
            { name: 'Unlocked By', value: executor.user.tag, inline: true },
            { name: 'Status', value: 'Members can send messages again', inline: false }
          ])
          .setTimestamp()
          .setFooter({ text: 'Iris AI Channel Management' })
      };
      
    } catch (error) {
      console.error('Error unlocking channel:', error);
      return {
        success: false,
        message: 'Cannot unlock channel. Please check bot permissions.'
      };
    }

  } catch (error) {
    console.error('Error in executeUnlockChannel:', error);
    return {
      success: false,
      message: `Error unlocking channel: ${error.message}`
    };
  }
}

module.exports = {
  executeCreateChannel,
  executeDeleteChannel,
  executeEditChannel,
  executeCloneChannel,
  executeLockChannel,
  executeUnlockChannel
};