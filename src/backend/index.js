import { backend as live } from './supabase.js'
import { backend as local } from './local.js'

// Produkcija uvijek koristi Supabase bazu. Lokalni način postoji samo za pregled tokom izrade.
export const isPreview = import.meta.env.MODE === 'preview'
export const isConfigured = isPreview || !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
export const backend = isPreview ? local : live
