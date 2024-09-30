import { showTicketCreationModal } from '/common/create-ticket-modal'
import { CommandBase } from '../services/interactions/command-registry'

const ticketCommand = new CommandBase('ticket')
    .setDescription('Open a ticket')
    .setExecutionContext('guilds')
    .setExecutor(showTicketCreationModal)

export default ticketCommand
