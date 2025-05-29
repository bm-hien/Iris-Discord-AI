/**
 * Module xử lý phản hồi AI với Function Calling support và URL Context
 */
const { OpenAI } = require("openai");
const { GoogleGenAI, Type } = require("@google/genai");
const { EmbedBuilder } = require('discord.js');
const { getSystemMessage } = require('../events/systemMessage');
const { extractCommand } = require('../commands/commandHandler');
const { moderationFunctions, convertFunctionCallToCommand } = require('./functionCalling');
const { createCodeEmbed } = require('../utilities/formatters');
const { formatResponseForEmbed } = require('./responseFormatter');
const { imageToBase64, videoToBase64, isVideoFile } = require('./mediaProcessor');
const { extractUrls } = require('../utilities/urlExtractor'); // New utility
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
 * Tạo phản hồi AI với Function Calling support và URL Context
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
        userPermissionsText = `- Quyền hạn: KHÔNG CÓ QUYỀN HẠN QUẢN TRỊ`;
      } else {
        userPermissionsText = `- Quyền hạn: ${userInfo.permissions.join(', ')}`;
      }
    }
    
    // Format user roles for role hierarchy context
    let userRolesText = '';
    if (userInfo.rolePositions) {
      userRolesText = `- Vai trò cao nhất: ${userInfo.highestRole || 'Không có'} (vị trí: ${userInfo.rolePositions.highest || '0'})\n`;
      userRolesText += `- Vai trò thấp nhất: ${userInfo.lowestRole || '@everyone'} (vị trí: ${userInfo.rolePositions.lowest || '0'})`;
    }
    
    // Create a customized system message with user information
    let channelInfoText = '';
    if (userInfo.currentChannel) {
      channelInfoText = `- Channel hiện tại: #${userInfo.currentChannel.name} (ID: ${userInfo.currentChannel.id})\n`;
      
      if (userInfo.channels && Object.keys(userInfo.channels).length > 0) {
        channelInfoText += `- Danh sách kênh trong server:\n`;
        
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
      apiKeyStatusText = `- API Key: Người dùng đã có API key cá nhân (${keyType})\n`;
    } else {
      apiKeyStatusText = `- API Key: Người dùng CHƯA có API key cá nhân (đang dùng key mặc định)\n`;
    }

    let presenceText = '';
    if (userInfo.presence) {
      const presence = userInfo.presence;
      presenceText = `- Trạng thái: ${presence.statusText}`;
      
      if (presence.devices.length > 0) {
        presenceText += ` (đang dùng: ${presence.devices.join(', ')})`;
      }
      
      if (presence.customStatus) {
        presenceText += `\n- Custom Status: "${presence.customStatus}"`;
      }
      
      if (presence.activities.length > 0) {
        presenceText += `\n- Hoạt động hiện tại:`;
        
        for (const activity of presence.activities) {
          switch (activity.type) {
            case 0: // Playing
              presenceText += `\n  • 🎮 Đang chơi: ${activity.name}`;
              if (activity.details) presenceText += ` - ${activity.details}`;
              if (activity.state) presenceText += ` (${activity.state})`;
              break;
            case 1: // Streaming
              presenceText += `\n  • 📺 Đang stream: ${activity.name}`;
              if (activity.url) presenceText += ` - ${activity.url}`;
              break;
            case 2: // Listening
              presenceText += `\n  • 🎵 Đang nghe: ${activity.name}`;
              if (activity.details) presenceText += ` - ${activity.details}`;
              if (activity.state) presenceText += ` bởi ${activity.state}`;
              break;
            case 3: // Watching
              presenceText += `\n  • 📽️ Đang xem: ${activity.name}`;
              if (activity.details) presenceText += ` - ${activity.details}`;
              break;
            case 4: // Custom
              // Already handled above
              break;
            case 5: // Competing
              presenceText += `\n  • 🏆 Đang thi đấu: ${activity.name}`;
              break;
            default:
              presenceText += `\n  • 💻 Đang dùng: ${activity.name}`;
              if (activity.details) presenceText += ` - ${activity.details}`;
              break;
          }
          
          if (activity.startedAt) {
            const duration = Math.floor((Date.now() - activity.startedAt.getTime()) / 60000);
            if (duration > 0) {
              presenceText += ` (${duration} phút)`;
            }
          }
        }
      }
      
      presenceText += '\n';
    }

    // Add URL context information to system message
    let urlContextText = '';
    if (hasUrls && currentModelSupportsUrlContext) {
      urlContextText = `\n- URL Context: Tin nhắn chứa ${urls.length} URL(s), AI sẽ truy cập và phân tích nội dung\n`;
      urlContextText += `- URLs được phát hiện: ${urls.join(', ')}\n`;
      urlContextText += `- Model hiện tại (${modelToUse}) hỗ trợ URL context\n`;
    } else if (hasUrls && isGeminiProvider && !currentModelSupportsUrlContext) {
      urlContextText = `\n- Cảnh báo: Phát hiện URL nhưng model hiện tại (${modelToUse}) không hỗ trợ URL context\n`;
      urlContextText += `- Các model hỗ trợ: gemini-2.5-flash-preview-05-20, gemini-2.5-pro-preview-05-06, gemini-2.0-flash, gemini-2.0-flash-live-001\n`;
      urlContextText += `- Sử dụng /model set để chuyển sang model hỗ trợ URL context\n`;
    } else if (hasUrls && !isGeminiProvider) {
      urlContextText = `\n- Cảnh báo: Phát hiện URL nhưng provider hiện tại (${userProvider}) không hỗ trợ URL context\n`;
      urlContextText += `- Để sử dụng tính năng này, hãy chuyển sang Gemini provider và model hỗ trợ\n`;
    }

    // Create a customized system message with user information
    const enhancedSystemMessage = {
      role: "system",
      content: `${systemMessageTemplate.content}

User Information:
- Username: ${userInfo.username || 'Unknown'}
- User ID: ${userId}
- Discord Tag: ${userInfo.tag || 'Unknown'}
- Server: ${userInfo.serverName || 'Direct Message'}
${channelInfoText}
${userInfo.isAdmin ? '- User is a server administrator' : '- User is NOT a server administrator'}
${userInfo.isOwner ? '- User is the server owner' : '- User is NOT the server owner'}
${userInfo.roles ? `- Vai trò: ${userInfo.roles}` : '- Vai trò: Không có'}
${userRolesText}
${userPermissionsText}
${apiKeyStatusText}
${presenceText}
${urlContextText}

IMPORTANT về URL CONTEXT:
- Khi người dùng gửi URL, bạn ${currentModelSupportsUrlContext ? 'CÓ THỂ' : 'KHÔNG THỂ'} truy cập và phân tích nội dung website
${currentModelSupportsUrlContext ? 
  '- Hãy tóm tắt, phân tích, và trả lời câu hỏi dựa trên nội dung từ URL\n- Luôn cite nguồn khi sử dụng thông tin từ URL' :
  '- Hãy thông báo rằng model hiện tại không hỗ trợ URL context\n- Đề xuất user chuyển sang model hỗ trợ bằng /model set'
}
- Nếu không thể truy cập URL, hãy thông báo rõ ràng

MODELS HỖ TRỢ URL CONTEXT:
- gemini-2.5-flash-preview-05-20 (khuyến nghị)
- gemini-2.5-pro-preview-05-06
- gemini-2.0-flash
- gemini-2.0-flash-live-001

IMPORTANT: Khi người dùng hỏi về API key hoặc gặp lỗi rate limit:
- Nếu họ CHƯA có API key cá nhân, hướng dẫn họ lấy API key miễn phí
- Nếu họ ĐÃ có API key, giúp họ kiểm tra hoặc cập nhật
- Luôn đề xuất sử dụng API key cá nhân để có trải nghiệm tốt hơn

HƯỚNG DẪN LẤY API KEY MIỄN PHÍ:
📌 **Google Gemini API (Khuyến nghị):**
1. Vào https://aistudio.google.com/app/apikey
2. Đăng nhập bằng tài khoản Google
3. Nhấn "Create API Key" 
4. Copy API key (bắt đầu bằng "AIza...")
5. Dùng lệnh \`/apikey set\` để thiết lập

📌 **Groq API (Nhanh, miễn phí):**
1. Vào https://console.groq.com/keys
2. Đăng ký tài khoản miễn phí
3. Tạo API key mới
4. Copy API key (bắt đầu bằng "gsk_...")
5. Dùng lệnh \`/apikey set\` để thiết lập

IMPORTANT: KHÔNG bao giờ liệt kê các quyền hạn khi người dùng không có quyền. Kiểm tra kỹ userPermissionsText.
IMPORTANT: CHỈ sử dụng function calling khi người dùng có đủ quyền hạn được liệt kê trong userPermissionsText.

Nếu có người dùng gửi hình ảnh, hãy mô tả nội dung hình ảnh một cách chi tiết bằng tiếng Việt.
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
      for (const attachment of imageAttachments) {
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
      
      // Prepare config with tools
      const config = {
        systemInstruction: systemInstructions,
        tools: [{
          functionDeclarations: moderationFunctions
        }],
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
      };

      // Add URL context tool if URLs are detected
      if (hasUrls && currentModelSupportsUrlContext) {
        config.tools.push({ urlContext: {} });
      } else if (hasUrls && !currentModelSupportsUrlContext) {
        console.log(`URL context disabled - model ${modelToUse} does not support it`);
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
        console.log('URL Context Retrieved:', urlContextMetadata);
      }
      
      // Check for function calls in Gemini response
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
        for (const attachment of imageAttachments) {
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
      
      console.log('Function call detected:', functionCall);
      console.log('Converted to command:', command);
      
      // If we have a function call but no text response, provide a default message
      if (!response || response.trim() === '') {
        switch (functionCall.name) {
          case 'moderate_member':
            response = `Đang thực hiện ${functionCall.arguments.action} cho ${functionCall.arguments.user_id}...`;
            break;
          case 'clear_messages':
            response = `Đang xóa ${functionCall.arguments.amount} tin nhắn...`;
            break;
          case 'lock_channel':
            response = `Đang khóa channel hiện tại...`;
            break;
          case 'unlock_channel':
            response = `Đang mở khóa channel hiện tại...`;
            break;
          default:
            response = "Đang thực hiện hành động...";
        }
      }
    }
    
    // Fallback: If no function calls but looks like command request, try JSON extraction
    if (!command) {
      command = extractCommand(response);
    }
    
    // Ensure response is never undefined or null
    if (!response) {
      response = "Đã nhận được yêu cầu.";
    }
    
    // Format the response for better display
    const { mainContent, codeBlocks, answerContent } = formatResponseForEmbed(response);
    
    // Save assistant's response to history (save the actual response, not formatted)
    await addMessageToHistory(userId, 'assistant', response);

    let botName = 'bmhien AI'; // Default name
    if (systemMessageTemplate.content) {
      // Try to extract the name from the system message
      const nameMatch = systemMessageTemplate.content.match(/trợ lý AI.*?tên (.*?),/);
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
    let footerText = `Trả lời cho ${userInfo.username || userId} • Provider: ${userProvider || 'gemini'}${functionCalls.length > 0 ? ' • Function Call' : ''}`;
    
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
          name: `🔗 Nguồn ${i + 1}`,
          value: `[${urlData.title || 'Unknown Title'}](${urlData.url})`,
          inline: true
        });
      }
    } else if (hasUrls && !currentModelSupportsUrlContext) {
      // Add a field to inform about URL context limitation
      responseEmbed.addFields({
        name: '⚠️ URL Context',
        value: `Phát hiện ${urls.length} URL nhưng model hiện tại không hỗ trợ.\nDùng \`/model set\` để chuyển sang model hỗ trợ URL context.`,
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
    
    let errorMessage = "Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này.";
    let errorTitle = '❌ Lỗi';
    let errorColor = 0xFF0000;
    
    if (isRateLimit && !await getUserApiKey(userId)) {
      errorTitle = '⚠️ API Rate Limit';
      errorMessage = "Bot đang bị giới hạn tốc độ API. Vui lòng thử lại sau hoặc sử dụng API key cá nhân của bạn bằng lệnh `/apikey set`.";
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