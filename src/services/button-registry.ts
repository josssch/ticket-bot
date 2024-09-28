import type { Interaction, TextChannel } from 'discord.js'

import { ButtonBuilder, ButtonStyle, GuildMember } from 'discord.js'

import { openTicketWithInteraction } from '../common/interaction-open-ticket'
import { ticketLog } from '../logger'
import { db } from './database'

export class BaseButton extends ButtonBuilder {
    constructor(public readonly id: string) {
        super()
        this.setCustomId(id)
    }
}

export const CREATE_TICKET_BUTTON = new BaseButton('new_ticket')
    .setLabel('Open Ticket')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('🎟️')

export const DELETE_TICKET_BUTTON = new BaseButton('delete_ticket')
    .setLabel('Close Ticket')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('❕')

export async function handleButtonInteraction(interaction: Interaction) {
    if (
        !interaction.isButton() ||
        !(interaction.member instanceof GuildMember)
    ) {
        return
    }

    if (interaction.customId === CREATE_TICKET_BUTTON.id) {
        await openTicketWithInteraction(interaction)
        return
    }

    if (
        interaction.customId === DELETE_TICKET_BUTTON.id &&
        interaction.channelId in db.data.tickets &&
        interaction.channel
    ) {
        ticketLog(
            'Deleting ticket channel',
            (interaction.channel as TextChannel).name,
        )

        const { channelId } = interaction
        await interaction.channel.delete()

        db.update(({ tickets, ticketsOwnerIndex }) => {
            delete ticketsOwnerIndex[tickets[channelId].ownerId]
            delete tickets[channelId]
        })
    }
}
