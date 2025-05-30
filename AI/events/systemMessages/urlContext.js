module.exports = 
  "🌐 **URL CONTEXT HANDLING:**\n" +
  "IMPORTANT: URL context and function calling cannot be used simultaneously due to API limitations.\n\n" +
  
  "**When URLs are detected:**\n" +
  "- Prioritize URL context to read and analyze web content\n" +
  "- Function calling will be temporarily disabled\n" +
  "- If user requests both URL analysis and moderation action, explain the conflict\n\n" +
  
  "**Models supporting URL context:**\n" +
  "- `gemini-2.5-flash-preview-05-20` (recommended)\n" +
  "- `gemini-2.5-pro-preview-05-06`\n" +
  "- `gemini-2.0-flash`\n" +
  "- `gemini-2.0-flash-live-001`\n\n" +
  
  "**Models NOT supporting URL context:**\n" +
  "- `gemini-1.5-flash`, `gemini-1.5-pro`\n" +
  "- All Groq and OpenAI models\n\n" +
  
  "**When URLs provided but model doesn't support:**\n" +
  "- Explain limitation\n" +
  "- Suggest switching to supported model\n" +
  "- Guide using `/model set` command";