/**
 * Main AI module that brings together all AI functionality
 */

// Import hàm generateResponse trực tiếp từ file định nghĩa của nó
const { generateResponse, generateImage } = require('./functions');

// Re-export hàm clearConversationHistory và getUserGeneratedImages từ database
const { 
  clearConversationHistory,
  setUserApiKey,
  getUserApiKey,
  removeUserApiKey,
  createUserPrivacySettingsTable
} = require('./events/database');

createUserPrivacySettingsTable().catch(console.error);


module.exports = { 
  generateResponse,
  clearConversationHistory,
  generateImage,
  setUserApiKey,
  getUserApiKey,
  removeUserApiKey
};