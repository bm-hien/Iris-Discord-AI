/**
 * Extract commands from AI responses (Fallback for non-function calling providers)
 */

// Extract any JSON command from the AI response (fallback method)
function extractCommand(response) {
  // First try to parse the entire response as JSON (structured output approach)
  try {
    const parsedResponse = JSON.parse(response);
    
    // Validate that it looks like a command
    if (parsedResponse && parsedResponse.function) {
      return parsedResponse;
    }
  } catch (error) {
    // Not a pure JSON response, fall back to extraction
  }
  
  // Fall back to the old approach - look for JSON pattern between triple backticks
  const jsonPattern = /```json\s*({[\s\S]*?})\s*```/;
  const match = response.match(jsonPattern);
  
  if (match && match[1]) {
    try {
      // Parse the JSON command
      const command = JSON.parse(match[1]);
      return command;
    } catch (error) {
      console.error('Error parsing command JSON:', error);
      return null;
    }
  }
  
  return null;
}

module.exports = {
  extractCommand
};