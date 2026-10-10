// Lokalni način rada SAMO za pregled tokom izrade (npm run build:preview).
// Produkcijska verzija ovo nikad ne koristi.
import { lsGet, lsSet, overlaps } from '../lib/util.js'
import { USERS } from '../config.js'

const DATA_KEY = 'mm-local-data-v1'
const DEVICE_KEY = 'mm-device'
const ROOMS = [
  [11, 3], [12, 2], [13, 3], [14, 2], [15, 3], [16, 3],
  [21, 3], [22, 2], [23, 3], [24, 2], [25, 3], [26, 3],
  [31, 3], [32, 2], [33, 3], [34, 2], [35, 3], [36, 3],
].map(([id, capacity], i) => ({ id, capacity, sort: i + 1, active: true }))

let mem = null
let chan = null
const listeners = new Set()
function channel() {
  if (chan !== null) return chan
  try { chan = new BroadcastChannel('mm-local'); chan.onmessage = () => { mem = null; listeners.forEach((f) => f()) } } catch { chan = false }
  return chan
}
function load() {
  if (mem) return mem
  try { const raw = lsGet(DATA_KEY); if (raw) mem = JSON.parse(raw) } catch { mem = null }
  if (!mem) { mem = { rooms: ROOMS, guests: [], reservations: [] }; persist() }
  return mem
}
function persist() { lsSet(DATA_KEY, JSON.stringify(mem)); try { channel() && chan.postMessage('changed') } catch { /* ignore */ } }
const wait = (ms = 100) => new Promise((r) => setTimeout(r, ms))
const uid = () => Math.random().toString(36).slice(2, 10)
const clone = (x) => JSON.parse(JSON.stringify(x))

export const backend = {
  getDevice: () => lsGet(DEVICE_KEY),
  async isActivated() { return !!lsGet(DEVICE_KEY) },
  async activate(pin, userName) {
    await wait(250)
    if (!USERS.some((u) => u.name === userName)) throw new Error('Odaberite korisnika.')
    // Lozinke za pregled dolaze iz .env.preview (nisu dio produkcijske verzije)
    const pins = Object.fromEntries((import.meta.env.VITE_PREVIEW_PINS || '').split(',').filter(Boolean).map((x) => x.split(':')))
    if (pins[userName] !== String(pin).trim()) throw new Error('Pogrešna lozinka. Provjerite i pokušajte ponovo.')
    lsSet(DEVICE_KEY, userName)
  },
  async deactivate() { lsSet(DEVICE_KEY, null) },
  async loadAll() { await wait(40); const d = load(); return clone({ rooms: d.rooms, guests: d.guests, reservations: d.reservations }) },
  subscribe(onChange) { channel(); listeners.add(onChange); return () => listeners.delete(onChange) },
  async saveGuest(g) {
    await wait()
    const d = load()
    const row = { first_name: g.first_name.trim(), last_name: (g.last_name || '').trim(), phone: (g.phone || '').trim() }
    let out
    if (g.id) { out = d.guests.find((x) => x.id === g.id); Object.assign(out, row) }
    else { out = { id: uid(), ...row, created_at: new Date().toISOString(), created_by: lsGet(DEVICE_KEY) || '' }; d.guests.push(out) }
    persist(); return clone(out)
  },
  async deleteGuest(id) {
    await wait()
    const d = load()
    d.reservations = d.reservations.filter((r) => r.guest_id !== id)
    d.guests = d.guests.filter((g) => g.id !== id); persist()
  },
  async saveReservation(r) {
    await wait()
    const d = load()
    if (!(r.check_out > r.check_in)) throw new Error('Provjerite datume: odlazak mora biti nakon dolaska.')
    if (r.status !== 'otkazano') {
      const clash = d.reservations.find((x) => x.id !== r.id && x.room_id === r.room_id && x.status !== 'otkazano' && overlaps(x, r))
      if (clash) throw new Error('Ta soba je već zauzeta u odabranim datumima. Odaberite drugu sobu ili datume.')
    }
    const who = lsGet(DEVICE_KEY) || ''
    const now = new Date().toISOString()
    const row = { guest_id: r.guest_id, room_id: r.room_id, check_in: r.check_in, check_out: r.check_out, persons: r.persons, status: r.status, source: r.source, note: r.note || '', updated_at: now, updated_by: who }
    let out
    if (r.id) { out = d.reservations.find((x) => x.id === r.id); Object.assign(out, row) }
    else { out = { id: uid(), ...row, created_at: now, created_by: who, updated_by: '' }; d.reservations.push(out) }
    persist(); return clone(out)
  },
  async deleteReservation(id) { await wait(); const d = load(); d.reservations = d.reservations.filter((r) => r.id !== id); persist() },
}
