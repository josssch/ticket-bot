import {
    ActionRowBuilder,
    type CommandInteraction,
    type MessageComponentInteraction,
    type ModalActionRowComponentBuilder,
    ModalBuilder,
    type ModalSubmitInteraction,
} from 'discord.js'

export type ModalHandler = (ctx: ModalSubmitInteraction) => unknown

export type ModalCompatibleInteraction =
    | CommandInteraction
    | MessageComponentInteraction

function randomString(
    length = 8,
    charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
) {
    let str = ''

    for (let i = 0; i < length; i++) {
        str += charset.at(Math.floor(Math.random() * charset.length))
    }

    return str
}

export class Modal extends ModalBuilder {
    readonly customId: string

    constructor(title: string) {
        super({ title })

        this.customId = randomString()
        super.setCustomId(this.customId)
    }

    addRow(component: ModalActionRowComponentBuilder) {
        // only allow one at a time for now, since as of right now it seems
        // text inputs are the only thing and they take up entire rows
        super.addComponents(
            new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
                component,
            ),
        )

        return this
    }

    override setCustomId(_customId: string): this {
        return this // disallow setting of custom id elsewhere
    }

    async show(ctx: ModalCompatibleInteraction) {
        await ctx.showModal(this.toJSON())

        return ctx.awaitModalSubmit({
            filter: ({ customId }) => customId === this.customId,
            time: 1000 * 60 * 10, // ms (10 minutes)
        })
    }
}
