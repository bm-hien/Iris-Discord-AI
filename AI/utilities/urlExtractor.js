/**
 * Utility để trích xuất URLs từ text
 */

/**
 * Extract tất cả URLs từ text message
 * @param {string} text - Text để extract URLs
 * @returns {Array<string>} - Mảng các URLs được tìm thấy
 */
function extractUrls(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Regex pattern để match URLs
  const urlPattern = /https?:\/\/(?:[-\w.])+(?:[:\d]+)?(?:\/(?:[\w/_.])*)?(?:\?(?:[\w&=%.])*)?(?:#(?:[\w.])*)?/gi;
  
  const matches = text.match(urlPattern);
  
  if (!matches) {
    return [];
  }

  // Clean và validate URLs
  const validUrls = matches
    .map(url => url.trim())
    .filter(url => {
      try {
        new URL(url);
        return true;
      } catch (e) {
        return false;
      }
    })
    // Remove duplicates
    .filter((url, index, array) => array.indexOf(url) === index)
    // Limit to 5 URLs max để tránh spam
    .slice(0, 5);

  return validUrls;
}

/**
 * Kiểm tra xem text có chứa URLs không
 * @param {string} text - Text để kiểm tra
 * @returns {boolean} - True nếu có URLs
 */
function hasUrls(text) {
  return extractUrls(text).length > 0;
}

/**
 * Thay thế URLs trong text bằng placeholder
 * @param {string} text - Text gốc
 * @param {string} placeholder - Placeholder để thay thế (default: "[URL]")
 * @returns {string} - Text với URLs được thay thế
 */
function replaceUrlsWithPlaceholder(text, placeholder = '[URL]') {
  if (!text || typeof text !== 'string') {
    return text;
  }

  const urlPattern = /https?:\/\/(?:[-\w.])+(?:[:\d]+)?(?:\/(?:[\w/_.])*)?(?:\?(?:[\w&=%.])*)?(?:#(?:[\w.])*)?/gi;
  
  return text.replace(urlPattern, placeholder);
}

/**
 * Validate URL format
 * @param {string} url - URL để validate
 * @returns {boolean} - True nếu URL hợp lệ
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return url.startsWith('http://') || url.startsWith('https://');
  } catch (e) {
    return false;
  }
}



/**
 * Rút gọn URL để hiển thị (max length)
 * @param {string} url - URL gốc
 * @param {number} maxLength - Độ dài tối đa (default: 50)
 * @returns {string} - URL đã rút gọn
 */
function shortenUrl(url, maxLength = 50) {
  if (!url || url.length <= maxLength) {
    return url;
  }

  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const path = urlObj.pathname + urlObj.search;
    
    if (domain.length + 10 >= maxLength) {
      return domain.substring(0, maxLength - 3) + '...';
    }
    
    const remainingLength = maxLength - domain.length - 3; // 3 for "..."
    if (path.length > remainingLength) {
      return domain + path.substring(0, remainingLength) + '...';
    }
    
    return domain + path;
  } catch (e) {
    return url.substring(0, maxLength - 3) + '...';
  }
}

function modelSupportsUrlContext(modelId) {
  const urlContextSupportedModels = [
    'gemini-2.5-pro-preview-05-06',
    'gemini-2.5-flash-preview-05-20',
    'gemini-2.0-flash',
    'gemini-2.0-flash-live-001'
  ];
  
  return urlContextSupportedModels.includes(modelId);
}

function createUrlContextWarning(urls, currentModel) {
  return `⚠️ **URL Context không khả dụng**\n\n` +
         `Phát hiện ${urls.length} URL nhưng model hiện tại (\`${currentModel}\`) không hỗ trợ URL context.\n\n` +
         `🌐 **Models hỗ trợ URL context:**\n` +
         `• \`gemini-2.5-flash-preview-05-20\` (khuyến nghị)\n` +
         `• \`gemini-2.5-pro-preview-05-06\`\n` +
         `• \`gemini-2.0-flash\`\n` +
         `• \`gemini-2.0-flash-live-001\`\n\n` +
         `💡 Sử dụng \`/model set\` để chuyển sang model hỗ trợ URL context.`;
}

module.exports = {
  extractUrls,
  hasUrls,
  replaceUrlsWithPlaceholder,
  isValidUrl,
  shortenUrl,
  modelSupportsUrlContext,
  createUrlContextWarning
};