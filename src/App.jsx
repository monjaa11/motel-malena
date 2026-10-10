import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { backend, isConfigured } from './backend/index.js'
import { USERS } from './config.js'
import { Icon, Sheet, ConfirmButton, useOnline, useToast } from './ui.jsx'
import { CalendarView, TodayView } from './views/Today.jsx'
import { buildCsv, GuestsView, ReservationsView } from './views/Lists.jsx'
import { Activation, GuestDetail, ReservationDetail, ReservationForm } from './views/Forms.jsx'
import { lsGet, lsSet, norm, statusLabel, todayISO } from './lib/util.js'

const TABS = [
  { id: 'danas', label: 'Danas', icon: 'calday' },
  { id: 'kalendar', label: 'Kalendar', icon: 'cal' },
  { id: 'rezervacije', label: 'Rezervacije', icon: 'checklist' },
  { id: 'gosti', label: 'Gosti', icon: 'users' },
]
// Unutar ugrađenog pregleda (iframe) preuzimanje fajlova nije moguće
const inSandbox = (() => { try { return window.self !== window.top } catch { return true } })()

export default function App() {
  const [phase, setPhase] = useState('loading') // loading | activate | ready
  const [data, setData] = useState({ rooms: [], guests: [], reservations: [] })
  const [tab, setTabRaw] = useState(() => lsGet('mm-tab') || 'danas')
  const [date, setDate] = useState(todayISO())
  const [sheet, setSheet] = useState(null)
  const [installEvt, setInstallEvt] = useState(null)
  const toast = useToast()
  const online = useOnline()

  const setTab = (t) => { setTabRaw(t); lsSet('mm-tab', t); window.scrollTo(0, 0) }

  const reload = useCallback(async () => {
    try { setData(await backend.loadAll()) } catch (e) { toast.push(e.message, 'err') }
  }, [toast.push])

  useEffect(() => {
    (async () => {
      try {
        if (await backend.isActivated()) { await reload(); setPhase('ready') } else setPhase('activate')
      } catch { setPhase('activate') }
    })()
  }, [])

  // Promjene s drugih uređaja stižu odmah (realtime)
  useEffect(() => {
    if (phase !== 'ready') return
    let t
    const onChange = () => { clearTimeout(t); t = setTimeout(reload, 250) }
    const off = backend.subscribe(onChange)
    return () => { clearTimeout(t); off() }
  }, [phase, reload])

  // Ako je aplikacija otvorena preko ponoći, "Danas" prelazi na novi dan
  const lastToday = useRef(todayISO())
  useEffect(() => {
    const id = setInterval(() => {
      const t = todayISO()
      if (t !== lastToday.current) { setDate((d) => (d === lastToday.current ? t : d)); lastToday.current = t }
    }, 30000)
    return () => clearInterval(id)
  }, [])

  // "Instaliraj aplikaciju" (Android / Windows Chrome i Edge)
  useEffect(() => {
    const h = (e) => { e.preventDefault(); setInstallEvt(e) }
    window.addEventListener('beforeinstallprompt', h)
    return () => window.removeEventListener('beforeinstallprompt', h)
  }, [])

  const guestsById = useMemo(() => new Map(data.guests.map((g) => [g.id, g])), [data.guests])
  const resById = useMemo(() => new Map(data.reservations.map((r) => [r.id, r])), [data.reservations])

  // ---------- akcije ----------
  const newRes = (preset = {}) => setSheet({ type: 'form', initial: { check_in: date, ...preset } })
  const openRes = (id) => setSheet({ type: 'res', id })
  const openGuest = (id) => setSheet({ type: 'guest', id })

  // Gost: ako rezervacija već ima gosta, ažurira se njegovo ime/telefon.
  // Za novu rezervaciju: ako gost s istim imenom (i telefonom) već postoji, koristi se on, inače se pravi novi.
  async function saveReservation(f) {
    const g = { first_name: f.first_name.trim(), last_name: f.last_name.trim(), phone: f.phone.trim() }
    let guestId = f.guest_id
    let createdGuest = null
    if (guestId) {
      const old = guestsById.get(guestId)
      if (!old || old.first_name !== g.first_name || old.last_name !== g.last_name || old.phone !== g.phone) {
        await backend.saveGuest({ id: guestId, ...g })
      }
    } else {
      const digits = (x) => (x || '').replace(/\D/g, '')
      const same = data.guests.find((x) => norm(`${x.first_name} ${x.last_name}`) === norm(`${g.first_name} ${g.last_name}`)
        && (!digits(g.phone) || !digits(x.phone) || digits(x.phone) === digits(g.phone)))
      if (same) {
        guestId = same.id
        if (!same.phone && g.phone) await backend.saveGuest({ ...same, phone: g.phone })
      } else {
        createdGuest = await backend.saveGuest(g)
        guestId = createdGuest.id
      }
    }
    try {
      await backend.saveReservation({ ...f, guest_id: guestId })
    } catch (e) {
      if (createdGuest) { try { await backend.deleteGuest(createdGuest.id) } catch { /* ignore */ } }
      throw e
    }
    await reload()
    toast.push(f.id ? 'Rezervacija je izmijenjena' : 'Rezervacija je sačuvana')
    setSheet(null)
  }

  async function deleteReservation(id) {
    try {
      await backend.deleteReservation(id)
      await reload(); toast.push('Rezervacija je obrisana'); setSheet(null)
    } catch (e) { toast.push(e.message, 'err') }
  }

  async function setStatus(res, status) {
    try {
      await backend.saveReservation({ ...res, status })
      await reload(); toast.push(`Status: ${statusLabel(status)}`)
    } catch (e) { toast.push(e.message, 'err') }
  }

  async function saveGuest(g) {
    const saved = await backend.saveGuest(g)
    await reload()
    toast.push(g.id ? 'Gost je izmijenjen' : 'Gost je dodan')
    if (!g.id) setSheet({ type: 'guest', id: saved.id })
  }

  async function deleteGuest(id) {
    try {
      await backend.deleteGuest(id)
      await reload(); toast.push('Gost je obrisan'); setSheet(null)
    } catch (e) { toast.push(e.message, 'err') }
  }

  function exportCsv() {
    if (inSandbox) { toast.push('Preuzimanje nije dostupno u ovom pregledu. U instaliranoj aplikaciji ovo preuzme Excel fajl.', 'err'); return }
    const blob = new Blob([buildCsv(data, guestsById)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `rezervacije-motel-malena-${todayISO()}.csv`
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }

  async function activate(code, name) {
    await backend.activate(code, name)
    await reload()
    setPhase('ready')
  }

  async function deactivate() {
    await backend.deactivate()
    setSheet(null); setData({ rooms: [], guests: [], reservations: [] }); setPhase('activate')
  }

  // ---------- prikaz ----------
  if (phase === 'loading') return <div className="splash"><Logo /><span className="muted">Učitavam…</span></div>
  if (!isConfigured) return <div className="splash"><Logo /><b>Aplikacija nije povezana s bazom.</b><span className="muted small">Upišite VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY na Netlifyju i ponovo objavite.</span></div>
  if (phase === 'activate') return <><Activation users={USERS} onActivate={activate} />{toast.view}</>

  const device = backend.getDevice()
  let sheetView = null
  if (sheet?.type === 'form') {
    sheetView = <ReservationForm key={sheet.initial?.id || 'new'} data={data} guestsById={guestsById} initial={sheet.initial}
      onSave={saveReservation} onDelete={deleteReservation} onClose={() => setSheet(null)} />
  } else if (sheet?.type === 'res') {
    const r = resById.get(sheet.id)
    if (r) sheetView = <ReservationDetail res={r} guest={guestsById.get(r.guest_id)} onClose={() => setSheet(null)}
      onEdit={() => setSheet({ type: 'form', initial: r })} onDelete={deleteReservation} onStatus={(s) => setStatus(r, s)}
      onOpenGuest={() => openGuest(r.guest_id)} />
  } else if (sheet?.type === 'guest') {
    const g = sheet.id ? guestsById.get(sheet.id) : null
    if (g || !sheet.id) sheetView = <GuestDetail key={sheet.id || 'new'} guest={g} reservations={data.reservations} onClose={() => setSheet(null)}
      onSave={saveGuest} onDelete={deleteGuest} onOpenRes={openRes}
      onNewRes={() => setSheet({ type: 'form', initial: { guest_id: g.id, check_in: date } })} />
  } else if (sheet?.type === 'menu') {
    sheetView = (
      <Sheet title="Podešavanja" onClose={() => setSheet(null)}>
        <div className="detail">
          <dl className="kv">
            <dt>Prijavljen</dt><dd><b>{device}</b></dd>
            <dt>Veza</dt><dd>{online ? 'Povezano, promjene se odmah vide na svim uređajima' : 'Nema interneta'}</dd>
          </dl>
          {installEvt && <button className="btn btn-soft btn-block" onClick={async () => { installEvt.prompt(); await installEvt.userChoice; setInstallEvt(null) }}><Icon name="install" size={18} />Instaliraj kao aplikaciju</button>}
          <button className="btn btn-ghost btn-block" onClick={() => { reload(); toast.push('Osvježeno') }}>Osvježi podatke</button>
          <div className="divider" />
          <p className="muted small">Nakon odjave na ovom uređaju se ponovo traže korisnik i lozinka. Rezervacije ostaju sačuvane.</p>
          <ConfirmButton className="btn btn-danger-ghost btn-block" confirmText="Da, odjavi me" onConfirm={deactivate}><Icon name="login" size={18} />Odjavi se</ConfirmButton>
        </div>
      </Sheet>
    )
  }

  return (
    <div className="app">
      <aside className="side">
        <div className="brand"><Logo /><span><b>Motel Malena</b><small>Rezervacije</small></span></div>
        <nav className="side-nav">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'on' : ''} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}><Icon name={t.icon} />{t.label}</button>
          ))}
        </nav>
        <button className="side-device" onClick={() => setSheet({ type: 'menu' })}>
          <span className={`dot ${online ? 'on' : 'off'}`} />{device}<Icon name="menu" size={18} />
        </button>
      </aside>

      <header className="top">
        <div className="brand"><Logo /><span><b>Motel Malena</b><small>{device}</small></span></div>
        <button className="iconbtn" onClick={() => setSheet({ type: 'menu' })} aria-label="Podešavanja"><span className={`dot ${online ? 'on' : 'off'}`} /><Icon name="menu" /></button>
      </header>

      {!online && <div className="offline"><Icon name="wifi" size={18} />Nema interneta. Promjene se ne mogu sačuvati dok se veza ne vrati.</div>}

      <main className="main">
        {tab === 'danas' && <TodayView data={data} guestsById={guestsById} date={date} setDate={setDate} openRes={openRes} newRes={newRes} />}
        {tab === 'kalendar' && <CalendarView data={data} value={date} onPick={(d) => { setDate(d); setTab('danas') }} />}
        {tab === 'rezervacije' && <ReservationsView data={data} guestsById={guestsById} openRes={openRes} canExport onExport={exportCsv} />}
        {tab === 'gosti' && <GuestsView data={data} openGuest={openGuest} onDelete={deleteGuest} newGuest={() => setSheet({ type: 'guest', id: null })} />}
      </main>

      <nav className="bottom">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}><Icon name={t.icon} size={22} /><span>{t.label}</span></button>
        ))}
      </nav>

      {sheetView}
      {toast.view}
    </div>
  )
}

export function Logo() {
  return <span className="logo" aria-hidden="true"><Icon name="building" size={20} /></span>
}
