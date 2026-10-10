import { useMemo, useState } from 'react'
import { ConfirmButton, Empty, Icon, RoomTag, SearchBox, StatusPill } from '../ui.jsx'
import {
  fmtFull, fmtMonthTitle, fmtShort, fullName, lsGet, lsSet, nightsBetween, nightsLabel, norm,
  guestsLabel, parseISO, personsLabel, resLabel, sourceLabel, statusLabel, todayISO,
} from '../lib/util.js'

// ================= REZERVACIJE =================
const FILTERS = [
  { id: 'up', label: 'Predstojeće i trenutne' },
  { id: 'past', label: 'Prošle' },
  { id: 'cancel', label: 'Otkazane' },
  { id: 'all', label: 'Sve' },
]

export function ReservationsView({ data, guestsById, openRes, canExport, onExport }) {
  const [filter, setFilterRaw] = useState(() => lsGet('mm-res-filter') || 'up')
  const setFilter = (f) => { setFilterRaw(f); lsSet('mm-res-filter', f) }
  const [q, setQ] = useState('')
  const today = todayISO()

  const list = useMemo(() => {
    const nq = norm(q)
    let xs = data.reservations.filter((r) => {
      if (filter === 'up') return r.status !== 'otkazano' && r.check_out >= today
      if (filter === 'past') return r.status !== 'otkazano' && r.check_out < today
      if (filter === 'cancel') return r.status === 'otkazano'
      return true
    })
    if (nq) {
      xs = xs.filter((r) => {
        const g = guestsById.get(r.guest_id)
        const hay = norm(`${g?.first_name} ${g?.last_name} ${g?.last_name} ${g?.first_name} ${g?.phone} soba ${r.room_id} ${r.note}`)
        return nq.split(/\s+/).every((w) => hay.includes(w)) || (g?.phone || '').replace(/\D/g, '').includes(q.replace(/\D/g, '') || '§')
      })
    }
    const asc = filter === 'up'
    xs.sort((a, b) => (asc ? 1 : -1) * (a.check_in.localeCompare(b.check_in) || a.room_id - b.room_id))
    return xs
  }, [data.reservations, guestsById, filter, q, today])

  const groups = useMemo(() => {
    const out = []
    list.forEach((r) => {
      const d = parseISO(r.check_in)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (!out.length || out[out.length - 1].key !== key) out.push({ key, title: fmtMonthTitle(d.getFullYear(), d.getMonth()), items: [] })
      out[out.length - 1].items.push(r)
    })
    return out
  }, [list])

  return (
    <div className="view">
      <div className="viewhead">
        <h1>Rezervacije</h1>
        {canExport && <button className="btn btn-ghost" onClick={onExport}><Icon name="download" size={18} />Izvoz u Excel</button>}
      </div>
      <div className="toolbar">
        <SearchBox id="res-search" value={q} onChange={setQ} placeholder="Traži po imenu, telefonu ili broju sobe" />
        <div className="chips" role="tablist">
          {FILTERS.map((f) => (
            <button key={f.id} role="tab" aria-selected={filter === f.id} className={`chip ${filter === f.id ? 'on' : ''}`} onClick={() => setFilter(f.id)}>{f.label}</button>
          ))}
        </div>
      </div>
      <p className="muted small">{resLabel(list.length)}</p>
      {list.length === 0 ? <Empty title="Nema rezervacija">{q ? 'Ništa ne odgovara pretrazi.' : 'Ovdje će se pojaviti rezervacije.'}</Empty> : groups.map((grp) => (
        <section className="block" key={grp.key}>
          <div className="block-head"><h3>{grp.title}</h3><span className="count">{grp.items.length}</span></div>
          <ul className="cards">
            {grp.items.map((r) => {
              const g = guestsById.get(r.guest_id)
              const n = nightsBetween(r.check_in, r.check_out)
              return (
                <li key={r.id}>
                  <button className={`rescard ${r.status === 'otkazano' ? 'is-cancel' : ''}`} onClick={() => openRes(r.id)}>
                    <RoomTag id={r.room_id} />
                    <span className="rescard-main">
                      <span className="rescard-name">{fullName(g)}</span>
                      <span className="rescard-dates">{fmtShort(r.check_in)} – {fmtShort(r.check_out)} · {nightsLabel(n)} · {personsLabel(r.persons)}</span>
                      <span className="rescard-sub">
                        {g?.phone && <span className="mono">{g.phone}</span>}
                        <span className={`src src-${r.source}`}>{sourceLabel(r.source)}</span>
                      </span>
                      {r.note && <span className="rescard-note">{r.note}</span>}
                    </span>
                    <StatusPill status={r.status} />
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}

// ================= GOSTI =================
export function GuestsView({ data, openGuest, newGuest, onDelete }) {
  const [q, setQ] = useState('')
  const stats = useMemo(() => {
    const m = new Map()
    data.reservations.forEach((r) => {
      if (r.status === 'otkazano') return
      const s = m.get(r.guest_id) || { n: 0, last: '' }
      s.n++; if (r.check_in > s.last) s.last = r.check_in
      m.set(r.guest_id, s)
    })
    return m
  }, [data.reservations])

  const list = useMemo(() => {
    const nq = norm(q)
    let xs = data.guests
    if (nq) {
      xs = xs.filter((g) => {
        const hay = norm(`${g.first_name} ${g.last_name} ${g.last_name} ${g.first_name} ${g.phone}`)
        return nq.split(/\s+/).every((w) => hay.includes(w))
      })
    }
    return [...xs].sort((a, b) => a.last_name.localeCompare(b.last_name, 'bs') || a.first_name.localeCompare(b.first_name, 'bs'))
  }, [data.guests, q])

  return (
    <div className="view">
      <div className="viewhead">
        <h1>Gosti</h1>
        <button className="btn btn-ghost" onClick={newGuest}><Icon name="plus" size={18} />Novi gost</button>
      </div>
      <div className="toolbar">
        <SearchBox id="guest-search" value={q} onChange={setQ} placeholder="Upišite ime ili prezime gosta" />
      </div>
      <p className="muted small">{list.length} od {guestsLabel(data.guests.length)}</p>
      {list.length === 0 ? <Empty title="Nema gostiju">{q ? `Nema gosta „${q}“.` : 'Gosti se dodaju automatski kad unesete rezervaciju.'}</Empty> : (
        <ul className="guestlist">
          {list.map((g) => {
            const s = stats.get(g.id)
            return (
              <li key={g.id} className="guestli">
                <button className="guestrow" onClick={() => openGuest(g.id)}>
                  <span className="avatar" aria-hidden="true">{(g.first_name[0] || '') + (g.last_name[0] || '')}</span>
                  <span className="guestrow-main">
                    <span className="guestrow-name"><b>{g.last_name}</b> {g.first_name}</span>
                    <span className="guestrow-meta mono">{g.phone || 'bez telefona'}</span>
                  </span>
                  <span className="guestrow-stay">
                    {s ? <><b>{s.n}×</b><span>zadnji dolazak {fmtFull(s.last)}</span></> : <span>bez boravaka</span>}
                  </span>
                </button>
                <span className="guestdel">
                  <ConfirmButton className="iconbtn iconbtn-danger" confirmText="Obriši" onConfirm={() => onDelete(g.id)}>
                    <Icon name="trash" size={18} /><span className="sr">Obriši gosta {g.first_name} {g.last_name}</span>
                  </ConfirmButton>
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ================= IZVOZ (CSV koji Excel otvara) =================
export function buildCsv(data, guestsById) {
  const esc = (v) => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  const head = ['Soba', 'Ime', 'Prezime', 'Telefon', 'Dolazak', 'Odlazak', 'Noći', 'Osoba', 'Status', 'Izvor', 'Napomena', 'Unio', 'Uneseno']
  const rows = [...data.reservations].sort((a, b) => a.check_in.localeCompare(b.check_in)).map((r) => {
    const g = guestsById.get(r.guest_id) || {}
    return [r.room_id, g.first_name, g.last_name, g.phone, fmtFull(r.check_in), fmtFull(r.check_out), nightsBetween(r.check_in, r.check_out),
      r.persons, statusLabel(r.status), sourceLabel(r.source), r.note, r.created_by, (r.created_at || '').slice(0, 10)]
  })
  return '﻿' + [head, ...rows].map((row) => row.map(esc).join(';')).join('\r\n')
}
