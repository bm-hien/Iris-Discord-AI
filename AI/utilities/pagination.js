const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class EmbedPaginator {
  constructor(embeds, userId, timeout = 60000) {
    this.embeds = embeds;
    this.currentPage = 0;
    this.userId = userId;
    this.timeout = timeout;
  }

  createButtons() {
    return new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('prev_embed')
          .setLabel('◀ Previous')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(this.currentPage === 0),
        new ButtonBuilder()
          .setCustomId('page_info')
          .setLabel(`${this.currentPage + 1}/${this.embeds.length}`)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('next_embed')
          .setLabel('Next ▶')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(this.currentPage === this.embeds.length - 1)
      );
  }

  getCurrentEmbed() {
    return this.embeds[this.currentPage];
  }

  nextPage() {
    if (this.currentPage < this.embeds.length - 1) {
      this.currentPage++;
      return true;
    }
    return false;
  }

  prevPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      return true;
    }
    return false;
  }

  setupCollector(sentMessage) {
    const collector = sentMessage.createMessageComponentCollector({
      time: this.timeout,
      filter: (interaction) => interaction.user.id === this.userId
    });

    collector.on('collect', async (interaction) => {
      if (interaction.customId === 'next_embed') {
        if (this.nextPage()) {
          await interaction.update({
            embeds: [this.getCurrentEmbed()],
            components: [this.createButtons()]
          });
        }
      } else if (interaction.customId === 'prev_embed') {
        if (this.prevPage()) {
          await interaction.update({
            embeds: [this.getCurrentEmbed()],
            components: [this.createButtons()]
          });
        }
      }
    });

    collector.on('end', async () => {
      try {
        // Disable buttons when collector expires
        const disabledRow = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('prev_embed')
              .setLabel('◀ Previous')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('page_info')
              .setLabel('Expired')
              .setStyle(ButtonStyle.Danger)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('next_embed')
              .setLabel('Next ▶')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true)
          );

        await sentMessage.edit({
          components: [disabledRow]
        });
      } catch (error) {
        console.error('Error disabling buttons:', error);
      }
    });
  }
}

module.exports = { EmbedPaginator };