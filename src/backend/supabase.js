import { createClient } from '@supabase/supabase-js'
import { lsGet, lsSet } from '../lib/util.js'
import { USERS, toPassword } from '../config.js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const DEVICE_KEY = 'mm-device'
let client = null

// Naziv uređaja ide u zaglavlje svakog zahtjeva (za dnevnik izmjena). Zaglavlje mora biti ASCII.
const ascii = (s) => (s || '').replace(/đ/g, 'dj').replace(/Đ/g, 'Dj').normalize('NFD').replace(/[^\x20-\x7e]/g, '')

function db() {
  if (!client) {
    client = createClient(URL, KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'mm-auth' },
      global: { headers: { 'x-device-name': ascii(lsGet(DEVICE_KEY) || '') } },
    })
  }
  return client
}

function friendly(error) {
  if (!error) return null
  const msg = error.message || String(error)
  if (error.code === '23P01') return new Error('Ta soba je već zauzeta u odabranim datumima. Osvježite i odaberite drugu sobu ili datume.')
  if (error.code === '23503') return new Error('Gost ima rezervacije, pa se ne može obrisati. Prvo obrišite njegove rezervacije.')
  if (error.code === '23514') return new Error('Provjerite datume: odlazak mora biti nakon dolaska.')
  if (/Invalid login credentials/i.test(msg)) return new Error('Pogrešna lozinka. Provjerite i pokušajte ponovo.')
  if (/fetch|network|Failed to/i.test(msg)) return new Error('Nema veze s internetom. Provjerite internet i pokušajte ponovo.')
  if (/JWT|session|not authenticated|permission denied|row-level/i.test(msg)) return new Error('Prijava je istekla. Otvorite meni, odjavite se i prijavite ponovo.')
  return new Error(msg)
}
const check = ({ data, error }) => { if (error) throw friendly(error); return data }

async function fetchAll(table, order) {
  const out = []
  const size = 1000
  for (let from = 0; ; from += size) {
    const rows = check(await db().from(table).select('*').order(order).range(from, from + size - 1))
    out.push(...rows)
    if (rows.length < size) break
  }
  return out
}

export const backend = {
  getDevice: () => lsGet(DEVICE_KEY),

  async isActivated() {
    if (!lsGet(DEVICE_KEY)) return false
    const { data } = await db().auth.getSession()
    return !!data.session
  },

  async activate(pin, userName) {
    const user = USERS.find((u) => u.name === userName)
    if (!user) throw new Error('Odaberite korisnika.')
    lsSet(DEVICE_KEY, userName)
    client = null // novi klijent s imenom korisnika
    const { error } = await db().auth.signInWithPassword({ email: user.email, password: toPassword(pin) })
    if (error) { lsSet(DEVICE_KEY, null); throw friendly(error) }
  },

  async deactivate() {
    try { await db().auth.signOut({ scope: 'local' }) } catch { /* ignore */ }
    lsSet(DEVICE_KEY, null)
    client = null
  },

  async loadAll() {
    const [rooms, guests, reservations] = await Promise.all([
      fetchAll('rooms', 'sort'),
      fetchAll('guests', 'last_name'),
      fetchAll('reservations', 'check_in'),
    ])
    return { rooms: rooms.filter((r) => r.active), guests, reservations }
  },

  subscribe(onChange) {
    const ch = db().channel('mm-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guests' }, onChange)
      .subscribe()
    // Kad se telefon "probudi" ili vrati internet, osvježi sve (realtime je možda bio prekinut)
    const wake = () => { if (document.visibilityState === 'visible') onChange() }
    document.addEventListener('visibilitychange', wake)
    window.addEventListener('online', onChange)
    const poll = setInterval(wake, 60000)
    return () => {
      db().removeChannel(ch)
      document.removeEventListener('visibilitychange', wake)
      window.removeEventListener('online', onChange)
      clearInterval(poll)
    }
  },

  async saveGuest(g) {
    const who = lsGet(DEVICE_KEY) || ''
    const row = { first_name: g.first_name.trim(), last_name: (g.last_name || '').trim(), phone: (g.phone || '').trim() }
    if (g.id) return check(await db().from('guests').update(row).eq('id', g.id).select().single())
    return check(await db().from('guests').insert({ ...row, created_by: who }).select().single())
  },

  // Briše gosta zajedno sa svim njegovim rezervacijama
  async deleteGuest(id) {
    check(await db().from('reservations').delete().eq('guest_id', id))
    check(await db().from('guests').delete().eq('id', id))
  },

  async saveReservation(r) {
    const who = lsGet(DEVICE_KEY) || ''
    const row = {
      guest_id: r.guest_id, room_id: r.room_id, check_in: r.check_in, check_out: r.check_out,
      persons: r.persons, status: r.status, source: r.source, note: r.note || '', updated_by: who,
    }
    if (r.id) return check(await db().from('reservations').update(row).eq('id', r.id).select().single())
    return check(await db().from('reservations').insert({ ...row, created_by: who }).select().single())
  },

  async deleteReservation(id) {
    check(await db().from('reservations').delete().eq('id', id))
  },
}
