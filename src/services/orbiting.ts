import orbiting from 'orbiting'

if (!process.env.ORBITING_APP_TOKEN) {
    console.error("ORBITING_APP_TOKEN must be set but isn't")
    process.exit(-1)
}

export const orb = orbiting
    .withSettings({ token: process.env.ORBITING_APP_TOKEN })
    .withSchema({
        ticketsCategoryId: {
            title: 'Tickets Category ID',
            description:
                'The ID of the category to place ticket channels in. Obtain this on Discord by right-clicking the category and clicking "Copy ID".',

            type: 'string',
            nullable: true,
            default: null,
        },

        customerRoleId: {
            title: 'Customer Role ID',

            type: 'string',
            nullable: true,
            default: null,
        },

        automaticCustomerRole: {
            title: 'Automatic Customer Role',
            description:
                'Whether to assign the customer role to individuals when they have paid an invoice.',

            type: 'boolean',
            default: true,
        },

        ticketOwnerPermissions: {
            title: 'Ticket Owner Permissions',
            description:
                'This is list of the permissions that should be given to the owner in their own ticket channel.',

            type: 'array',
            items: { type: 'string' },
            default: ['AttachFiles'],
        },

        currencyPreference: {
            title: 'Currency Preference',

            type: 'string',
            enum: ['USD', 'CAD'],
            default: 'USD',
        },

        automaticTax: {
            title: 'Automatic Tax Calculations',
            type: 'boolean',
            default: false,
        },

        invoiceUpdatesMS: {
            title: 'Invoice Status Update Frequency',
            description: 'In milliseconds',

            type: 'integer',
            default: 1000 * 60, // every minute by default
        },
    })
    .withLayout(
        {
            title: 'Discord Settings',
            controls: [
                { for: 'ticketsCategoryId', renderAs: 'input' },
                { for: 'ticketOwnerPermissions' },
                { for: 'customerRoleId' },
                { for: 'automaticCustomerRole' },
            ],
        },
        {
            title: 'Stripe Settings',
            controls: [
                { for: 'currencyPreference' },
                { for: 'automaticTax' },
                { for: 'invoiceUpdatesMS' },
            ],
        },
    )
    .createConnection()

export type Currency = typeof orb.config.currencyPreference
