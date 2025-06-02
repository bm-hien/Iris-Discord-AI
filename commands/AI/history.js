const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getConversationHistory } = require('../../AI/events/database');
const path = require('path');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('history')
    .setDescription('📊 View your conversation statistics and history overview')
    .addIntegerOption(option =>
      option.setName('days')
        .setDescription('Number of days to analyze (default: 30)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(90)
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const userId = interaction.user.id;
      const days = interaction.options.getInteger('days') || 30;

      // Get user's conversation history
      const conversationHistory = await getConversationHistory(userId, 1000); // Get more messages for stats

      if (!conversationHistory || conversationHistory.length === 0) {
        const noHistoryEmbed = new EmbedBuilder()
          .setColor(0x3498DB)
          .setTitle('📊 Conversation History')
          .setDescription("You don't have any conversation history yet. Start chatting with the bot to build your history!")
          .setTimestamp();
        
        return interaction.editReply({ embeds: [noHistoryEmbed], ephemeral: true });
      }

      // Calculate statistics
      const now = Date.now();
      const filteredHistory = conversationHistory.filter(msg => {
        // If the message has a timestamp property, otherwise assume all messages are within range
        if (msg.timestamp) {
          const msgDate = new Date(msg.timestamp);
          const daysDiff = Math.floor((now - msgDate.getTime()) / (1000 * 60 * 60 * 24));
          return daysDiff <= days;
        }
        return true;
      });

      const totalMessages = filteredHistory.length;
      const userMessages = filteredHistory.filter(msg => msg.role === 'user').length;
      const botMessages = filteredHistory.filter(msg => msg.role === 'assistant').length;
      
      // Calculate average message lengths
      const userMessageLengths = filteredHistory
        .filter(msg => msg.role === 'user')
        .map(msg => msg.content.length);
      
      const botMessageLengths = filteredHistory
        .filter(msg => msg.role === 'assistant')
        .map(msg => msg.content.length);
      
      const avgUserLength = userMessageLengths.length > 0 
        ? Math.round(userMessageLengths.reduce((sum, len) => sum + len, 0) / userMessageLengths.length)
        : 0;
      
      const avgBotLength = botMessageLengths.length > 0
        ? Math.round(botMessageLengths.reduce((sum, len) => sum + len, 0) / botMessageLengths.length)
        : 0;

      // Get conversation timeline data - when messages occurred
      const messageTimeline = {};
      const lastWeekDates = [];
      
      // Generate the last 7 days dates
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toLocaleDateString();
        messageTimeline[dateString] = 0;
        lastWeekDates.push(dateString);
      }
      
      // Count messages per day for the last week
      filteredHistory.forEach(msg => {
        if (msg.timestamp) {
          const msgDate = new Date(msg.timestamp);
          const dateString = msgDate.toLocaleDateString();
          if (lastWeekDates.includes(dateString)) {
            messageTimeline[dateString] = (messageTimeline[dateString] || 0) + 1;
          }
        }
      });

      // Create timeline visualization
      const maxValue = Math.max(...Object.values(messageTimeline), 1);
      const barLength = 15; // Max bar length in characters
      
      let timelineStr = '**Last 7 Days Activity:**\n```\n';
      Object.entries(messageTimeline).forEach(([date, count]) => {
        const normalizedValue = Math.round((count / maxValue) * barLength);
        const bar = '█'.repeat(normalizedValue || 0);
        const padding = ' '.repeat(barLength - normalizedValue);
        timelineStr += `${date}: ${bar}${padding} ${count}\n`;
      });
      timelineStr += '```';

      // Create the stats embed
      const statsEmbed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle(`📊 Your Conversation Stats (Last ${days} Days)`)
        .setDescription(`Here's your conversation statistics with Iris AI.`)
        .addFields([
          { name: '💬 Total Messages', value: totalMessages.toString(), inline: true },
          { name: '👤 Your Messages', value: userMessages.toString(), inline: true },
          { name: '🤖 Bot Responses', value: botMessages.toString(), inline: true },
          { name: '📏 Avg. User Length', value: `${avgUserLength} characters`, inline: true },
          { name: '📐 Avg. Bot Length', value: `${avgBotLength} characters`, inline: true },
          { name: '📅 History Depth', value: `${totalMessages} messages`, inline: true },
          { name: '📈 Activity Timeline', value: timelineStr, inline: false },
          { name: '📥 Export Data', value: 'Use `/export` to download your full conversation history.', inline: false }
        ])
        .setFooter({ text: `User ID: ${userId} • Statistics based on your conversation history` })
        .setTimestamp();

      await interaction.editReply({ embeds: [statsEmbed], ephemeral: true });

    } catch (error) {
      console.error('Error in history command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Error')
        .setDescription('There was an error fetching your conversation statistics. Please try again later.')
        .setTimestamp();
      
      await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};