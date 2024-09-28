import {
    type APIEmbed,
    EmbedBuilder,
    type MessageCreateOptions,
    type TextBasedChannelFields,
} from 'discord.js'

export const DEFAULT_EMBED: APIEmbed = {
    color: 0x56a9ec,
}

export async function sendEmbed(
    channel: TextBasedChannelFields,
    embed: APIEmbed | EmbedBuilder,
    options?: string | MessageCreateOptions,
) {
    const embedWithDefaults: APIEmbed = Object.assign(
        {},
        DEFAULT_EMBED,
        embed instanceof EmbedBuilder ? embed.toJSON() : embed,
    )

    const convertedOptions: MessageCreateOptions | undefined =
        typeof options === 'string' ? { content: options } : options

    return channel.send({
        ...convertedOptions,
        embeds: [embedWithDefaults],
    })
}
