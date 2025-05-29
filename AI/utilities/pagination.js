const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

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
          .setLabel('◀ Trước')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(this.currentPage === 0),
        new ButtonBuilder()
          .setCustomId('page_info')
          .setLabel(`${this.currentPage + 1}/${this.embeds.length}`)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('next_embed')
          .setLabel('Tiếp ▶')
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

  async sendPaginatedMessage(message) {
    if (this.embeds.length <= 1) {
      // If only one embed, send normally
      return await message.reply({ embeds: [this.embeds[0]] });
    }

    const components = this.embeds.length > 1 ? [this.createButtons()] : [];
    const sentMessage = await message.reply({
      embeds: [this.getCurrentEmbed()],
      components: components
    });

    if (this.embeds.length > 1) {
      this.setupCollector(sentMessage);
    }

    return sentMessage;
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
              .setLabel('◀ Trước')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('page_info')
              .setLabel(`${this.currentPage + 1}/${this.embeds.length}`)
              .setStyle(ButtonStyle.Primary)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('next_embed')
              .setLabel('Tiếp ▶')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true)
          );

        await sentMessage.edit({ components: [disabledRow] });
      } catch (error) {
        console.error('Error disabling pagination buttons:', error);
      }
    });
  }
}

module.exports = { EmbedPaginator };