const { PermissionsBitField, EmbedBuilder } = require('discord.js');

/**
 * Send a message to a specific channel
 */
async function executeSendMessage(message, command) {
  try {
    const { channelId, content } = command.parameters || command;
    
    if (!channelId || !content) {
      return {
        success: false,
        message: 'Missing required parameters: channelId and content'
      };
    }

    // Get target channel
    const targetChannel = await message.guild.channels.fetch(channelId);
    if (!targetChannel) {
      return {
        success: false,
        message: `Channel not found with ID: ${channelId}`
      };
    }

    // Check permissions
    const executor = message.member;
    if (!executor.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return {
        success: false,
        message: 'You need "Manage Messages" permission to send messages to other channels'
      };
    }

    // Send message with disabled pings
    await targetChannel.send({
      content: content,
      allowedMentions: { parse: [] } // This disables all pings
    });

    return {
      success: true,
      message: `Message sent to ${targetChannel.name} successfully`
    };

  } catch (error) {
    console.error('Error in executeSendMessage:', error);
    return {
      success: false,
      message: `Error sending message: ${error.message}`
    };
  }
}

/**
 * Pin a message in the current channel or specified channel
 */
async function executePinMessage(message, command) {
  try {
    const { messageId, channelId } = command.parameters;
    
    if (!messageId) {
      return {
        success: false,
        message: 'Missing required parameter: messageId'
      };
    }

    const guild = message.guild;
    const executor = message.member;
    let targetChannel = message.channel;

    // If channelId is provided, use that channel
    if (channelId) {
      targetChannel = guild.channels.cache.get(channelId);
      if (!targetChannel) {
        return {
          success: false,
          message: 'Target channel not found'
        };
      }
    }

    // Check if user has permission to manage messages
    if (!executor.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return {
        success: false,
        message: 'You need "Manage Messages" permission to pin messages'
      };
    }

    // Fetch and pin the message
    const targetMessage = await targetChannel.messages.fetch(messageId);
    if (!targetMessage) {
      return {
        success: false,
        message: 'Message not found'
      };
    }

    await targetMessage.pin();

    return {
      success: true,
      message: `Successfully pinned message in ${targetChannel.name}`,
      embed: new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('📌 Message Pinned')
        .setDescription(`Message pinned successfully in **${targetChannel.name}**`)
        .addFields([
          { name: 'Channel', value: targetChannel.name, inline: true },
          { name: 'Message ID', value: messageId, inline: true },
          { name: 'Original Author', value: targetMessage.author.tag, inline: true },
          { name: 'Content Preview', value: targetMessage.content.length > 100 ? targetMessage.content.substring(0, 100) + '...' : targetMessage.content || '*[Embed/Attachment]*', inline: false },
          { name: 'Pinned By', value: executor.user.tag, inline: true }
        ])
        .setTimestamp()
        .setFooter({ text: 'Iris AI Message Management' })
    };

  } catch (error) {
    console.error('Error in executePinMessage:', error);
    return {
      success: false,
      message: `Error pinning message: ${error.message}`
    };
  }
}

/**
 * Unpin a message
 */
async function executeUnpinMessage(message, command) {
  try {
    const { messageId, channelId } = command.parameters;
    
    if (!messageId) {
      return {
        success: false,
        message: 'Missing required parameter: messageId'
      };
    }

    const guild = message.guild;
    const executor = message.member;
    let targetChannel = message.channel;

    // If channelId is provided, use that channel
    if (channelId) {
      targetChannel = guild.channels.cache.get(channelId);
      if (!targetChannel) {
        return {
          success: false,
          message: 'Target channel not found'
        };
      }
    }

    // Check if user has permission to manage messages
    if (!executor.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return {
        success: false,
        message: 'You need "Manage Messages" permission to unpin messages'
      };
    }

    // Fetch and unpin the message
    const targetMessage = await targetChannel.messages.fetch(messageId);
    if (!targetMessage) {
      return {
        success: false,
        message: 'Message not found'
      };
    }

    await targetMessage.unpin();

    return {
      success: true,
      message: `Successfully unpinned message in ${targetChannel.name}`,
      embed: new EmbedBuilder()
        .setColor(0x808080)
        .setTitle('📌 Message Unpinned')
        .setDescription(`Message unpinned successfully in **${targetChannel.name}**`)
        .addFields([
          { name: 'Channel', value: targetChannel.name, inline: true },
          { name: 'Message ID', value: messageId, inline: true },
          { name: 'Unpinned By', value: executor.user.tag, inline: true }
        ])
        .setTimestamp()
        .setFooter({ text: 'Iris AI Message Management' })
    };

  } catch (error) {
    console.error('Error in executeUnpinMessage:', error);
    return {
      success: false,
      message: `Error unpinning message: ${error.message}`
    };
  }
}

/**
 * Add reaction to a message
 */
async function executeReactMessage(message, command) {
  try {
    const { messageId, emoji, channelId } = command.parameters;
    
    if (!messageId || !emoji) {
      return {
        success: false,
        message: 'Missing required parameters: messageId and emoji'
      };
    }

    const guild = message.guild;
    const executor = message.member;
    let targetChannel = message.channel;

    // If channelId is provided, use that channel
    if (channelId) {
      targetChannel = guild.channels.cache.get(channelId);
      if (!targetChannel) {
        return {
          success: false,
          message: 'Target channel not found'
        };
      }
    }

    // Check if user has permission to add reactions
    if (!executor.permissions.has(PermissionsBitField.Flags.AddReactions)) {
      return {
        success: false,
        message: 'You need "Add Reactions" permission to react to messages'
      };
    }

    // Fetch and react to the message
    const targetMessage = await targetChannel.messages.fetch(messageId);
    if (!targetMessage) {
      return {
        success: false,
        message: 'Message not found'
      };
    }

    await targetMessage.react(emoji);

    return {
      success: true,
      message: `Successfully added reaction ${emoji} to message`,
      embed: new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('😊 Reaction Added')
        .setDescription(`Reaction added successfully to message in **${targetChannel.name}**`)
        .addFields([
          { name: 'Channel', value: targetChannel.name, inline: true },
          { name: 'Message ID', value: messageId, inline: true },
          { name: 'Emoji', value: emoji, inline: true },
          { name: 'Added By', value: executor.user.tag, inline: true }
        ])
        .setTimestamp()
        .setFooter({ text: 'Iris AI Message Management' })
    };

  } catch (error) {
    console.error('Error in executeReactMessage:', error);
    return {
      success: false,
      message: `Error adding reaction: ${error.message}`
    };
  }
}


module.exports = {
  executeSendMessage,
  executePinMessage,
  executeUnpinMessage,
  executeReactMessage
};