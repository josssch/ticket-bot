import type { Interaction } from 'discord.js'

import {
    BaseGuildTextChannel,
    ButtonBuilder,
    ButtonStyle,
    GuildMember,
    TextInputBuilder,
    TextInputStyle,
} from 'discord.js'

import { showTicketCreationModal } from '/common/create-ticket-modal'
import {
    sendInvoiceStatusMessage,
    updateTicketInvoiceStatus,
} from '/common/handle-invoice-status'
import { ticketLog } from '/logger'
import { db } from '../database'
import { orb } from '../orbiting'
import { stripe } from '../stripe'
import { getTicketTopic, hasOpenTicket } from '../tickets'
import { Modal } from './modal-registry'

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

export const UPDATE_INVOICE_STATUS_BUTTON = new BaseButton('invoice_status')
    .setLabel('Check Invoice')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('🔄')

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
        if (hasOpenTicket(interaction.user.id)) {
            await interaction.reply({
                content: 'You already have an open ticket',
                ephemeral: true,
            })
            return
        }

        await showTicketCreationModal(interaction)
        return
    }

    const { channel, channelId } = interaction
    const ticket = db.data.tickets[channelId]
    const isTicketChannel = channel instanceof BaseGuildTextChannel

    // todo: cooldown
    if (
        interaction.customId === UPDATE_INVOICE_STATUS_BUTTON.id &&
        ticket &&
        isTicketChannel
    ) {
        if (ticket.invoiceId === null) {
            await interaction.reply({
                content: 'There is no invoice open for this ticket yet',
                ephemeral: true,
            })
            return
        }

        await updateTicketInvoiceStatus(ticket)

        await Promise.all([
            interaction.deferReply().then((i) => i.delete()),
            sendInvoiceStatusMessage(ticket, channel),
            channel.setTopic(getTicketTopic(ticket)),
        ])
        return
    }

    if (
        interaction.customId === DELETE_TICKET_BUTTON.id &&
        ticket &&
        isTicketChannel
    ) {
        new Modal('Confirm Ticket Deletion')
            .addRow(
                new TextInputBuilder({
                    customId: 'close_reason',
                    label: 'Reason For Closure',
                    style: TextInputStyle.Short,
                    required: false,
                }),
            )
            .show(interaction)
            .then(async (ctx) => {
                ticketLog(
                    'Deleting ticket channel',
                    channel.name,
                    `(reason provided: ${ctx.fields.getTextInputValue('close_reason') || 'n/a'})`,
                )

                await ctx.deferReply()
                await channel.delete()

                // void any ticket's invoice if the amount paid on it is 0
                // todo: make sure these values are up-to-date (as of right now they aren't guaranteed)
                if (ticket.invoiceId && ticket.amountPaid === 0) {
                    await stripe.invoices
                        .voidInvoice(ticket.invoiceId)
                        .catch(() => {})
                }

                // automatically add the customer role to the customer as long as their
                // ticket was fully paid at the time of it closing
                if (
                    ticket.amount &&
                    ticket.amount - ticket.amountPaid <= 0 &&
                    orb.config.automaticCustomerRole &&
                    orb.config.customerRoleId
                ) {
                    const ticketUser = await channel.guild.members.fetch(
                        ticket.ownerId,
                    )

                    await ticketUser.roles.add(orb.config.customerRoleId)
                }

                db.update(
                    ({ tickets, ticketsOwnerIndex, invoiceTicketIndex }) => {
                        if (ticket.invoiceId) {
                            delete invoiceTicketIndex[ticket.invoiceId]
                        }

                        delete ticketsOwnerIndex[tickets[channelId].ownerId]
                        delete tickets[channelId]
                    },
                )
            })
    }
}
