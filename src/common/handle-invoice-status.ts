import { EmbedBuilder, type TextBasedChannelFields } from 'discord.js'
import type Stripe from 'stripe'
import { invoiceLog } from '/logger'
import { db } from '/services/database'
import type { Currency } from '/services/orbiting'
import { stripe } from '/services/stripe'
import type { Ticket } from '/services/tickets'
import { sendEmbed } from './send-embed'

/**
 * @param ticket Ticket object, which is modified directly.
 */
export async function updateTicketInvoiceStatus(ticket: Ticket) {
    if (!ticket.invoiceId) {
        return null
    }

    const updatedInvoice = await stripe.invoices.retrieve(ticket.invoiceId, {
        expand: ['charge'],
    })

    // update all information we can gather from the invoice on stripe
    ticket.currency = updatedInvoice.currency as Currency
    ticket.amount = updatedInvoice.amount_due / 100 // converting from cents
    ticket.amountPaid = updatedInvoice.amount_paid / 100

    const charge = updatedInvoice.charge as Stripe.Charge | null
    if (charge?.refunded) {
        ticket.amountPaid -= charge.amount_refunded / 100
    }

    if (charge) {
        // since charge doesn't seem to hold this information we will use this date
        ticket.lastPaidAt = Date.now()
    }

    db.update(({ tickets }) => {
        tickets[ticket.channelId] = ticket
    })

    invoiceLog('Updated invoice information for', ticket.channelId)

    return ticket
}

export async function sendInvoiceStatusMessage(
    ticket: Ticket,
    channel: TextBasedChannelFields,
) {
    if (ticket.amount === null) {
        return null
    }

    const remainingAmount = ticket.amount - ticket.amountPaid
    const isFullyPaid = remainingAmount <= 0

    return sendEmbed(
        channel,
        new EmbedBuilder()
            .setTitle(
                isFullyPaid ? 'Your Invoice is Paid!' : 'Your Invoice Ready',
            )
            .setDescription(
                `**[View your invoice here](${ticket.invoiceUrl})**`,
            )
            .setColor(isFullyPaid ? 0x97ca72 : null)
            .addFields({
                name: 'Remaining Amount',
                value: `${ticket.currency.toUpperCase()} \`\$${remainingAmount.toFixed(2)}\``,
            }),
    )
}
