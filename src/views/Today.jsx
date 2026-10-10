import { useMemo, useState } from 'react'
import { Icon, RoomTag, StatusPill, Sheet } from '../ui.jsx'
import {
  addDays, DAYS_SHORT, fmtDayMonth, fmtLong, fmtMonthTitle, fmtShort, fullName,
  nightsBetween, nightsLabel, personsLabel, toISO, todayISO,
} from '../lib/util.js'

const active = (r) => r.status !== 'otkazano'

// ================= DANAS =================
export function TodayView({ data, guestsById, date, setDate, openRes, newRes }) {
  const [calOpen, setCalOpen] = useState(false)
  const today = todayISO()
  const { rooms, reservations } = data

  const { rows, arrivals, departures, occupied } = useMemo(() => {
    const act = reservations.filter(active)
    const rows = act
      .filter((r) => r.check_in <= date && r.check_out >= date)
      .map((r) => ({ r, kind: r.check_in === date ? 'in' : r.check_out === date ? 'out' : 'stay' }))
      .sort((a, b) => ({ in: 0, stay: 1, out: 2 }[a.kind] - { in: 0, stay: 1, out: 2 }[b.kind]) || a.r.room_id - b.r.room_id)
    return {
      rows,
      arrivals: rows.filter((x) => x.kind === 'in').length,
      departures: rows.filter((x) => x.kind === 'out').length,
      occupied: new Set(act.filter((r) => r.check_in <= date && r.check_out > date).map((r) => r.room_id)).size,
    }
  }, [reservations, date])

  const badge = date === today ? 'Današnji dan' : date === addDays(today, 1) ? 'Sutra' : date === addDays(today, -1) ? 'Jučer' : null

  return (
    <div className="view">
      <div className="pagehead">
        <div className="eyebrow">Motel Malena</div>
        <h1>{fmtLong(date)}</h1>
        {badge && <span className={`badge ${date === today ? 'badge-green' : ''}`}>{badge}</span>}
      </div>

      <div className="actions">
        <div className="btnrow">
          <button className="btn btn-outline" onClick={() => setDate(addDays(date, -1))}><Icon name="left" size={18} /><span className="hide-sm">Prethodni dan</span></button>
          <button className="btn btn-outline" onClick={() => setDate(today)} disabled={date === today}>Danas</button>
          <button className="btn btn-outline" onClick={() => setDate(addDays(date, 1))}><span className="hide-sm">Sljedeći dan</span><Icon name="right" size={18} /></button>
          <button className="btn btn-outline" onClick={() => setCalOpen(true)}><Icon name="cal" size={18} />Kalendar</button>
        </div>
        <button className="btn btn-primary" onClick={() => newRes()}><Icon name="plus" size={18} />Nova rezervacija</button>
      </div>

      <div className="stats">
        <Stat icon="in" tone="blue" label={date === today ? 'Dolasci danas' : 'Dolasci'} n={arrivals} />
        <Stat icon="out" tone="amber" label={date === today ? 'Odlasci danas' : 'Odlasci'} n={departures} />
        <Stat icon="bed" tone="gray" label="Zauzeto" n={occupied} />
        <Stat icon="trend" tone="green" label="Slobodno" n={rooms.length - occupied} />
      </div>

      {rows.length === 0 ? (
        <div className="emptybox">
          <p>Nema rezervacija za ovaj dan.</p>
          <button className="linkbtn" onClick={() => newRes()}>Dodaj prvu rezervaciju</button>
        </div>
      ) : (
        <div className="card">
          <div className="card-head"><h3>Rezervacije za ovaj dan</h3><span className="count">{rows.length}</span></div>
          <ul className="daylist">
            {rows.map(({ r, kind }) => {
              const g = guestsById.get(r.guest_id)
              return (
                <li key={r.id}>
                  <button className="dayrow" onClick={() => openRes(r.id)}>
                    <RoomTag id={r.room_id} />
                    <span className="dayrow-main">
                      <span className="dayrow-name">{fullName(g)}</span>
                      <span className="dayrow-meta">{fmtShort(r.check_in)} – {fmtShort(r.check_out)} · {nightsLabel(nightsBetween(r.check_in, r.check_out))} · {personsLabel(r.persons)}</span>
                    </span>
                    <span className="dayrow-tags">
                      <span className={`kind kind-${kind}`}>{kind === 'in' ? 'Dolazak' : kind === 'out' ? 'Odlazak' : 'Boravi'}</span>
                      <StatusPill status={r.status} />
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {calOpen && (
        <Sheet title="Odaberite datum" onClose={() => setCalOpen(false)}>
          <MonthGrid value={date} reservations={reservations} roomCount={rooms.length} onPick={(d) => { setDate(d); setCalOpen(false) }} compact />
        </Sheet>
      )}
    </div>
  )
}

function Stat({ icon, tone, label, n }) {
  return (
    <div className="stat">
      <span className={`stat-ic tone-${tone}`}><Icon name={icon} size={20} /></span>
      <span className="stat-txt"><span className="stat-l">{label}</span><span className="stat-n">{n}</span></span>
    </div>
  )
}

// ================= KALENDAR (stranica) =================
export function CalendarView({ data, value, onPick }) {
  return (
    <div className="view">
      <div className="pagehead">
        <div className="eyebrow">Motel Malena</div>
        <h1>Kalendar</h1>
      </div>
      <div className="card card-pad">
        <MonthGrid value={value} reservations={data.reservations} roomCount={data.rooms.length} onPick={onPick} />
      </div>
    </div>
  )
}

export function MonthGrid({ value, reservations, roomCount, onPick, compact }) {
  const v = new Date(value + 'T00:00:00')
  const [ym, setYm] = useState({ y: v.getFullYear(), m: v.getMonth() })
  const today = todayISO()

  const cells = useMemo(() => {
    const first = new Date(ym.y, ym.m, 1)
    const offset = (first.getDay() + 6) % 7 // ponedjeljak prvi
    const days = new Date(ym.y, ym.m + 1, 0).getDate()
    const out = []
    for (let i = 0; i < offset; i++) out.push(null)
    for (let d = 1; d <= days; d++) out.push(toISO(new Date(ym.y, ym.m, d)))
    return out
  }, [ym])

  const info = useMemo(() => {
    const m = new Map()
    const act = reservations.filter(active)
    cells.forEach((d) => {
      if (!d) return
      m.set(d, {
        busy: act.filter((r) => r.check_in <= d && r.check_out > d).length,
        arr: act.filter((r) => r.check_in === d).length,
      })
    })
    return m
  }, [cells, reservations])

  const move = (n) => setYm(({ y, m }) => { const d = new Date(y, m + n, 1); return { y: d.getFullYear(), m: d.getMonth() } })

  return (
    <div className={`cal ${compact ? 'cal-compact' : ''}`}>
      <div className="cal-head">
        <button className="btn btn-outline btn-icon" onClick={() => move(-1)} aria-label="Prethodni mjesec"><Icon name="left" size={18} /></button>
        <strong>{fmtMonthTitle(ym.y, ym.m)}</strong>
        <button className="btn btn-outline btn-icon" onClick={() => move(1)} aria-label="Sljedeći mjesec"><Icon name="right" size={18} /></button>
      </div>
      <div className="cal-grid">
        {DAYS_SHORT.map((d) => <div key={d} className="cal-dow">{d}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />
          const x = info.get(d)
          return (
            <button key={d} className={`cal-day ${d === value ? 'sel' : ''} ${d === today ? 'today' : ''}`} onClick={() => onPick(d)}
              aria-label={`${fmtDayMonth(d)}: zauzeto ${x.busy} od ${roomCount} soba`}>
              <span className="cal-num">{Number(d.slice(8))}</span>
              {x.busy > 0 ? <span className="cal-occ">{x.busy}/{roomCount}</span> : <span className="cal-occ cal-occ-empty">–</span>}
              {!compact && x.arr > 0 && <span className="cal-arr">{x.arr} dolaz.</span>}
            </button>
          )
        })}
      </div>
      <p className="muted small">Broj ispod datuma pokazuje koliko je soba zauzeto te noći. Kliknite dan da otvorite njegove rezervacije.</p>
    </div>
  )
}
