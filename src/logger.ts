import debug from 'debug'

export const log = debug('ticket:bot')
export const dbLog = log.extend('db')
export const ticketLog = log.extend('tickets')
export const invoiceLog = log.extend('invoice')
