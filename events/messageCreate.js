/**
 * Handle new message events with status indicators and rate limiting
 */
const { Events, EmbedBuilder } = require('discord.js');
const { generateResponse } = require('../AI/ai.js');
const { handleCommand } = require('../AI/commands/commandHandler.js');
const { getUserInfo } = require('./utils/userInfo');
const { imageToBase64, videoToBase64, isVideoFile, isPdfFile, isSupportedDocumentFile, pdfToBase64 } = require('../AI/functions/mediaProcessor');

// Map để track active requests per user (chỉ khi AI đang xử lý)
const activeRequests = new Set();

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
        
        if (repliedMessage.author.id === client.user.id) {
          isReplyToBot = true;
          originalUserId = repliedMessage.author.id;
          originalMessage = repliedMessage;
        }
        
        // Extract attachments from replied message for processing
        if (repliedMessage.attachments && repliedMessage.attachments.size > 0) {
          for (const attachment of repliedMessage.attachments.values()) {
            if (attachment.contentType) {
              // Check if it's an image
              if (attachment.contentType.startsWith('image/')) {
                // Add image attachment to current message processing
                message.imageAttachments = message.imageAttachments || [];
                message.imageAttachments.push({
                  url: attachment.url,
                  contentType: attachment.contentType,
                  type: 'image'
                });
              }
              // Check if it's a video
              else if (isVideoFile(attachment.contentType)) {
                // Add video attachment to current message processing
                message.videoAttachments = message.videoAttachments || [];
                message.videoAttachments.push({
                  url: attachment.url,
                  contentType: attachment.contentType,
                  type: 'video'
                });
              }
            }
          }
        }
        
      } catch (error) {
        console.error('Error fetching replied message:', error);
      }
    }

    // Check if message mentions bot or is in DM
    const isMentioned = message.mentions.has(client.user.id);
    const isDM = message.channel.type === 'DM';
    
    // Check if this is a reply to another user's message AND mentions the bot
    const isReplyToUserWithBotMention = !isReplyToBot && originalMessage && 
                                        originalMessage.author.id !== client.user.id && 
                                        message.mentions.has(client.user.id);
    
    // Only respond to mentions, DMs, replies to bot, or when replying with mention
    if (isMentioned || isDM || isReplyToBot || isReplyToUserWithBotMention) {
      
      const userId = message.author.id;
      
      // Check if user has active request (AI đang xử lý)
      if (activeRequests.has(userId)) {
        const waitEmbed = new EmbedBuilder()
          .setColor(0xFFAA00)
          .setTitle('⏳ Please Wait')
          .setDescription('I\'m still processing your previous message. Please wait for me to finish before sending another request.')
          .addFields({
            name: '💡 Why?',
            value: 'This prevents overlapping responses and ensures proper conversation flow!',
            inline: false
          })
          .setFooter({ text: 'Your request will be processed once the current one is complete' })
          .setTimestamp();
        
        const reply = await message.reply({ 
          embeds: [waitEmbed],
          allowedMentions: { repliedUser: false }
        });
        
        // Auto-delete the warning after 8 seconds
        setTimeout(() => {
          reply.delete().catch(() => {});
        }, 8000);
        
        return;
      }
      
      // Mark user as having active request
      activeRequests.add(userId);
      
      try {
        // Show immediate processing status
        const processingEmbed = new EmbedBuilder()
          .setColor(0xFFAA00) // Yellow for processing status
          .setAuthor({ 
            name: 'Iris AI',
            iconURL: client.user.displayAvatarURL()
          })
          .setDescription('🤔 **Thinking...**')
          .setTimestamp();

        // Send status message and save reference for editing later
        const statusMessage = await message.reply({ 
          embeds: [processingEmbed],
          allowedMentions: { repliedUser: false }
        });

        // Remove bot mention from message content if present
        let content = message.content;
        if (isMentioned) {
          content = content.replace(new RegExp(`<@!?${client.user.id}>`), '').trim();
        }
        
        // If message is empty after removing mention, use default greeting
        if (!content) {
          content = "Hello!";
        }

        // If replying to another user's message with bot mention, include that context
        if (isReplyToUserWithBotMention && originalMessage) {
          // Prepend the original message for context
          const originalAuthor = originalMessage.author.username;
          content = `Message from ${originalAuthor}: "${originalMessage.content}"\n\nI want you to: ${content}`;
          
          // Set the original user ID to the current user for proper conversation history
          originalUserId = message.author.id;
        }

        // Get user information for context
        const userInfo = await getUserInfo(message);
        // Add avatar URL for embed
        userInfo.avatarUrl = message.author.displayAvatarURL({ format: 'png', dynamic: true });
        
        // Check for image attachments
        const imageAttachments = message.attachments.filter(attachment => {
          const contentType = attachment.contentType?.toLowerCase() || '';
          return contentType.startsWith('image/');
        }).map(attachment => ({
          url: attachment.url,
          contentType: attachment.contentType || 'image/jpeg',
          type: 'image'
        }));

        if (message.imageAttachments) {
          imageAttachments.push(...message.imageAttachments);
        }

        const videoAttachments = message.attachments.filter(attachment => {
          const contentType = attachment.contentType?.toLowerCase() || '';
          return contentType.startsWith('video/');
        }).map(attachment => ({
          url: attachment.url,
          contentType: attachment.contentType || 'video/mp4',
          type: 'video'
        }));

        if (message.videoAttachments) {
          videoAttachments.push(...message.videoAttachments);
        }

        const documentAttachments = message.attachments.filter(attachment => {
          const contentType = attachment.contentType?.toLowerCase() || '';
          const supportedTypes = [
            'application/pdf',
            'text/plain',
            'text/html',
            'text/css',
            'text/md',
            'text/csv',
            'text/xml',
            'text/rtf',
            'application/x-javascript',
            'text/javascript',
            'application/x-python',
            'text/x-python'
          ];
          return supportedTypes.some(type => contentType.includes(type));
        }).map(attachment => ({
          url: attachment.url,
          contentType: attachment.contentType || 'application/pdf',
          type: 'document'
        }));

        const mediaAttachments = [...imageAttachments, ...videoAttachments, ...documentAttachments];

        // Update status based on media type
        let statusText = '🤔 **Thinking...**';
        
        if (documentAttachments.length > 0) {
          const pdfCount = documentAttachments.filter(att => att.contentType.includes('pdf')).length;
          const otherDocCount = documentAttachments.length - pdfCount;
          
          if (pdfCount > 0 && otherDocCount > 0) {
            statusText = `📄 **Reading ${pdfCount} PDF${pdfCount > 1 ? 's' : ''} and ${otherDocCount} other document${otherDocCount > 1 ? 's' : ''}...**`;
          } else if (pdfCount > 0) {
            statusText = `📄 **Reading ${pdfCount} PDF file${pdfCount > 1 ? 's' : ''}...**`;
          } else {
            statusText = `📄 **Analyzing ${otherDocCount} document${otherDocCount > 1 ? 's' : ''}...**`;
          }
        } else if (documentAttachments.length > 0 && imageAttachments.length > 0) {
          statusText = `📄 **Reading ${documentAttachments.length} document${documentAttachments.length > 1 ? 's' : ''} and ${imageAttachments.length} image${imageAttachments.length > 1 ? 's' : ''}...**`;
        } else if (imageAttachments.length > 0 && videoAttachments.length > 0) {
          statusText = `🖼️ **Analyzing ${imageAttachments.length} image${imageAttachments.length > 1 ? 's' : ''} and ${videoAttachments.length} video${videoAttachments.length > 1 ? 's' : ''}...**`;
        } else if (imageAttachments.length > 0) {
          statusText = `🖼️ **Analyzing ${imageAttachments.length} image${imageAttachments.length > 1 ? 's' : ''}...**`;
        } else if (videoAttachments.length > 0) {
          statusText = `🎬 **Analyzing ${videoAttachments.length} video${videoAttachments.length > 1 ? 's' : ''}...**`;
        }

        // Check for URLs
        const urlPattern = /https?:\/\/(?:[-\w.])+(?:[:\d]+)?(?:\/(?:[\w/_.])*)?(?:\?(?:[\w&=%.])*)?(?:#(?:[\w.])*)?/gi;
        const urls = content.match(urlPattern);
        
        if (urls && urls.length > 0) {
          if (mediaAttachments.length > 0) {
            statusText += `\n🌐 **Accessing ${urls.length} website${urls.length > 1 ? 's' : ''}...**`;
          } else {
            statusText = `🌐 **Accessing and analyzing ${urls.length} website${urls.length > 1 ? 's' : ''}...**`;
          }
        }

        // Update status message if there are media or URLs
        if (mediaAttachments.length > 0 || (urls && urls.length > 0)) {
          const updatedEmbed = new EmbedBuilder()
            .setColor(0x3498db) // Blue when processing media
            .setAuthor({ 
              name: 'Iris AI',
              iconURL: client.user.displayAvatarURL()
            })
            .setDescription(statusText)
            .setTimestamp();

          await statusMessage.edit({ embeds: [updatedEmbed] });
          
          // Small delay to let users see the status
          await new Promise(resolve => setTimeout(resolve, 1500));
        }

        // Update status when starting to generate response
        const thinkingEmbed = new EmbedBuilder()
          .setColor(0x9B59B6) // Purple when generating
          .setAuthor({ 
            name: 'Iris AI',
            iconURL: client.user.displayAvatarURL()
          })
          .setDescription('🧠 **Generating response...**')
          .setTimestamp();

        await statusMessage.edit({ embeds: [thinkingEmbed] });

        // Generate AI response
        const response = await generateResponse(content, originalUserId, userInfo, mediaAttachments);
        
        // Delete status message before sending actual response
        await statusMessage.delete().catch(() => {}); // Ignore error if already deleted

        // Send AI response with embeds
        if (response.embeds && response.embeds.length > 0) {
          // First, determine if we have too many embeds to send at once
          const maxEmbedsPerMessage = 10; // Discord's limit
          
          // Send first batch with reply
          const firstBatch = response.embeds.slice(0, maxEmbedsPerMessage);
          await message.reply({ 
            embeds: firstBatch,
            allowedMentions: { repliedUser: false }
          });
          
          // Send additional batches if needed
          if (response.embeds.length > maxEmbedsPerMessage) {
            for (let i = maxEmbedsPerMessage; i < response.embeds.length; i += maxEmbedsPerMessage) {
              const batch = response.embeds.slice(i, i + maxEmbedsPerMessage);
              await message.channel.send({ embeds: batch });
            }
          }
        } else {
          await message.reply({ 
            content: response.text || "Request processed successfully.",
            allowedMentions: { repliedUser: false }
          });
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
        
        // Update status message with error
        const errorEmbed = new EmbedBuilder()
          .setColor(0xFF0000) // Red for error
          .setAuthor({ 
            name: 'Iris AI',
            iconURL: client.user.displayAvatarURL()
          })
          .setDescription('❌ **An error occurred while processing your request**')
          .addFields([
            {
              name: 'Error Details',
              value: `\`\`\`${error.message.slice(0, 1000)}\`\`\``,
              inline: false
            }
          ])
          .setTimestamp();

        try {
          // Try to edit the existing status message
          if (typeof statusMessage !== 'undefined') {
            await statusMessage.edit({ embeds: [errorEmbed] });
            
            // Auto-delete error message after 10 seconds
            setTimeout(async () => {
              try {
                await statusMessage.delete();
              } catch (e) {
                // Ignore deletion errors
              }
            }, 10000);
          } else {
            // If no status message exists, send new error message
            const errorMsg = await message.reply({ 
              embeds: [errorEmbed],
              allowedMentions: { repliedUser: false }
            });
            
            // Auto-delete after 10 seconds
            setTimeout(async () => {
              try {
                await errorMsg.delete();
              } catch (e) {
                // Ignore deletion errors
              }
            }, 10000);
          }
        } catch (e) {
          // If all else fails, send a simple text message
          await message.reply({ 
            content: 'Sorry, I encountered an error while processing your message.',
            allowedMentions: { repliedUser: false }
          });
        }
      } finally {
        // QUAN TRỌNG: Remove user from active requests khi AI xong
        activeRequests.delete(userId);
      }
    }
  }
};