import { openTicketWithInteraction } from '../common/interaction-open-ticket'
import { CommandBase } from '../services/command-registry'

const ticketCommand = new CommandBase('ticket')
    .setDescription('Open a ticket')
    .setExecutionContext('guilds')
    .setExecutor(openTicketWithInteraction)

export default ticketCommand
