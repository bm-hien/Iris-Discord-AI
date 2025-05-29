/**
 * Format the AI response to make code blocks look better in embeds
 * Discord embeds support markdown, but we need to ensure proper formatting
 * @param {string} response - Phản hồi gốc từ AI
 * @returns {Object} - Phản hồi đã được định dạng và danh sách code blocks
 */
function formatResponseForEmbed(response) {
  // Handle undefined or null response
  if (!response || typeof response !== 'string') {
    return {
      mainContent: "✅ **Đã thực hiện hành động.**",
      codeBlocks: [],
      answerContent: "✅ **Đã thực hiện hành động.**" // Remove 'answer' wrapper
    };
  }
  
  // First remove any JSON command blocks
  let cleanResponse = response.replace(/```json\s*{[\s\S]*?}\s*```/g, '').trim();
  
  // Find all code blocks in the response
  const codeBlockRegex = /```(\w+)?\s*([\s\S]*?)```/g;
  let formattedResponse = cleanResponse;
  
  // Replace each code block with a properly formatted version
  let match;
  let codeBlocks = [];
  
  while ((match = codeBlockRegex.exec(cleanResponse)) !== null) {
    const language = match[1] || '';
    const code = match[2].trim();
    const fullMatch = match[0];
    
    // Store code blocks for later
    codeBlocks.push({
      language,
      code,
      fullMatch
    });
  }
  
  // If we found code blocks, handle them separately
  if (codeBlocks.length > 0) {
    // First process text outside code blocks
    let textParts = cleanResponse.split(codeBlockRegex);
    formattedResponse = '';
    
    // Add regular text parts
    for (let i = 0; i < textParts.length; i += 3) {
      if (textParts[i]) {
        formattedResponse += textParts[i].trim() + "\n\n";
      }
    }
  }
  
  // Make sure formattedResponse is never empty
  if (!formattedResponse || formattedResponse.trim() === '') {
    formattedResponse = "✅ **Đã thực hiện hành động.**";
  }
  
  // Clean up extra whitespace
  formattedResponse = formattedResponse.replace(/\n{3,}/g, '\n\n').trim();
  
  // Return formatted content without wrapping in code blocks
  return { 
    mainContent: formattedResponse, 
    codeBlocks: codeBlocks,
    answerContent: formattedResponse // Return clean formatted content for embed
  };
}

module.exports = {
  formatResponseForEmbed
};