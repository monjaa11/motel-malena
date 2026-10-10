// Dnevni backup: preuzme sve podatke iz baze u JSON fajl (pokreće ga GitHub Actions).
import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync } from 'node:fs'

const { VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: key, BACKUP_PIN: pin } = process.env
const email = 'recepcija@motelmalena.app'
if (!url || !key || !pin) { console.error('Nedostaju podaci za backup (secrets).'); process.exit(1) }

const db = createClient(url, key, { auth: { persistSession: false } })
const { error } = await db.auth.signInWithPassword({ email, password: `Malena-${pin}` })
if (error) { console.error('Prijava nije uspjela:', error.message); process.exit(1) }

async function all(table) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select('*').range(from, from + 999)
    if (error) throw error
    out.push(...data)
    if (data.length < 1000) return out
  }
}
const data = {
  at: new Date().toISOString(),
  rooms: await all('rooms'),
  guests: await all('guests'),
  reservations: await all('reservations'),
  activity_log: await all('activity_log'),
}
mkdirSync('backup', { recursive: true })
const file = `backup/motel-malena-${data.at.slice(0, 10)}.json`
writeFileSync(file, JSON.stringify(data, null, 1))
console.log(`OK: ${file} – ${data.guests.length} gostiju, ${data.reservations.length} rezervacija`)
