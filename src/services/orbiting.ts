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
    })
    .withLayout({
        title: 'Channel IDs',
        description: 'Discord channel related settings',
        controls: [{ for: 'ticketsCategoryId', renderAs: 'input' }],
    })
    .createConnection()
