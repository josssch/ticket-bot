import { BaseGuildTextChannel, PermissionFlagsBits } from 'discord.js'
import {
    sendInvoiceStatusMessage,
    updateTicketInvoiceStatus,
} from '/common/handle-invoice-status'
import { getOrCreateCustomer } from '/common/upsert-customer'
import { invoiceLog } from '/logger'
import { getTicketTopic } from '/services/tickets'
import { db } from '../services/database'
import { CommandBase } from '../services/interactions/command-registry'
import { orb } from '../services/orbiting'
import { stripe } from '../services/stripe'

const invoiceCommand = new CommandBase('invoice')
    .setDescription('Generate an invoice')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setExecutionContext('guilds')
    .setExecutor(async (ctx) => {
        const ticket = db.data.tickets[ctx.channelId]
        const ticketChannel = ctx.channel

        if (!ticket || !(ticketChannel instanceof BaseGuildTextChannel)) {
            await ctx.reply({
                content: 'Please use this command inside a ticket channel',
                ephemeral: true,
            })
            return
        }

        // this lets the user know the command was recieved, but also lets us use .deleteReply()
        // note for future me: this does require use of .editReply over .reply
        await ctx.deferReply({ ephemeral: true })

        const invoiceExists =
            ticket.invoiceId !== null && ticket.invoiceItemId !== null

        const priceOption = ctx.options.get('price')

        const price = priceOption
            ? +(priceOption.value as number).toFixed(2)
            : null

        const priceInCents = price ? Math.round(price * 100) : null

        // if the invoice exists and there is no price provided then it can be assumed
        // they want the invoice message to be resent
        if (invoiceExists && !price) {
            await updateTicketInvoiceStatus(ticket)

            await Promise.all([
                sendInvoiceStatusMessage(ticket, ticketChannel),
                ctx.deleteReply(),
                ticketChannel.setTopic(getTicketTopic(ticket)),
            ])
            return
        }

        // todo: update the price if the invoice exists already
        if (invoiceExists && price) {
            await ctx.editReply(
                'The price cannot be updated if the invoice has been finalized',
            )
            return
        }

        if (!price) {
            await ctx.editReply(
                'The price is required when creating a new invoice',
            )
            return
        }

        const customer = await getOrCreateCustomer({ id: ticket.ownerId })
        const invoice = await stripe.invoices.create({
            automatic_tax: { enabled: orb.config.automaticTax },
            currency: orb.config.currencyPreference,
            customer: customer.id,
            metadata: {
                ticketChannelId: ticket.channelId,
            },
        })

        const invoiceItem = await stripe.invoiceItems.create({
            customer: customer.id,
            invoice: invoice.id,
            amount: priceInCents!,
        })

        const finalizedInvoice = await stripe.invoices.finalizeInvoice(
            invoice.id,
        )

        invoiceLog(
            `Created an invoice for \$${price.toFixed(2)} on ticket ${ticket.channelId}`,
        )

        ticket.invoiceId = invoice.id
        ticket.invoiceItemId = invoiceItem.id
        ticket.invoiceUrl = finalizedInvoice.hosted_invoice_url!
        ticket.invoiceCreatedAt = Date.now()
        ticket.amount = price

        db.data.invoiceTicketIndex[invoice.id] = ticket.invoiceId

        // save the changes we made ^
        db.write()

        await Promise.all([
            ctx.deleteReply(),
            sendInvoiceStatusMessage(ticket, ticketChannel),
            ticketChannel.setTopic(getTicketTopic(ticket)),
        ])
    })
    .addNumberOption((o) =>
        o
            .setName('price')
            .setDescription('The price to generate the invoice with')
            .setRequired(false),
    ) as CommandBase

export default invoiceCommand
