import type {
    AutocompleteInteraction,
    CommandInteraction,
    Interaction,
} from 'discord.js'

import {
    Client,
    Collection,
    DMChannel,
    REST,
    Routes,
    SlashCommandBuilder,
} from 'discord.js'
import { log } from '../logger'

export class SlashClient extends Client<true> {
    readonly commands: Collection<string, CommandBase> = new Collection()

    registerCommands(...commands: CommandBase[]) {
        for (const command of commands) {
            this.commands.set(command.name, command)
        }
    }

    async registerGlobalCommands() {
        if (!this.token || !this.application) {
            throw Error(
                'Please make sure the bot is running before calling this',
            )
        }

        await new REST()
            .setToken(this.token)
            .put(Routes.applicationCommands(this.application.id), {
                body: this.commands.map((c) => c.toJSON()),
            })
    }
}

export type ExecutionContext = 'all' | 'guilds' | 'dms'

export class CommandBase extends SlashCommandBuilder {
    run = async (_ctx: CommandInteraction) => {}
    autocompleter = async (ctx: AutocompleteInteraction) => ctx.respond([])

    executionContext: ExecutionContext = 'all'

    constructor(name: string) {
        super()
        this.setName(name)
    }

    public setAutocomplete(autocompleter: typeof this.autocompleter) {
        this.autocompleter = autocompleter
        return this
    }

    public setExecutionContext(context: ExecutionContext) {
        this.executionContext = context
        return this
    }

    public setExecutor(executor: typeof this.run) {
        this.run = executor
        return this
    }
}

export async function handleCommandInteraction(interaction: Interaction) {
    const client = interaction.client as SlashClient

    if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName)
        await command?.autocompleter(interaction)
        return
    }

    if (!interaction.isCommand()) {
        return
    }

    const command = client.commands.get(interaction.commandName)
    if (!command) {
        log(
            'Tried to execute command',
            interaction.commandName,
            'but there is no executor for it',
        )
        return
    }

    // just run the command if all contexts are accepted
    if (command.executionContext === 'all') {
        await command.run(interaction)
        return
    }

    if (interaction.guild && command.executionContext === 'guilds') {
        await command.run(interaction)
        return
    }

    if (
        interaction.channel instanceof DMChannel &&
        command.executionContext === 'dms'
    ) {
        await command.run(interaction)
        return
    }

    await interaction.reply({
        content: `The command you are trying to run is only supported in ${command.executionContext}`,
        ephemeral: true,
    })
}
