import type { Guild, GuildMember } from 'discord.js'
import { type EpochMilliseconds, db } from './database'
import { type Currency, orb } from './orbiting'

export interface Ticket {
    channelId: string
    ownerId: string

    openedAt: EpochMilliseconds
    openReason: string | null

    invoiceId: string | null
    invoiceItemId: string | null
    invoiceUrl: string | null
    invoiceCreatedAt: EpochMilliseconds | null

    currency: Currency
    amount: number | null
    amountPaid: number
    lastPaidAt: EpochMilliseconds | null
}

export function getTicketChannelName(username: string) {
    return `ticket-${username}`
}

export function getTicketTopic(
    ticket: Pick<Ticket, 'invoiceId' | 'amountPaid' | 'amount' | 'openReason'>,
) {
    if (ticket.invoiceId === null || ticket.amount === null) {
        return ticket.openReason ?? ''
    }

    const amountOwed = ticket.amount - ticket.amountPaid
    const paymentStatus =
        amountOwed > 0 ? `\$${amountOwed.toFixed(2)} Remaining` : 'Fully Paid'

    let topic = paymentStatus

    if (ticket.openReason) topic += ` | ${ticket.openReason}`

    return topic
}

export async function getTicketsCategory(guild: Guild) {
    if (!orb.config?.ticketsCategoryId) {
        return null
    }

    return guild.channels.resolve(orb.config.ticketsCategoryId)
}

export function hasOpenTicket(discordId: string) {
    return discordId in db.data.ticketsOwnerIndex
}

export class TicketCreationError extends Error {}

export type CreationOptions = {
    openReason: string | null
}

export async function openTicket(
    member: GuildMember,
    options: CreationOptions = { openReason: null },
) {
    const ticketsCategory = await getTicketsCategory(member.guild)
    if (ticketsCategory === null) {
        throw new TicketCreationError(
            'Ticket Category is either unset or unresolvable by the current ID.',
        )
    }

    const userId = member.user.id
    if (hasOpenTicket(userId)) {
        throw new TicketCreationError('You already have an open ticket.')
    }

    const ticketDetails = {
        ownerId: userId,
        openedAt: Date.now(),
        openReason: options.openReason,
        invoiceId: null,
        invoiceItemId: null,
        invoiceUrl: null,
        invoiceCreatedAt: null,
        currency: orb.config.currencyPreference,
        amount: null,
        amountPaid: 0,
        lastPaidAt: null,
    } satisfies Partial<Ticket>

    const newChannel = await member.guild.channels.create({
        name: getTicketChannelName(member.user.username),
        topic: getTicketTopic(ticketDetails),
        parent: ticketsCategory.id,
    })

    const overwrites = orb.config.ticketOwnerPermissions.reduce((obj, key) => {
        obj[key] = true
        return obj
    }, Object.create({})) // todo: validation of keys

    // create this separately, rather than in the initial channel request since
    // this will allow the created channel to inherit the tickets category's permissions
    await newChannel.permissionOverwrites.create(member.user, {
        ...overwrites,
        SendMessages: true,
        ViewChannel: true,
    })

    db.update(({ tickets, ticketsOwnerIndex }) => {
        tickets[newChannel.id] = {
            ...ticketDetails,
            channelId: newChannel.id,
        }

        ticketsOwnerIndex[userId] = newChannel.id
    })

    return { ticket: db.data.tickets[newChannel.id]!, channel: newChannel }
}
