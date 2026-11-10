// Central money formatting. Change the currency without touching code:
//   VITE_CURRENCY=INR  VITE_LOCALE=en-IN   (set before `npm run build`)
const CURRENCY = import.meta.env.VITE_CURRENCY || 'USD'
const LOCALE = import.meta.env.VITE_LOCALE || undefined

const formatter = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY })

export const money = (value) => formatter.format(Number(value) || 0)
export const currencySymbol = formatter.formatToParts(0).find((p) => p.type === 'currency')?.value || '$'
