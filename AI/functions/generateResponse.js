/**
 * Module for processing AI responses with Function Calling support and URL Context
 */
const { OpenAI } = require("openai");
const { GoogleGenAI, Type } = require("@google/genai");
const { EmbedBuilder } = require('discord.js');
const { getSystemMessage } = require('../events/systemMessage');
const { extractCommand } = require('../commands/commandHandler');
const { moderationFunctions, convertFunctionCallToCommand } = require('./functionCalling');
const { createCodeEmbed } = require('../utilities/formatters');
const { formatResponseForEmbed } = require('./responseFormatter');
const { imageToBase64, videoToBase64, isVideoFile, pdfToBase64, isPdfFile, isSupportedDocumentFile } = require('./mediaProcessor');
const { extractUrls } = require('../utilities/urlExtractor');
const { modelSupportsUrlContext } = require('../../commands/AI/model');
const {
  addMessageToHistory,
  getConversationHistory,
  getUserApiKey,
  getUserModel,
  getUserProvider,
  getUserEndpoint
} = require('../events/database');

/**
 * Generate AI response with Function Calling support and URL Context
 */
async function generateResponse(userMessage, userId, userInfo = {}, imageAttachments = []) {
  try {
    // Get user's API key if available
    const userApiKey = await getUserApiKey(userId);
    
    // Default API key from your configuration
    const defaultApiKey = "AIzaSyBNEL1IUR6q48crlfaVglQr9QavqRi-mcQ";
    
    // Use the appropriate API key
    const apiKey = userApiKey || defaultApiKey;
    
    // Get user's provider and endpoint preferences
    const userProvider = userApiKey ? await getUserProvider(userId) : 'gemini';
    const userEndpoint = userApiKey ? await getUserEndpoint(userId) : 'https://generativelanguage.googleapis.com/v1beta/openai/';
    
    // Initialize model settings based on provider
    let userModel;
    if (userApiKey) {
      userModel = await getUserModel(userId);
    }
    
    // Set default models based on provider
    let modelToUse;
    if (userModel) {
      modelToUse = userModel;
    } else {
      switch (userProvider) {
        case 'groq':
          modelToUse = 'llama-3.3-70b-versatile';
          break;
        case 'openai':
          modelToUse = 'gpt-4o-mini';
          break;
        case 'gemini':
        default:
          // Use a model that supports URL context for Gemini
          modelToUse = 'gemini-2.5-flash-preview-05-20';
          break;
      }
    }

    // Check if the provider is Gemini
    const isGeminiProvider = userProvider === 'gemini' || (!userApiKey && apiKey.startsWith("AIza"));

    const documentAttachments = imageAttachments.filter(attachment => {
      const contentType = attachment.contentType?.toLowerCase() || '';
      return isSupportedDocumentFile(contentType);
    });

    const actualImageAttachments = imageAttachments.filter(attachment => {
      const contentType = attachment.contentType?.toLowerCase() || '';
      return contentType.startsWith('image/') || contentType.startsWith('video/');
    });

    const currentModelSupportsUrlContext = isGeminiProvider && modelSupportsUrlContext(modelToUse);

    // Extract URLs from user message for context
    const urls = extractUrls(userMessage);
    const hasUrls = urls.length > 0;
    
    // Add user message to history
    await addMessageToHistory(userId, 'user', userMessage, userInfo.username);
    
    // Get conversation history
    const historyRows = await getConversationHistory(userId, 10);
    
    // Get system message from configuration
    const systemMessageTemplate = await getSystemMessage(userId);
    
    // Format user permissions for the AI to understand
    let userPermissionsText = '';
    if (userInfo.permissions) {
      if (userInfo.permissions.length === 0) {
        userPermissionsText = `- Permissions: NO ADMIN PERMISSIONS`;
      } else {
        userPermissionsText = `- Permissions: ${userInfo.permissions.join(', ')}`;
      }
    }

    const roleContextText = userInfo.roleContext || '';
    
    // Format user roles for role hierarchy context
    let userRolesText = '';
    if (userInfo.rolePositions) {
      userRolesText = `- Highest role: ${userInfo.highestRole || 'None'} (position: ${userInfo.rolePositions.highest || '0'})\n`;
      userRolesText += `- Lowest role: ${userInfo.lowestRole || '@everyone'} (position: ${userInfo.rolePositions.lowest || '0'})`;
    }
    
    // Create a customized system message with user information
    let channelInfoText = '';
    if (userInfo.currentChannel) {
      channelInfoText = `- Current channel: #${userInfo.currentChannel.name} (ID: ${userInfo.currentChannel.id})\n`;
      
      if (userInfo.channels && Object.keys(userInfo.channels).length > 0) {
        channelInfoText += `- Server channels list:\n`;
        
        // Add text channels
        if (userInfo.channels.text && userInfo.channels.text.length > 0) {
          channelInfoText += `  • Text channels: ${userInfo.channels.text.map(ch => `#${ch.name}`).join(', ')}\n`;
        }
        
        // Add voice channels
        if (userInfo.channels.voice && userInfo.channels.voice.length > 0) {
          channelInfoText += `  • Voice channels: ${userInfo.channels.voice.map(ch => `🔊${ch.name}`).join(', ')}\n`;
        }
        
        // Add categories
        if (userInfo.channels.category && userInfo.channels.category.length > 0) {
          channelInfoText += `  • Categories: ${userInfo.channels.category.map(ch => `📁${ch.name}`).join(', ')}\n`;
        }
        
        // Add forum channels
        if (userInfo.channels.forum && userInfo.channels.forum.length > 0) {
          channelInfoText += `  • Forum channels: ${userInfo.channels.forum.map(ch => `💬${ch.name}`).join(', ')}\n`;
        }
        
        // Add announcement channels
        if (userInfo.channels.announcement && userInfo.channels.announcement.length > 0) {
          channelInfoText += `  • Announcement channels: ${userInfo.channels.announcement.map(ch => `📢${ch.name}`).join(', ')}\n`;
        }
      }
    }

    let apiKeyStatusText = '';
    if (userApiKey) {
      const keyType = userApiKey.startsWith('AIza') ? 'Gemini' : 
                     userApiKey.startsWith('gsk_') ? 'Groq' : 
                     userApiKey.startsWith('sk-') ? 'OpenAI' : 'Custom';
      apiKeyStatusText = `- API Key: User has personal API key (${keyType})\n`;
    } else {
      apiKeyStatusText = `- API Key: User does NOT have personal API key (using default key)\n`;
    }

    let presenceText = '';
    if (userInfo.presence) {
      const presence = userInfo.presence;
      presenceText = `- Status: ${presence.statusText || 'Unknown'}`;
      
      // Safe check for devices array
      if (presence.devices && Array.isArray(presence.devices) && presence.devices.length > 0) {
        presenceText += ` (using: ${presence.devices.join(', ')})`;
      }
      
      if (presence.customStatus) {
        presenceText += `\n- Custom Status: "${presence.customStatus}"`;
      }
      
      // Safe check for activities array
      if (presence.activities && Array.isArray(presence.activities) && presence.activities.length > 0) {
        presenceText += `\n- Current activities:`;
        
        for (const activity of presence.activities) {
          switch (activity.type) {
            case 0: // Playing
              presenceText += `\n  • 🎮 Playing: ${activity.name}`;
              if (activity.details) presenceText += ` - ${activity.details}`;
              if (activity.state) presenceText += ` (${activity.state})`;
              break;
            case 1: // Streaming
              presenceText += `\n  • 📺 Streaming: ${activity.name}`;
              if (activity.url) presenceText += ` - ${activity.url}`;
              break;
            case 2: // Listening
              presenceText += `\n  • 🎵 Listening: ${activity.name}`;
              if (activity.details) presenceText += ` - ${activity.details}`;
              if (activity.state) presenceText += ` by ${activity.state}`;
              break;
            case 3: // Watching
              presenceText += `\n  • 📽️ Watching: ${activity.name}`;
              if (activity.details) presenceText += ` - ${activity.details}`;
              break;
            case 4: // Custom
              // Already handled above
              break;
            case 5: // Competing
              presenceText += `\n  • 🏆 Competing: ${activity.name}`;
              break;
            default:
              presenceText += `\n  • 💻 Using: ${activity.name}`;
              if (activity.details) presenceText += ` - ${activity.details}`;
              break;
          }
          
          if (activity.startedAt) {
            const duration = Math.floor((Date.now() - activity.startedAt.getTime()) / 60000);
            if (duration > 0) {
              presenceText += ` (${duration} minutes)`;
            }
          }
        }
      }
      
      presenceText += '\n';
    }

    const warningInfoText = userInfo.warningCount !== undefined ? 
      `- Current warnings: ${userInfo.warningCount}` : '';

    // Add URL context information to system message
    let urlContextText = '';
    if (hasUrls && currentModelSupportsUrlContext) {
      urlContextText = `\n- URL Context: Message contains ${urls.length} URL(s), AI will access and analyze content\n`;
      urlContextText += `- Detected URLs: ${urls.join(', ')}\n`;
      urlContextText += `- Current model (${modelToUse}) supports URL context\n`;
    } else if (hasUrls && isGeminiProvider && !currentModelSupportsUrlContext) {
      urlContextText = `\n- Warning: URLs detected but current model (${modelToUse}) doesn't support URL context\n`;
      urlContextText += `- Supported models: gemini-2.5-flash-preview-05-20, gemini-2.5-pro-preview-05-06, gemini-2.0-flash, gemini-2.0-flash-live-001\n`;
      urlContextText += `- Use /model set to switch to a model that supports URL context\n`;
    } else if (hasUrls && !isGeminiProvider) {
      urlContextText = `\n- Warning: URLs detected but current provider (${userProvider}) doesn't support URL context\n`;
      urlContextText += `- To use this feature, switch to Gemini provider and supported model\n`;
    }

    // Create a customized system message with user information
    const enhancedSystemMessage = {
      role: "system",
      content: `${systemMessageTemplate.content}

User Information:
- User ID: ${userId}
- Discord Tag: ${userInfo.tag || 'Unknown'}
- Server: ${userInfo.serverName || 'Direct Message'}
${channelInfoText}
${userInfo.isAdmin ? '- User is a server administrator' : '- User is NOT a server administrator'}
${userInfo.isOwner ? '- User is the server owner' : '- User is NOT the server owner'}
${userInfo.roles ? `- Roles: ${userInfo.roles}` : '- Roles: None'}
${userRolesText}
${userPermissionsText}
${apiKeyStatusText}
${presenceText}
${urlContextText}
${roleContextText}
${warningInfoText}

IMPORTANT about URL CONTEXT:
- When users send URLs, you ${currentModelSupportsUrlContext ? 'CAN' : 'CANNOT'} access and analyze website content
${currentModelSupportsUrlContext ? 
  '- Summarize, analyze, and answer questions based on URL content\n- Always cite sources when using information from URLs' :
  '- Inform that current model doesn\'t support URL context\n- Suggest user switch to supported model using /model set'
}
- If cannot access URL, clearly inform the user

ROLE MANAGEMENT INSTRUCTIONS:
- You can see ALL server roles and their details above
- Use add_role function to assign roles (requires proper permissions and hierarchy)
- Use remove_role function to remove roles (requires proper permissions and hierarchy)
- Always check role hierarchy and permissions before suggesting role actions
- Provide detailed explanations about roles when users ask
- Show which roles they can manage and which they cannot

SUPPORTED URL CONTEXT MODELS:
- gemini-2.5-flash-preview-05-20 (recommended)
- gemini-2.5-pro-preview-05-06
- gemini-2.0-flash
- gemini-2.0-flash-live-001

IMPORTANT: When users ask about API key or encounter rate limit:
- If they DON'T have personal API key, guide them to get free API key
- If they ALREADY have API key, help them check or update
- Always suggest using personal API key for better experience

FREE API KEY GUIDE:
📌 **Google Gemini API (Recommended):**
1. Go to https://aistudio.google.com/app/apikey
2. Login with Google account
3. Click "Create API Key" 
4. Copy API key (starts with "AIza...")
5. Use \`/apikey set\` command to setup

📌 **Groq API (Fast, free):**
1. Go to https://console.groq.com/keys
2. Create free account
3. Generate new API key
4. Copy API key (starts with "gsk_...")
5. Use \`/apikey set\` command to setup

IMPORTANT: NEVER list permissions when user has none. Check userPermissionsText carefully.
IMPORTANT: ONLY use function calling when user has sufficient permissions listed in userPermissionsText.

If someone sends images, describe the image content in detail in English.
`
    };
    
    let response;
    let functionCalls = [];
    let urlContextMetadata = null;

    // Generate response using the appropriate provider with function calling
    if (isGeminiProvider) {
      // Use Google Gemini API with Function Calling and URL Context
      const ai = new GoogleGenAI({ apiKey });
      const systemInstructions = enhancedSystemMessage.content;
      
      let parts = [];
      if (userMessage) {
        parts.push({ text: userMessage });
      }
      
      // Add images and videos for Gemini
      for (const attachment of actualImageAttachments) {
        try {
          if (attachment.type === 'video' || isVideoFile(attachment.contentType)) {
            const base64Video = await videoToBase64(attachment.url);
            if (base64Video) {
              parts.push({
                inlineData: {
                  data: base64Video,
                  mimeType: attachment.contentType
                }
              });
            }
          } else {
            const base64Image = await imageToBase64(attachment.url);
            if (base64Image) {
              parts.push({
                inlineData: {
                  data: base64Image,
                  mimeType: attachment.contentType
                }
              });
            }
          }
        } catch (error) {
          console.error("Error processing media attachment:", error);
        }
      }

      // Add document attachments for Gemini
      for (const attachment of documentAttachments) {
        try {
          if (isPdfFile(attachment.contentType)) {
            const base64Pdf = await pdfToBase64(attachment.url);
            if (base64Pdf) {
              parts.push({
                inlineData: {
                  data: base64Pdf,
                  mimeType: 'application/pdf'
                }
              });
            }
          } else {
            // Handle other document types
            const response = await fetch(attachment.url);
            if (response.ok) {
              const buffer = await response.buffer();
              const base64Doc = buffer.toString('base64');
              parts.push({
                inlineData: {
                  data: base64Doc,
                  mimeType: attachment.contentType
                }
              });
            }
          }
        } catch (error) {
          console.error("Error processing document attachment:", error);
        }
      }
      
      // Include conversation history in contents
      let contents = [];
      
      // Add history messages first
      for (const historyRow of historyRows) {
        contents.push({
          role: historyRow.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: historyRow.content }]
        });
      }
      
      // Add current message with parts (including images)
      contents.push({
        role: 'user',
        parts: parts
      });
      
      // Prepare config - CONFLICT RESOLUTION: Choose between URL context and function calling
      const config = {
        systemInstruction: systemInstructions,
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
      };

      // IMPORTANT: Due to Gemini API limitation, we can't use both URL context and function calling
      // Priority: URL context takes precedence when URLs are detected
      if (hasUrls && currentModelSupportsUrlContext) {
        // Use URL context tool (disable function calling)
        config.tools = [{ urlContext: {} }];
      } else {
        // Use function calling tool (no URL context)
        config.tools = [{
          functionDeclarations: moderationFunctions
        }];
      }
      
      const result = await ai.models.generateContent({
        model: modelToUse,
        contents: contents,
        config: config,
      });
      
      // Handle both text and function call responses
      response = result.text || "";
      
      // Get URL context metadata if available
      if (result.candidates?.[0]?.urlContextMetadata) {
        urlContextMetadata = result.candidates[0].urlContextMetadata;
      }
      
      // Check for function calls in Gemini response (only if not using URL context)
      if (!hasUrls || !currentModelSupportsUrlContext) {
        if (result.functionCalls && result.functionCalls.length > 0) {
          for (const functionCall of result.functionCalls) {
            functionCalls.push({
              name: functionCall.name,
              arguments: functionCall.args
            });
          }
        } else if (result.candidates?.[0]?.content?.parts) {
          // Fallback check for function calls in candidates
          for (const part of result.candidates[0].content.parts) {
            if (part.functionCall) {
              functionCalls.push({
                name: part.functionCall.name,
                arguments: part.functionCall.args
              });
            }
          }
        }
      }
      
      // If URLs were detected but function calling was requested, inform user
      if (hasUrls && currentModelSupportsUrlContext && !response.includes('cannot do simultaneously')) {
        const moderationRequests = ['mute', 'kick', 'ban', 'clear', 'lock', 'unlock', 'delete'];
        const hasModerationRequest = moderationRequests.some(req => 
          userMessage.toLowerCase().includes(req)
        );
        
        if (hasModerationRequest) {
          response += '\n\n⚠️ **Note:** I prioritized analyzing the URLs you provided. ' +
                     'For moderation actions, please send them in a separate message without URLs.';
        }
      }
      
    } else {
      // Use OpenAI-compatible API for other providers (Groq, OpenAI, Custom)
      const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: userEndpoint || 'https://api.openai.com/v1',
      });
      
      // Format messages for API
      let messages = [
        enhancedSystemMessage,
        ...historyRows.map(row => ({ 
          role: row.role, 
          content: row.content 
        }))
      ];

      // Prepare the final user message with any image attachments
      let finalUserMessage = {
        role: "user",
        content: []
      };
      
      // Add text content
      if (userMessage) {
        finalUserMessage.content.push({
          type: "text",
          text: userMessage
        });
      }
      
      // Add image attachments if any (only for compatible providers)
      if (userProvider === 'openai') {
        for (const attachment of actualImageAttachments) {
          try {
            if (attachment.type === 'video' || isVideoFile(attachment.contentType)) {
              // OpenAI currently doesn't support video in the same way as images
              // Add a text description instead
              finalUserMessage.content.push({
                type: "text",
                text: `[Video attachment: ${attachment.url}]`
              });
            } else {
              const base64Image = await imageToBase64(attachment.url);
              if (base64Image) {
                finalUserMessage.content.push({
                  type: "image_url",
                  image_url: {
                    url: `data:${attachment.contentType};base64,${base64Image}`
                  }
                });
              }
            }
          } catch (error) {
            console.error("Error processing media attachment:", error);
          }
        }
      }

      // Add document attachments (convert to text description for non-Gemini providers)
      for (const attachment of documentAttachments) {
        try {
          if (isPdfFile(attachment.contentType)) {
            finalUserMessage.content.push({
              type: "text",
              text: `[PDF document attached: ${attachment.url}]`
            });
          } else {
            finalUserMessage.content.push({
              type: "text", 
              text: `[Document attached (${attachment.contentType}): ${attachment.url}]`
            });
          }
        } catch (error) {
          console.error("Error processing document attachment:", error);
        }
      }
      
      // Replace the last user message with our formatted one that includes images
      if (messages.length > 1 && messages[messages.length - 1].role === 'user') {
        messages.pop();
      }
      
      // For non-image supporting providers, convert complex content to simple text
      if (userProvider !== 'openai' && Array.isArray(finalUserMessage.content)) {
        const textParts = finalUserMessage.content.filter(part => part.type === 'text').map(part => part.text);
        finalUserMessage = {
          role: "user",
          content: textParts.join('\n')
        };
      }
      
      // Add our new message
      if (finalUserMessage.content.length > 0 || typeof finalUserMessage.content === 'string') {
        messages.push(finalUserMessage);
      }
      
      // Check if provider supports function calling
      const supportsFunctionCalling = userProvider === 'openai' || userProvider === 'groq';
      
      if (supportsFunctionCalling) {
        // Use function calling for supported providers
        const chatCompletion = await openai.chat.completions.create({
          model: modelToUse,
          messages: messages,
          functions: moderationFunctions,
          function_call: "auto",
          temperature: 0.7,
          max_tokens: 2000
        });
        
        // Handle both text and function call responses
        response = chatCompletion.choices[0].message.content || "";
        
        // Check for function calls
        if (chatCompletion.choices[0].message.function_call) {
          functionCalls.push({
            name: chatCompletion.choices[0].message.function_call.name,
            arguments: JSON.parse(chatCompletion.choices[0].message.function_call.arguments)
          });
        }
        
      } else {
        // Fallback to regular chat for providers that don't support function calling
        const chatCompletion = await openai.chat.completions.create({
          model: modelToUse,
          messages: messages,
          temperature: 0.7,
          max_tokens: 2000
        });
        
        response = chatCompletion.choices[0].message.content || "";
      }
    }
    
    // Convert function calls to legacy command format
    let command = null;
    if (functionCalls.length > 0) {
      const functionCall = functionCalls[0]; // Take first function call
      command = convertFunctionCallToCommand(functionCall);
      
      // If we have a function call but no text response, provide a default message
      if (!response || response.trim() === '') {
        switch (functionCall.name) {
          case 'moderate_member':
            response = `Executing ${functionCall.arguments.action} for ${functionCall.arguments.user_id}...`;
            break;
          case 'clear_messages':
            response = `Clearing ${functionCall.arguments.amount} messages...`;
            break;
          case 'lock_channel':
            response = `Locking current channel...`;
            break;
          case 'unlock_channel':
            response = `Unlocking current channel...`;
            break;
          default:
            response = "Executing action...";
        }
      }
    }
    
    // Fallback: If no function calls but looks like command request, try JSON extraction
    if (!command) {
      command = extractCommand(response);
    }
    
    // Ensure response is never undefined or null
    if (!response) {
      response = "Request received.";
    }
    
    // Format the response for better display
    const { mainContent, codeBlocks, answerContent } = formatResponseForEmbed(response);

    // Save assistant's response to history (save the actual response, not formatted)
    await addMessageToHistory(userId, 'assistant', response);

    let botName = 'Iris AI'; // Default name
    if (systemMessageTemplate.content) {
      // Try to extract the name from the system message
      const nameMatch = systemMessageTemplate.content.match(/AI assistant named (.*?),/);
      if (nameMatch && nameMatch[1]) {
        botName = nameMatch[1];
      }
    }

    // Create an embed for the AI response
    const responseEmbed = new EmbedBuilder()
      .setColor(0x3498db) // Blue color
      .setAuthor({ 
        name: botName
      })
      .setDescription(answerContent)
      .setTimestamp();

    // Add URL context information to footer if available
    let footerText = `Reply to ${userInfo.username || userId} • Provider: ${userProvider || 'gemini'}${functionCalls.length > 0 ? ' • Function Call' : ''}`;
    
    if (urlContextMetadata && urlContextMetadata.length > 0) {
      footerText += ` • Analyzed ${urlContextMetadata.length} URL(s)`;
    } else if (hasUrls && !currentModelSupportsUrlContext) {
      footerText += ` • URLs detected (not supported by current model)`;
    }
    
    responseEmbed.setFooter({ 
      text: footerText, 
      iconURL: userInfo.avatarUrl 
    });

    // Add URL sources as fields if available
    if (urlContextMetadata && urlContextMetadata.length > 0) {
      const urlSources = urlContextMetadata.slice(0, 3); // Show max 3 URLs to avoid embed limits
      for (let i = 0; i < urlSources.length; i++) {
        const urlData = urlSources[i];
        responseEmbed.addFields({
          name: `🔗 Source ${i + 1}`,
          value: `[${urlData.title || 'Unknown Title'}](${urlData.url})`,
          inline: true
        });
      }
    } else if (hasUrls && !currentModelSupportsUrlContext) {
      // Add a field to inform about URL context limitation
      responseEmbed.addFields({
        name: '⚠️ URL Context',
        value: `Detected ${urls.length} URLs but current model doesn't support this.\nUse \`/model set\` to switch to a model that supports URL context.`,
        inline: false
      });
    }
    
    // Create additional embeds for code blocks if any
    const codeEmbeds = codeBlocks.map((block, index) => {
      return createCodeEmbed(
        block.code, 
        block.language, 
        `${block.language ? block.language.charAt(0).toUpperCase() + block.language.slice(1) : 'Code'} Block ${index + 1}`
      );
    });
    
    // Combine main embed and code block embeds
    const allEmbeds = [responseEmbed, ...codeEmbeds];
    
    // Return both the response and any detected command
    return {
      text: mainContent,
      embeds: allEmbeds,
      command: command,
      urlContext: urlContextMetadata // Include URL context in response
    };
  } catch (error) {
    console.error("Error generating AI response:", error);
    
    // Check if error is a rate limit error
    const isRateLimit = error.status === 429 || 
                      (error.message && error.message.includes('rate limit')) ||
                      (error.message && error.message.includes('quota exceeded'));
    
    let errorMessage = "Sorry, I cannot process your request at this time.";
    let errorTitle = '❌ Error';
    let errorColor = 0xFF0000;
    
    if (isRateLimit && !await getUserApiKey(userId)) {
      errorTitle = '⚠️ API Rate Limit';
      errorMessage = "Bot is rate limited. Please try again later or use your personal API key with `/apikey set` command.";
      errorColor = 0xFFAA00;
    }
    
    return {
      text: errorMessage,
      embeds: [
        new EmbedBuilder()
          .setColor(errorColor)
          .setTitle(errorTitle)
          .setDescription(errorMessage)
          .setTimestamp()
      ],
      command: null
    };
  }
}

module.exports = {
  generateResponse
};