import type { Interaction, TextChannel } from 'discord.js'

import { ButtonBuilder, ButtonStyle, GuildMember } from 'discord.js'

import { openTicketWithInteraction } from '../common/interaction-open-ticket'
import { ticketLog } from '../logger'
import { db } from './database'
import { stripe } from './stripe'

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

    const { channelId } = interaction
    const ticket = db.data.tickets[channelId]

    if (
        interaction.customId === DELETE_TICKET_BUTTON.id &&
        ticket &&
        interaction.channel
    ) {
        ticketLog(
            'Deleting ticket channel',
            (interaction.channel as TextChannel).name,
        )

        await interaction.channel.delete()

        // void any ticket's invoice if the amount paid on it is 0
        // todo: make sure these values are up-to-date (as of right now they aren't guaranteed)
        if (ticket.invoiceId && ticket.amountPaid === 0) {
            await stripe.invoices.voidInvoice(ticket.invoiceId).catch(() => {})
        }

        db.update(({ tickets, ticketsOwnerIndex }) => {
            delete ticketsOwnerIndex[tickets[channelId].ownerId]
            delete tickets[channelId]
        })
    }
}
