// ---------- Datumi (uvijek lokalno vrijeme, format 'YYYY-MM-DD') ----------
const pad = (n) => String(n).padStart(2, '0')
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
export const todayISO = () => toISO(new Date())
export const addDays = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return toISO(d) }
export const nightsBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000)

export const MONTHS = ['januar', 'februar', 'mart', 'april', 'maj', 'juni', 'juli', 'august', 'septembar', 'oktobar', 'novembar', 'decembar']
const MONTHS_GEN = ['januara', 'februara', 'marta', 'aprila', 'maja', 'juna', 'jula', 'augusta', 'septembra', 'oktobra', 'novembra', 'decembra']
export const DAYS = ['nedjelja', 'ponedjeljak', 'utorak', 'srijeda', 'četvrtak', 'petak', 'subota']
export const DAYS_SHORT = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned']
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

export const fmtShort = (iso) => { const d = parseISO(iso); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.` }
export const fmtFull = (iso) => { const d = parseISO(iso); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}.` }
export const fmtLong = (iso) => { const d = parseISO(iso); return `${cap(DAYS[d.getDay()])}, ${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}.` }
export const fmtDayMonth = (iso) => { const d = parseISO(iso); return `${d.getDate()}. ${MONTHS_GEN[d.getMonth()]}` }
export const fmtWeekday = (iso) => cap(DAYS[parseISO(iso).getDay()])
export const fmtMonthTitle = (y, m) => `${cap(MONTHS[m])} ${y}.`
export const fmtStamp = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}. u ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ---------- Gramatika ----------
const plural = (n, one, few, many) => {
  const a = Math.abs(n) % 100, b = a % 10
  if (b === 1 && a !== 11) return one
  if (b >= 2 && b <= 4 && (a < 12 || a > 14)) return few
  return many
}
export const nightsLabel = (n) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'noć' : 'noći'}`
export const personsLabel = (n) => `${n} ${plural(n, 'osoba', 'osobe', 'osoba')}`
export const guestsLabel = (n) => `${n} ${plural(n, 'gost', 'gosta', 'gostiju')}`
export const resLabel = (n) => `${n} ${plural(n, 'rezervacija', 'rezervacije', 'rezervacija')}`
export const roomsLabel = (n) => `${n} ${plural(n, 'soba', 'sobe', 'soba')}`

// ---------- Pretraga bez obzira na č, ć, đ, š, ž ----------
export const norm = (s) => (s || '')
  .toLowerCase()
  .replace(/đ/g, 'd')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/dj/g, 'd')
  .trim()

// ---------- Šifrarnici ----------
export const STATUSES = [
  { id: 'rezervisano', label: 'Rezervisano' },
  { id: 'potvrdjeno', label: 'Potvrđeno' },
  { id: 'prijavljen', label: 'Prijavljen' },
  { id: 'odjavljen', label: 'Odjavljen' },
  { id: 'otkazano', label: 'Otkazano' },
]
export const statusLabel = (id) => STATUSES.find((s) => s.id === id)?.label || id

export const SOURCES = [
  { id: 'booking', label: 'Booking' },
  { id: 'telefon', label: 'Telefon' },
  { id: 'direktno', label: 'Direktno' },
  { id: 'ostalo', label: 'Ostalo' },
]
export const sourceLabel = (id) => SOURCES.find((s) => s.id === id)?.label || id

export const fullName = (g) => (g ? `${g.first_name} ${g.last_name}`.trim() : 'Nepoznat gost')

// Da li se rezervacija preklapa s drugom u istoj sobi (noći [check_in, check_out) )
export const overlaps = (a, b) => a.check_in < b.check_out && b.check_in < a.check_out

export const lsGet = (k) => { try { return localStorage.getItem(k) } catch { return null } }
export const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v) } catch { /* ignore */ } }
