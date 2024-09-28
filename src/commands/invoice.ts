import {
    EmbedBuilder,
    PermissionFlagsBits,
    type SendableChannels,
} from 'discord.js'
import { sendEmbed } from '../common/send-embed'
import { CommandBase } from '../services/command-registry'
import { db } from '../services/database'
import { orb } from '../services/orbiting'
import { getOrCreateCustomer, stripe } from '../services/stripe'

const invoiceCommand = new CommandBase('invoice')
    .setDescription('Generate an invoice')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setExecutionContext('guilds')
    .setExecutor(async (ctx) => {
        const ticket = db.data.tickets[ctx.channelId]
        if (!ticket) {
            await ctx.reply({
                content: 'Please use this command inside a ticket channel',
                ephemeral: true,
            })
            return
        }

        await ctx.deferReply({ ephemeral: true })

        const customer = await getOrCreateCustomer(ticket.ownerId)
        const invoice = await stripe.invoices.create({
            currency: orb.config.currencyPreference,
            customer: customer.id,
        })

        const price = +(ctx.options.get('price', true).value as number).toFixed(
            2,
        )

        await stripe.invoiceItems.create({
            customer: customer.id,
            invoice: invoice.id,
            amount: Math.round(price * 100),
        })

        const finalizedInvoice = await stripe.invoices.finalizeInvoice(
            invoice.id,
        )

        await ctx.deleteReply()

        await sendEmbed(
            ctx.channel! as SendableChannels, // todo: yikes
            new EmbedBuilder()
                .setTitle('Invoice Ready')
                .setDescription(
                    `**[View your invoice here](${finalizedInvoice.hosted_invoice_url})**`,
                )
                .addFields({
                    name: 'Amount',
                    value: `\$${price.toFixed(2)}`,
                }),
        )
    })
    .addNumberOption((o) =>
        o
            .setName('price')
            .setDescription('The price to generate the invoice with')
            .setRequired(true),
    ) as CommandBase

export default invoiceCommand
