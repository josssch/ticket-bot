import { ActionRowBuilder, type ButtonBuilder, TextChannel } from 'discord.js'

import { CREATE_TICKET_BUTTON } from '../services/button-registry'
import { CommandBase } from '../services/command-registry'

const buttonsCreatorCommand = new CommandBase('buttons')
    .setDescription(
        'Administrative command for deploying preset messages with buttons into the current channel',
    )
    .setExecutionContext('guilds')
    .setExecutor(async (ctx) => {
        if (!(ctx.channel instanceof TextChannel)) {
            return
        }

        await ctx.deferReply({ ephemeral: true })

        const preset = ctx.options.get('preset', true)
        switch (preset.value) {
            case 'ticket':
                await ctx.channel.send({
                    content: 'example',
                    components: [
                        new ActionRowBuilder<ButtonBuilder>()
                            .addComponents(CREATE_TICKET_BUTTON)
                            .toJSON(),
                    ],
                })

                await ctx.deleteReply()
                break

            default:
                await ctx.editReply('There is no such preset')
                break
        }
    })
    .addStringOption((o) =>
        o
            .setName('preset')
            .setDescription('The preset message to output')
            .addChoices({ name: 'Tickets', value: 'ticket' })
            .setRequired(true),
    ) as CommandBase

export default buttonsCreatorCommand
