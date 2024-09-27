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

export async function openTicket(member: GuildMember) {
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

    // create this separately, rather than in the initial channel request since
    // this will allow the created channel to inherit the tickets category's permissions
    await newChannel.permissionOverwrites.create(member.user, {
        SendMessages: true,
        ViewChannel: true,
    })

    db.update(({ tickets, ticketsOwnerIndex }) => {
        tickets[newChannel.id] = {
            channelId: newChannel.id,
            ownerId: userId,
        }

        ticketsOwnerIndex[userId] = newChannel.id
    })

    return newChannel
}
