import type { Guild, GuildMember } from 'discord.js'

import { db } from './database'
import { orb } from './orbiting'

export function getTicketChannelName(username: string) {
    return `ticket-${username}`
}

export async function getTicketsCategory(guild: Guild) {
    if (!orb.config?.ticketsCategoryId) {
        return null
    }

    return guild.channels.resolve(orb.config.ticketsCategoryId as string)
}

export async function createTicketChannel(member: GuildMember) {
    const ticketsCategory = await getTicketsCategory(member.guild)
    if (ticketsCategory === null) {
        throw Error(
            'Ticket Category is either unset or unresolvable by the current ID.',
        )
    }

    const userId = member.user.id
    if (userId in db.data.ticketsOwnerIndex) {
        throw Error('You already have an open ticket.')
    }

    const newChannel = await member.guild.channels.create({
        name: getTicketChannelName(member.user.username),
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
            channelId: newChannel.id,
            ownerId: userId,
            openedAt: Date.now(),
            invoiceId: null,
            invoiceItemId: null,
            invoiceUrl: null,
            invoiceCreatedAt: null,
            currency: orb.config.currencyPreference,
            amount: null,
            amountPaid: 0,
            lastPaidAt: null,
        }

        ticketsOwnerIndex[userId] = newChannel.id
    })

    return newChannel
}
