import { Events, GatewayIntentBits } from 'discord.js'

import buttonsCreatorCommand from './commands/buttons'
import invoiceCommand from './commands/invoice'
import ticketCommand from './commands/ticket'
import { dbLog, log } from './logger'
import { db } from './services/database'
import { handleButtonInteraction } from './services/interactions/button-registry'
import {
    SlashClient,
    handleCommandInteraction,
} from './services/interactions/command-registry'

export const client = new SlashClient({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
})

client.once(Events.ClientReady, async () => {
    log(`Hello ${client.user.tag}`)

    client.registerCommands(
        ticketCommand,
        buttonsCreatorCommand,
        invoiceCommand,
    )

    try {
        await client.registerGlobalCommands()
    } catch (err) {
        log('Failed to register slash commands:', err)
        process.exit(-1)
    }

    db.read()
    dbLog('Successfully read database')

    // write any changes outstanding before a clean exit
    // ! this is not super important since the db should be getting updated with .update
    process.on('exit', () => {
        dbLog('Writing JSON file before exit')
        db.write()
    })
})

client.on(Events.InteractionCreate, handleCommandInteraction)
client.on(Events.InteractionCreate, handleButtonInteraction)

if (!process.env.DISCORD_BOT_TOKEN) {
    log('DISCORD_BOT_TOKEN is currently unset, please set it and try again')
    process.exit(-1)
}

client.login(process.env.DISCORD_BOT_TOKEN)
