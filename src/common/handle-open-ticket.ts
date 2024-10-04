import {
    ActionRowBuilder,
    type BaseGuildTextChannel,
    type ButtonBuilder,
    type ButtonInteraction,
    type CommandInteraction,
    EmbedBuilder,
    GuildMember,
    type GuildTextBasedChannel,
    type ModalSubmitInteraction,
} from 'discord.js'
import { ticketLog } from '/logger'
import {
    DELETE_TICKET_BUTTON,
    UPDATE_INVOICE_STATUS_BUTTON,
} from '../services/interactions/button-registry'
import {
    type CreationOptions,
    type Ticket,
    TicketCreationError,
    openTicket,
} from '../services/tickets'
import { sendEmbed } from './send-embed'

/**
 * Handle both the creation of the ticket and the messaging communication.
 */
export async function handleOpenTicketInteraction(
    ctx: CommandInteraction | ButtonInteraction | ModalSubmitInteraction,
    options?: CreationOptions,
) {
    if (!(ctx.member instanceof GuildMember)) {
        return // executed outside of a guild; don't care
    }

    // check for this, since there is the possibility of a long pipeline
    // before reaching here
    if (!ctx.deferred) {
        await ctx.deferReply({ ephemeral: true })
    }

    let ticket: Ticket
    let channel: GuildTextBasedChannel
    try {
        ;({ ticket, channel } = await openTicket(ctx.member, options))

        ticketLog(`Opened new ticket for ${ctx.member.user.username}`)
    } catch (err) {
        if (err instanceof TicketCreationError) {
            await ctx.editReply(err.message)
            return
        }

        ticketLog('Failed creating ticket channel:', err)
        await ctx.editReply(
            'Something went wrong creating your ticket. Please report this.',
        )

        return
    }

    await Promise.all([
        ctx.editReply(
            `Your ticket has been created! View it here: <#${ticket.channelId}>`, // <#ID> is channel linking
        ),
        sendTicketMessage(ticket, channel).then((msg) => msg?.pin()),
    ])
}

export async function sendTicketMessage(
    ticket: Ticket,
    ticketChannel: BaseGuildTextChannel,
) {
    // moved out to make it more readable
    const embed = new EmbedBuilder()
        .setTitle('Your Ticket')
        .setDescription(
            'Welcome to your ticket, **this message will be pinned.** The buttons below will help you manage your ticket.',
        )

    if (ticket.openReason)
        embed.addFields({
            name: 'Open Reason',
            value: ticket.openReason,
        })

    return sendEmbed(ticketChannel, embed, {
        content: `<@${ticket.ownerId}>`, // <@ID> format is a mention
        components: [
            new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    UPDATE_INVOICE_STATUS_BUTTON,
                    DELETE_TICKET_BUTTON,
                )
                .toJSON(),
        ],
    })
}
