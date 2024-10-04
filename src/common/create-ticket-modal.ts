import { GuildMember, TextInputBuilder, TextInputStyle } from 'discord.js'
import {
    Modal,
    type ModalCompatibleInteraction,
    type ModalHandler,
} from '/services/interactions/modal-registry'
import { stripe } from '/services/stripe'
import { handleOpenTicketInteraction } from './handle-open-ticket'
import { getOrCreateCustomer } from './upsert-customer'

export async function showTicketCreationModal(
    interaction: ModalCompatibleInteraction,
) {
    if (!(interaction.member instanceof GuildMember)) {
        return // executed outside of a guild; don't care
    }

    // upsert the customer based on the user object
    const customer = await getOrCreateCustomer(interaction.user)

    const handleModalSubmit: ModalHandler = async (ctx) => {
        const name = ctx.fields.getTextInputValue('name')
        const openReason = ctx.fields.getTextInputValue('explanation')

        // only update if necessary
        if (name !== customer.name) {
            await stripe.customers.update(customer.id, { name })
            customer.name = name
        }

        return handleOpenTicketInteraction(ctx, { openReason })
    }

    return new Modal('Create a Ticket')
        .addRow(
            new TextInputBuilder()
                .setLabel('Your Name')
                .setStyle(TextInputStyle.Short)
                .setCustomId('name')
                .setValue(customer.name ?? '')
                .setPlaceholder('John Smith'),
        )
        .addRow(
            new TextInputBuilder()
                .setLabel('Explanation')
                .setStyle(TextInputStyle.Paragraph)
                .setCustomId('explanation')
                .setPlaceholder('I need help with...')
                .setMaxLength(500) // must always be less than 1024 characters
                .setRequired(false),
        )
        .show(interaction)
        .then(handleModalSubmit)
}
