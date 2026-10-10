import { useCallback, useEffect, useRef, useState } from 'react'
import { statusLabel } from './lib/util.js'

// ---------- Ikone ----------
const P = {
  left: 'M15 18l-6-6 6-6',
  right: 'M9 18l6-6-6-6',
  cal: 'M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a1 1 0 01-1 1A16 16 0 014 5a1 1 0 011-1z',
  x: 'M6 6l12 12M18 6L6 18',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 001 1h8a1 1 0 001-1l1-12M9 7V4h6v3',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4',
  today: 'M4 6h16M4 12h16M4 18h10',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  users: 'M16 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM21 20v-1a4 4 0 00-3-3.87M16 4.13a4 4 0 010 7.75',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  menu: 'M4 7h16M4 12h16M4 17h16',
  check: 'M5 12l5 5L20 7',
  copy: 'M9 9h10v11H9zM5 15V4h10',
  login: 'M10 17l5-5-5-5M15 12H3M14 4h5a1 1 0 011 1v14a1 1 0 01-1 1h-5',
  wifi: 'M2 2l20 20M8.5 16.5a5 5 0 017 0M5 13a10 10 0 015.17-2.8M19 13a10 10 0 00-2.5-1.8M12 20h.01',
  install: 'M12 3v12M7 10l5 5 5-5M4 17v3h16v-3',
  in: 'M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3',
  out: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
  bed: 'M2 4v16M2 8h18a2 2 0 012 2v10M2 17h20M6 8v9',
  trend: 'M22 7l-8.5 8.5-5-5L2 17M16 7h6v6',
  building: 'M6 22V4a2 2 0 012-2h8a2 2 0 012 2v18zM6 12H4a2 2 0 00-2 2v6a2 2 0 002 2h2M18 9h2a2 2 0 012 2v9a2 2 0 01-2 2h-2M10 6h4M10 10h4M10 14h4M10 18h4',
  calday: 'M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1zM8 13h3v3H8z',
  checklist: 'M11 6h10M11 12h10M11 18h10M3 6l1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17',
}
export function Icon({ name, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="icon">
      <path d={P[name]} />
    </svg>
  )
}

// Broj sobe kao privjesak za ključ
export function RoomTag({ id, size = 'md' }) {
  return <span className={`roomtag roomtag-${size}`} aria-label={`Soba ${id}`}><small>Soba</small>{id}</span>
}

export function StatusPill({ status }) {
  return <span className={`pill st-${status}`}>{statusLabel(status)}</span>
}

// ---------- Panel (na telefonu odozdo, na računaru u sredini) ----------
export function Sheet({ title, onClose, children, footer, wide }) {
  const ref = useRef(null)
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])
  return (
    <div className="sheet-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`sheet ${wide ? 'sheet-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="iconbtn" onClick={onClose} aria-label="Zatvori"><Icon name="x" /></button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  )
}

// Dugme koje traži potvrdu drugim klikom (bez iskačućih prozora)
export function ConfirmButton({ children, confirmText = 'Sigurno obrisati?', onConfirm, className = 'btn btn-danger-ghost', disabled }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 4000); return () => clearTimeout(t) }, [armed])
  return armed ? (
    <span className="confirm-row">
      <button type="button" className="btn btn-danger" onClick={() => { setArmed(false); onConfirm() }} disabled={disabled}>{confirmText}</button>
      <button type="button" className="btn btn-ghost" onClick={() => setArmed(false)}>Ne</button>
    </span>
  ) : (
    <button type="button" className={className} onClick={() => setArmed(true)} disabled={disabled}>{children}</button>
  )
}

// ---------- Obavještenja ----------
export function useToast() {
  const [items, setItems] = useState([])
  const push = useCallback((text, kind = 'ok') => {
    const id = Math.random()
    setItems((x) => [...x, { id, text, kind }])
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), kind === 'err' ? 6000 : 2600)
  }, [])
  const view = (
    <div className="toasts" role="status" aria-live="polite">
      {items.map((t) => <div key={t.id} className={`toast toast-${t.kind}`}>{t.kind === 'ok' && <Icon name="check" size={18} />}{t.text}</div>)}
    </div>
  )
  return { push, view }
}

export function useOnline() {
  const [on, setOn] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  useEffect(() => {
    const a = () => setOn(true), b = () => setOn(false)
    window.addEventListener('online', a); window.addEventListener('offline', b)
    return () => { window.removeEventListener('online', a); window.removeEventListener('offline', b) }
  }, [])
  return on
}

export function SearchBox({ value, onChange, placeholder, id }) {
  return (
    <label className="search">
      <Icon name="search" size={18} />
      <input id={id} type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete="off" />
      {value && <button className="search-clear" onClick={() => onChange('')} aria-label="Obriši pretragu"><Icon name="x" size={16} /></button>}
    </label>
  )
}

export function Empty({ title, children }) {
  return <div className="empty"><strong>{title}</strong>{children && <span>{children}</span>}</div>
}
