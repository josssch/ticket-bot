import Stripe from 'stripe'

if (!process.env.STRIPE_API_KEY) {
    console.error('STRIPE_API_KEY is required but unset')
    process.exit(-1)
}

export const stripe = new Stripe(process.env.STRIPE_API_KEY)
