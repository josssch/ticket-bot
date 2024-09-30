import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { JSONFileSyncPreset } from 'lowdb/node'
import type { Currency } from './orbiting'

export interface Database {
    /**
     * `Ticket.channelId` -> `Ticket`
     */
    tickets: Record<string, Ticket>

    /**
     * `Ticket.ownerId` -> `Ticket.channelId`
     */
    ticketsOwnerIndex: Record<string, string>

    /**
     * Discord User ID -> Stripe Customer ID
     */
    stripeCustomerIndex: Record<string, string>
}

export type EpochMilliseconds = number

export interface Ticket {
    channelId: string
    ownerId: string

    openedAt: EpochMilliseconds
    openReason: string | null

    invoiceId: string | null
    invoiceItemId: string | null
    invoiceUrl: string | null
    invoiceCreatedAt: EpochMilliseconds | null

    currency: Currency
    amount: number | null
    amountPaid: number
    lastPaidAt: EpochMilliseconds | null
}

export const TICKET_DB_PATH = 'data/tickets.json'

// create the parent directories for the database file
if (!existsSync(TICKET_DB_PATH)) {
    mkdirSync(dirname(TICKET_DB_PATH), { recursive: true })
}

export const db = JSONFileSyncPreset<Database>('data/db.json', {
    tickets: {},
    ticketsOwnerIndex: {},
    stripeCustomerIndex: {},
})
