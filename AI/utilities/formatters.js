// filepath: d:\Main\discord AI\AI\utilities\formatters.js
/**
 * Utility functions for formatting messages and responses
 */

// Map common programming languages to their syntax highlighting aliases
const languageAliases = {
  'javascript': 'js',
  'typescript': 'ts',
  'python': 'py',
  'csharp': 'cs',
  'javascriptreact': 'jsx',
  'typescriptreact': 'tsx',
  'cpp': 'cpp',
  // Add more as needed
};

// Get the appropriate language identifier for syntax highlighting
function getSyntaxHighlightLanguage(language) {
  if (!language) return '';
  
  const lowerLang = language.toLowerCase();
  return languageAliases[lowerLang] || lowerLang;
}

// Format code for better display in embeds
function formatCodeForEmbed(code, language) {
  const highlightLang = getSyntaxHighlightLanguage(language);
  return `\`\`\`${highlightLang}\n${code}\n\`\`\``;
}

// Create a nice looking embed for code blocks
function createCodeEmbed(code, language, title = null) {
  const { EmbedBuilder } = require('discord.js');
  
  // Determine colors based on language
  let color = 0x2d3436; // Default dark gray
  
  // Set color based on language
  if (language) {
    const lang = language.toLowerCase();
    if (lang === 'js' || lang === 'javascript') color = 0xf1e05a; // JavaScript yellow
    else if (lang === 'py' || lang === 'python') color = 0x3572A5; // Python blue
    else if (lang === 'java') color = 0xb07219; // Java brown
    else if (lang === 'html') color = 0xe34c26; // HTML orange
    else if (lang === 'css') color = 0x563d7c; // CSS purple
    // Add more languages and their colors as needed
  }
  
  const displayLanguage = language ? 
    language.charAt(0).toUpperCase() + language.slice(1) : 
    'Code';
  
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title || `${displayLanguage} Code Block`)
    .setDescription(formatCodeForEmbed(code, language));
  
  return embed;
}

module.exports = {
  formatCodeForEmbed,
  createCodeEmbed,
  getSyntaxHighlightLanguage
};