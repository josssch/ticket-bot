import type Stripe from 'stripe'
import { db } from '/services/database'
import { stripe } from '/services/stripe'

export async function getOrCreateCustomer(userData: {
    id: string
    username?: string
}) {
    if (userData.id in db.data.stripeCustomerIndex) {
        return (await stripe.customers.retrieve(
            db.data.stripeCustomerIndex[userData.id],
        )) as Stripe.Customer
    }

    const customer = await stripe.customers.create({
        name: userData?.username,
        metadata: { discordId: userData.id },
    })

    db.update(({ stripeCustomerIndex }) => {
        stripeCustomerIndex[userData.id] = customer.id
    })

    return customer
}
