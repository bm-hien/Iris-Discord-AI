/**
 * Tập hợp các functions AI để export một cách gọn gàng
 */

const { generateResponse } = require('./generateResponse');
const { imageToBase64, videoToBase64, isVideoFile, isYouTubeLink, extractYouTubeLinks } = require('./mediaProcessor');
const { formatResponseForEmbed } = require('./responseFormatter');

module.exports = {
  generateResponse,
  imageToBase64,
  videoToBase64,
  isVideoFile,
  isYouTubeLink,
  extractYouTubeLinks,
  formatResponseForEmbed
};