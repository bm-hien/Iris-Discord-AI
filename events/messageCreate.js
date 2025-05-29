/**
 * Handle new message events
 */
const { Events } = require('discord.js');
const { generateResponse } = require('../AI/ai.js');
const { handleCommand } = require('../AI/commands/commandHandler.js');
const { getUserInfo } = require('./utils/userInfo');
const { EmbedPaginator } = require('../AI/utilities/pagination');

module.exports = {
  name: Events.MessageCreate,
  once: false,
  execute: async (message, client) => {
    // Ignore messages from bots to prevent infinite loops
    if (message.author.bot) return;
    
    // Check if the message is a reply to bot's message
    let isReplyToBot = false;
    let originalUserId = message.author.id;
    let originalMessage = null;
    
    // Check if message is a reply and get reference information
    if (message.reference && message.reference.messageId) {
      try {
        // Fetch the replied message
        const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
        originalMessage = repliedMessage;
        
        // Check if the replied message is from our bot
        if (repliedMessage.author.id === client.user.id) {
          isReplyToBot = true;
          
          // Find the original user that the bot message replied to
          if (repliedMessage.reference && repliedMessage.reference.messageId) {
            const originalMessageRef = await message.channel.messages.fetch(repliedMessage.reference.messageId);
            originalUserId = originalMessageRef.author.id;
            console.log(`Using conversation history of user: ${originalUserId}`);
          }
        }
      } catch (error) {
        console.error('Error fetching replied message:', error);
      }
    }

    // Check if message mentions bot or is in DM
    const isMentioned = message.mentions.has(client.user.id);
    const isDM = message.channel.type === 'DM';
    
    // NEW: Check if this is a reply to another user's message AND mentions the bot
    const isReplyToUserWithBotMention = !isReplyToBot && originalMessage && 
                                        originalMessage.author.id !== client.user.id && 
                                        message.mentions.has(client.user.id);
    
    // Only respond to mentions, DMs, replies to bot, or when replying with mention
    if (isMentioned || isDM || isReplyToBot || isReplyToUserWithBotMention) {
      try {
        // Show typing indicator for more natural feel
        await message.channel.sendTyping();

        // Remove bot mention from message content if present
        let content = message.content;
        if (isMentioned) {
          content = content.replace(new RegExp(`<@!?${client.user.id}>`), '').trim();
        }
        
        // If message is empty after removing mention, use default greeting
        if (!content) {
          content = "Hello!";
        }
        
        // NEW: If replying to another user's message with bot mention, include that context
        if (isReplyToUserWithBotMention && originalMessage) {
          // Prepend the original message for context
          const originalAuthor = originalMessage.author.username;
          content = `Message from ${originalAuthor}: "${originalMessage.content}"\n\nI want you to: ${content}`;
          
          // Set the original user ID to the current user for proper conversation history
          originalUserId = message.author.id;
        }

        // Get user information for context
        const userInfo = getUserInfo(message);
        // Add avatar URL for embed
        userInfo.avatarUrl = message.author.displayAvatarURL({ format: 'png', dynamic: true });
        
        // Check for image attachments
        const imageAttachments = message.attachments.filter(attachment => {
          const contentType = attachment.contentType?.toLowerCase() || '';
          return contentType.startsWith('image/');
        }).map(attachment => ({
          url: attachment.url,
          contentType: attachment.contentType || 'image/jpeg'
        }));

        const videoAttachments = message.attachments.filter(attachment => {
          const contentType = attachment.contentType?.toLowerCase() || '';
          return contentType.startsWith('video/');
        }).map(attachment => ({
          url: attachment.url,
          contentType: attachment.contentType || 'video/mp4',
          type: 'video'
        }));

        const mediaAttachments = [...imageAttachments, ...videoAttachments];

        // Get AI response
        const response = await generateResponse(content, originalUserId, userInfo, mediaAttachments);
        
        // Send AI response with embeds
        if (response.embeds && response.embeds.length > 0) {
          // First, determine if we have too many embeds to send at once
          const maxEmbedsPerMessage = 10; // Discord's limit
          
          // Send first batch with reply
          const firstBatch = response.embeds.slice(0, maxEmbedsPerMessage);
          await message.reply({ embeds: firstBatch });
          
          // Send additional batches if needed
          if (response.embeds.length > maxEmbedsPerMessage) {
            for (let i = maxEmbedsPerMessage; i < response.embeds.length; i += maxEmbedsPerMessage) {
              const batch = response.embeds.slice(i, i + maxEmbedsPerMessage);
              await message.channel.send({ embeds: batch });
            }
          }
        } else {
          await message.reply(response.text);
        }

        // If there's a command in the response, handle it
        if (response.command) {
          // Process command and get result
          const commandResult = await handleCommand(message, response.command);
          
          // Send command result if available
          if (commandResult) {
            if (commandResult.embed) {
              // Send command result as embed
              await message.channel.send({ embeds: [commandResult.embed] });
            } else {
              await message.channel.send(`🤖 ${commandResult}`);
            }
          }
        }
      } catch (error) {
        console.error('Error handling AI message:', error);
        await message.reply('Sorry, I encountered an error while processing your message.');
      }
    }
  }
};