const { Events } = require('discord.js');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // Handle modal submissions FIRST
    if (interaction.isModalSubmit()) {
      // Check if it's the custom provider modal
      if (interaction.customId === 'custom_provider_modal') {
        // Import and execute the provider command
        const command = interaction.client.commands.get('provider');
        if (command) {
          try {
            await command.execute(interaction);
          } catch (error) {
            console.error('Error handling modal submission:', error);
            
            const errorMessage = { 
              content: 'There was an error processing your submission. Please try again.', 
              ephemeral: true 
            };
            
            if (interaction.replied || interaction.deferred) {
              await interaction.editReply(errorMessage);
            } else {
              await interaction.reply(errorMessage);
            }
          }
        }
        return;
      }
    }

    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      
      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error('Error executing command:', error);
        
        const errorMessage = { 
          content: 'There was an error while executing this command!', 
          ephemeral: true 
        };
        
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      }
    }
  },
};