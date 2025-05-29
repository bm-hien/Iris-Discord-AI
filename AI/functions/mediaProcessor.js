const fetch = require('node-fetch');

/**
 * Chuyển đổi ảnh từ URL sang base64
 * @param {string} imageUrl - URL của hình ảnh
 * @returns {Promise<string|null>} - Dữ liệu hình ảnh dạng base64 hoặc null nếu có lỗi
 */
async function imageToBase64(imageUrl) {
  // ...existing code...
}

/**
 * Chuyển đổi video từ URL sang base64
 * @param {string} videoUrl - URL của video
 * @returns {Promise<string|null>} - Dữ liệu video dạng base64 hoặc null nếu có lỗi
 */
async function videoToBase64(videoUrl) {
  try {
    console.log(`Attempting to fetch video from: ${videoUrl}`);
    
    const response = await fetch(videoUrl);
    
    if (!response.ok) {
      console.error(`Failed to fetch video: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const buffer = await response.buffer();
    
    if (!buffer || buffer.length === 0) {
      console.error("Received empty video data");
      return null;
    }
    
    // Check file size (Discord attachment limit is 25MB for most servers)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (buffer.length > maxSize) {
      console.error(`Video too large: ${buffer.length} bytes (max: ${maxSize})`);
      return null;
    }
    
    console.log(`Successfully fetched video (${buffer.length} bytes)`);
    return buffer.toString('base64');
  } catch (error) {
    console.error("Error converting video to base64:", error.message);
    return null;
  }
}

/**
 * Kiểm tra xem file có phải là video không
 * @param {string} contentType - Content type của file
 * @returns {boolean}
 */
function isVideoFile(contentType) {
  const videoTypes = [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/avi',
    'video/mov',
    'video/wmv',
    'video/flv',
    'video/mkv'
  ];
  
  return videoTypes.some(type => contentType?.toLowerCase().includes(type));
}

module.exports = {
  imageToBase64,
  videoToBase64,
  isVideoFile
};