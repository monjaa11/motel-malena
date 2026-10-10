import { useMemo, useState } from 'react'
import { ConfirmButton, Icon, RoomTag, Sheet, StatusPill } from '../ui.jsx'
import {
  addDays, fmtFull, fmtShort, fmtStamp, fullName, nightsBetween, nightsLabel, overlaps,
  personsLabel, resLabel, SOURCES, sourceLabel, STATUSES, todayISO,
} from '../lib/util.js'

// ================= NOVA / UREDI REZERVACIJU =================
export function ReservationForm({ data, guestsById, initial, onSave, onDelete, onClose }) {
  const editing = !!initial?.id
  const startIn = initial?.check_in || todayISO()
  const [f, setF] = useState(() => ({
    id: initial?.id,
    guest_id: initial?.guest_id || '',
    first_name: guestsById.get(initial?.guest_id)?.first_name || '',
    last_name: guestsById.get(initial?.guest_id)?.last_name || '',
    phone: guestsById.get(initial?.guest_id)?.phone || '',
    check_in: startIn,
    check_out: initial?.check_out || addDays(startIn, 1),
    room_id: initial?.room_id || '',
    persons: initial?.persons || 2,
    status: initial?.status || 'rezervisano',
    source: initial?.source || 'booking',
    note: initial?.note || '',
  }))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))

  const nights = f.check_in && f.check_out ? nightsBetween(f.check_in, f.check_out) : 0
  const datesOk = nights > 0

  // Promjena dolaska zadržava broj noći
  const setCheckIn = (v) => setF((x) => {
    if (!v) return { ...x, check_in: v }
    const n = x.check_in && x.check_out ? Math.max(1, nightsBetween(x.check_in, x.check_out)) : 1
    return { ...x, check_in: v, check_out: addDays(v, n) }
  })

  const busyRooms = useMemo(() => {
    const s = new Map()
    if (!datesOk) return s
    data.reservations.forEach((r) => {
      if (r.id !== f.id && r.status !== 'otkazano' && overlaps(r, f)) s.set(r.room_id, r)
    })
    return s
  }, [data.reservations, f.check_in, f.check_out, f.id, datesOk])

  const room = data.rooms.find((r) => r.id === Number(f.room_id))
  const maxPersons = room?.capacity || 3
  const roomClash = room && busyRooms.get(room.id)

  async function submit(e) {
    e.preventDefault()
    setErr('')
    if (!f.first_name.trim()) return setErr('Upišite ime gosta.')
    if (!datesOk) return setErr('Datum odlaska mora biti nakon datuma dolaska.')
    if (!room) return setErr('Odaberite sobu.')
    if (roomClash && f.status !== 'otkazano') return setErr(`Soba ${room.id} je zauzeta u tim datumima (${fullName(guestsById.get(roomClash.guest_id))}, ${fmtShort(roomClash.check_in)} – ${fmtShort(roomClash.check_out)}).`)
    setBusy(true)
    try {
      await onSave({
        ...f,
        room_id: room.id,
        persons: Math.min(Number(f.persons) || 1, room.capacity),
      })
    } catch (ex) {
      setErr(ex.message || 'Greška pri spremanju.')
      setBusy(false)
    }
  }

  return (
    <Sheet title={editing ? 'Uredi rezervaciju' : 'Nova rezervacija'} onClose={onClose} wide
      footer={
        <div className="foot-row">
          {editing && <ConfirmButton onConfirm={async () => { setBusy(true); try { await onDelete(f.id) } catch (ex) { setErr(ex.message); setBusy(false) } }}>
            <Icon name="trash" size={18} />Obriši
          </ConfirmButton>}
          <span className="grow" />
          <button type="button" className="btn btn-ghost" onClick={onClose}>Odustani</button>
          <button type="submit" form="resform" className="btn btn-primary" disabled={busy}>{busy ? 'Spremam…' : 'Sačuvaj'}</button>
        </div>
      }>
      <form id="resform" className="form" onSubmit={submit} noValidate>
        <fieldset className="fs">
          <legend>Gost</legend>
          <div className="row2">
            <Field label="Ime" id="f-first"><input id="f-first" value={f.first_name} onChange={(e) => set('first_name', e.target.value)} autoComplete="off" autoFocus={!editing && !f.guest_id} /></Field>
            <Field label="Prezime" id="f-last"><input id="f-last" value={f.last_name} onChange={(e) => set('last_name', e.target.value)} autoComplete="off" /></Field>
          </div>
          <Field label="Telefon" id="f-phone"><input id="f-phone" type="tel" inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} autoComplete="off" placeholder="+387 6x xxx xxx" /></Field>
        </fieldset>

        <fieldset className="fs">
          <legend>Boravak</legend>
          <div className="row2">
            <Field label="Datum dolaska" id="f-in"><input id="f-in" type="date" value={f.check_in} onChange={(e) => setCheckIn(e.target.value)} /></Field>
            <Field label="Datum odlaska" id="f-out"><input id="f-out" type="date" value={f.check_out} min={f.check_in ? addDays(f.check_in, 1) : undefined} onChange={(e) => set('check_out', e.target.value)} /></Field>
          </div>
          <div className={`stay ${datesOk ? '' : 'bad'}`}>
            <span>{datesOk ? <>Boravak: <b>{fmtShort(f.check_in)} — {fmtShort(f.check_out)}</b> · {nightsLabel(nights)}</> : 'Odlazak mora biti nakon dolaska'}</span>
            <span className="stay-btns">
              {[1, 2, 3, 7].map((n) => <button type="button" key={n} className={`chip chip-sm ${nights === n ? 'on' : ''}`} onClick={() => f.check_in && set('check_out', addDays(f.check_in, n))}>{nightsLabel(n)}</button>)}
            </span>
          </div>

          <div className="row2">
            <Field label="Soba" id="f-room">
              <select id="f-room" value={f.room_id} onChange={(e) => set('room_id', e.target.value)}>
                <option value="">— Odaberi —</option>
                {data.rooms.map((r) => {
                  const b = busyRooms.get(r.id)
                  return <option key={r.id} value={r.id} disabled={!!b}>Soba {r.id} ({personsLabel(r.capacity)}){b ? ' — zauzeta' : ''}</option>
                })}
              </select>
            </Field>
            <Field label="Broj osoba" id="f-persons">
              <select id="f-persons" value={Math.min(f.persons, maxPersons)} onChange={(e) => set('persons', Number(e.target.value))}>
                {Array.from({ length: maxPersons }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </Field>
          </div>
          {datesOk && <p className="muted small">Slobodno u tim datumima: {data.rooms.length - busyRooms.size} od {data.rooms.length} soba.</p>}
        </fieldset>

        <fieldset className="fs">
          <legend>Detalji</legend>
          <Field label="Status" id="f-status">
            <select id="f-status" value={f.status} onChange={(e) => set('status', e.target.value)}>
              {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </Field>
          <div className="field">
            <span className="label">Izvor</span>
            <div className="seg seg-4">
              {SOURCES.map((s) => <button type="button" key={s.id} className={f.source === s.id ? 'on' : ''} aria-pressed={f.source === s.id} onClick={() => set('source', s.id)}>{s.label}</button>)}
            </div>
          </div>
          <Field label="Napomena" id="f-note"><textarea id="f-note" rows={3} value={f.note} onChange={(e) => set('note', e.target.value)} placeholder="Npr. dolazi kasno, avans, parking…" /></Field>
        </fieldset>

        {err && <div className="err" role="alert">{err}</div>}
      </form>
    </Sheet>
  )
}

function Field({ label, id, children }) {
  return <div className="field"><label className="label" htmlFor={id}>{label}</label>{children}</div>
}

// ================= DETALJI REZERVACIJE =================
export function ReservationDetail({ res, guest, onEdit, onDelete, onStatus, onOpenGuest, onClose }) {
  const [busy, setBusy] = useState(false)
  const n = nightsBetween(res.check_in, res.check_out)
  const quick = res.status === 'rezervisano' || res.status === 'potvrdjeno' ? { to: 'prijavljen', label: 'Prijavi gosta' }
    : res.status === 'prijavljen' ? { to: 'odjavljen', label: 'Odjavi gosta' } : null
  const run = async (fn) => { setBusy(true); try { await fn() } finally { setBusy(false) } }

  return (
    <Sheet title="Rezervacija" onClose={onClose}
      footer={
        <div className="foot-row">
          <ConfirmButton onConfirm={() => run(() => onDelete(res.id))} disabled={busy}><Icon name="trash" size={18} />Obriši</ConfirmButton>
          <span className="grow" />
          <button className="btn btn-primary" onClick={onEdit}><Icon name="edit" size={18} />Uredi</button>
        </div>
      }>
      <div className="detail">
        <div className="detail-hero">
          <RoomTag id={res.room_id} size="lg" />
          <div className="grow">
            <button className="linkish detail-name" onClick={onOpenGuest}>{fullName(guest)}</button>
            <div className="detail-dates">{fmtShort(res.check_in)} — {fmtShort(res.check_out)} · {nightsLabel(n)}</div>
          </div>
          <StatusPill status={res.status} />
        </div>

        {quick && <button className="btn btn-soft btn-block" disabled={busy} onClick={() => run(() => onStatus(quick.to))}><Icon name="check" size={18} />{quick.label}</button>}

        <dl className="kv">
          <dt>Telefon</dt>
          <dd>{guest?.phone ? <a className="mono" href={`tel:${guest.phone.replace(/\s/g, '')}`}><Icon name="phone" size={16} /> {guest.phone}</a> : <span className="muted">nije upisan</span>}</dd>
          <dt>Dolazak</dt><dd>{fmtFull(res.check_in)}</dd>
          <dt>Odlazak</dt><dd>{fmtFull(res.check_out)}</dd>
          <dt>Soba</dt><dd>Soba {res.room_id}</dd>
          <dt>Broj osoba</dt><dd>{personsLabel(res.persons)}</dd>
          <dt>Izvor</dt><dd><span className={`src src-${res.source}`}>{sourceLabel(res.source)}</span></dd>
          <dt>Napomena</dt><dd className="pre">{res.note || <span className="muted">—</span>}</dd>
        </dl>

        <div className="field">
          <span className="label">Promijeni status</span>
          <div className="chips">
            {STATUSES.map((s) => (
              <button key={s.id} className={`chip st-chip st-${s.id} ${res.status === s.id ? 'on' : ''}`} disabled={busy || res.status === s.id}
                onClick={() => run(() => onStatus(s.id))}>{s.label}</button>
            ))}
          </div>
        </div>

        <p className="meta">
          Unio: <b>{res.created_by || '—'}</b>, {fmtStamp(res.created_at)}
          {res.updated_by && <><br />Zadnja izmjena: <b>{res.updated_by}</b>, {fmtStamp(res.updated_at)}</>}
        </p>
      </div>
    </Sheet>
  )
}

// ================= GOST =================
export function GuestDetail({ guest, reservations, onSave, onDelete, onOpenRes, onNewRes, onClose }) {
  const [edit, setEdit] = useState(!guest?.id)
  const [g, setG] = useState({ id: guest?.id, first_name: guest?.first_name || '', last_name: guest?.last_name || '', phone: guest?.phone || '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const mine = reservations.filter((r) => r.guest_id === guest?.id).sort((a, b) => b.check_in.localeCompare(a.check_in))

  async function save(e) {
    e.preventDefault()
    if (!g.first_name.trim()) return setErr('Upišite ime.')
    setBusy(true); setErr('')
    try { await onSave(g); if (g.id) setEdit(false) } catch (ex) { setErr(ex.message) } finally { setBusy(false) }
  }

  return (
    <Sheet title={guest?.id ? 'Gost' : 'Novi gost'} onClose={onClose}
      footer={edit ? (
        <div className="foot-row" key="edit">
          <span className="grow" />
          {guest?.id && <button type="button" key="cancel" className="btn btn-ghost" onClick={() => setEdit(false)}>Odustani</button>}
          <button type="submit" key="save" form="guestform" className="btn btn-primary" disabled={busy}>Sačuvaj</button>
        </div>
      ) : (
        <div className="foot-row" key="view">
          <ConfirmButton confirmText={mine.length ? `Obrisati gosta i ${resLabel(mine.length)}?` : 'Sigurno obrisati?'} onConfirm={() => onDelete(guest.id)}><Icon name="trash" size={18} />Obriši gosta</ConfirmButton>
          <span className="grow" />
          <button type="button" key="edit" className="btn btn-ghost" onClick={() => setEdit(true)}><Icon name="edit" size={18} />Uredi</button>
          <button type="button" key="newres" className="btn btn-primary" onClick={onNewRes}><Icon name="plus" size={18} />Nova rezervacija</button>
        </div>
      )}>
      {edit ? (
        <form id="guestform" className="form" onSubmit={save}>
          <div className="row2">
            <Field label="Ime" id="g-first"><input id="g-first" value={g.first_name} onChange={(e) => setG({ ...g, first_name: e.target.value })} autoFocus /></Field>
            <Field label="Prezime" id="g-last"><input id="g-last" value={g.last_name} onChange={(e) => setG({ ...g, last_name: e.target.value })} /></Field>
          </div>
          <Field label="Telefon" id="g-phone"><input id="g-phone" type="tel" inputMode="tel" value={g.phone} onChange={(e) => setG({ ...g, phone: e.target.value })} /></Field>
        </form>
      ) : (
        <div className="detail">
          <div className="detail-hero">
            <span className="avatar avatar-lg">{(guest.first_name[0] || '') + (guest.last_name[0] || '')}</span>
            <div className="grow">
              <div className="detail-name">{fullName(guest)}</div>
              {guest.phone ? <a className="mono" href={`tel:${guest.phone.replace(/\s/g, '')}`}><Icon name="phone" size={16} /> {guest.phone}</a> : <span className="muted">bez telefona</span>}
            </div>
          </div>
          <h3 className="subhead">Boravci ({mine.length})</h3>
          {mine.length === 0 ? <p className="muted">Gost nema rezervacija.</p> : (
            <ul className="reslist">
              {mine.map((r) => (
                <li key={r.id}>
                  <button className="resrow" onClick={() => onOpenRes(r.id)}>
                    <RoomTag id={r.room_id} />
                    <span className="resrow-main">
                      <span className="resrow-name">{fmtShort(r.check_in)} – {fmtFull(r.check_out)}</span>
                      <span className="resrow-meta">{nightsLabel(nightsBetween(r.check_in, r.check_out))} · {personsLabel(r.persons)} · {sourceLabel(r.source)}</span>
                    </span>
                    <StatusPill status={r.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {err && <div className="err" role="alert">{err}</div>}
    </Sheet>
  )
}

// ================= PRIJAVA (samo jednom po uređaju) =================
export function Activation({ users, onActivate }) {
  const [pin, setPin] = useState('')
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function go(e) {
    e.preventDefault()
    if (!name) return setErr('Odaberite korisnika.')
    if (!pin.trim()) return setErr('Upišite lozinku.')
    setBusy(true); setErr('')
    try { await onActivate(pin, name) } catch (ex) { setErr(ex.message); setBusy(false) }
  }

  return (
    <div className="activate">
      <form className="activate-card" onSubmit={go}>
        <div className="brand brand-lg"><span className="logo" aria-hidden="true"><Icon name="building" size={24} /></span><span><b>Motel Malena</b><small>Rezervacije</small></span></div>
        <h1>Prijava</h1>
        <p className="muted">Prijava se radi samo jednom na ovom uređaju. Poslije se aplikacija otvara odmah.</p>

        <div className="field">
          <span className="label">Korisnik</span>
          <div className="seg seg-3">
            {users.map((u) => <button type="button" key={u.name} className={name === u.name ? 'on' : ''} aria-pressed={name === u.name} onClick={() => setName(u.name)}>{u.name}</button>)}
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="a-pin">Lozinka</label>
          <input id="a-pin" className="codeinput" type="password" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} inputMode="numeric" autoComplete="off" maxLength={8} placeholder="••••" />
        </div>

        {err && <div className="err" role="alert">{err}</div>}
        <button className="btn btn-primary btn-block btn-lg" disabled={busy}>{busy ? 'Provjeravam…' : 'Prijavi se'}</button>
      </form>
    </div>
  )
}
