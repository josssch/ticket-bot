import Stripe from 'stripe'
import { db } from './database'

if (!process.env.STRIPE_API_KEY) {
    console.error('STRIPE_API_KEY is required but unset')
    process.exit(-1)
}

export const stripe = new Stripe(process.env.STRIPE_API_KEY)

export async function stripeInit() {}

export async function getOrCreateCustomer(
    discordId: string,
    userData?: { username: string },
) {
    if (discordId in db.data.stripeCustomerIndex) {
        return stripe.customers.retrieve(db.data.stripeCustomerIndex[discordId])
    }

    const customer = await stripe.customers.create({
        name: userData?.username,
        metadata: { discordId },
    })

    db.update(({ stripeCustomerIndex }) => {
        stripeCustomerIndex[discordId] = customer.id
    })

    return customer
}
