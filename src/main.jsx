import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

createRoot(document.getElementById('root')).render(<App />)

// Offline keš i "instaliraj aplikaciju" (samo na pravoj adresi, ne u pregledu)
if (import.meta.env.PROD && 'serviceWorker' in navigator && window.self === window.top && import.meta.env.MODE !== 'preview') {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}) })
}
