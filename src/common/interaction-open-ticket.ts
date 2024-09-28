import {
    ActionRowBuilder,
    type ButtonBuilder,
    type ButtonInteraction,
    type CommandInteraction,
    EmbedBuilder,
    GuildMember,
} from 'discord.js'
import { ticketLog } from '../logger'
import { DELETE_TICKET_BUTTON } from '../services/button-registry'
import { getOrCreateCustomer } from '../services/stripe'
import { createTicketChannel } from '../services/ticket-manager'
import { sendEmbed } from './send-embed'

/**
 * Handle both the creation of the ticket and the messaging communication.
 */
export async function openTicketWithInteraction(
    ctx: CommandInteraction | ButtonInteraction,
) {
    if (!(ctx.member instanceof GuildMember)) {
        return // executed outside of a guild; don't care
    }

    await ctx.deferReply({ ephemeral: true })

    try {
        const newChannel = await createTicketChannel(ctx.member)

        ticketLog(`Opened new ticket for ${ctx.member.user.username}`)

        await getOrCreateCustomer(ctx.member.user.id, ctx.member.user)

        await ctx.editReply(
            `Your ticket has been created! View it here: ${newChannel}`,
        )

        const message = await sendEmbed(
            newChannel,
            new EmbedBuilder()
                .setTitle('Your Ticket')
                .setDescription(
                    'Welcome to your ticket, **this message will be pinned.** The buttons below will help you manage your ticket.',
                ),
            {
                content: `${ctx.member}`,
                components: [
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(DELETE_TICKET_BUTTON)
                        .toJSON(),
                ],
            },
        )

        await message.pin()
    } catch (err) {
        ticketLog('Failed creating ticket channel:', err)

        await ctx.editReply(
            err instanceof Error
                ? err.message
                : 'Something went wrong creating your ticket. Please report this.',
        )
    }
}
