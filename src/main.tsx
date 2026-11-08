import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './styles.css'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('root element missing')

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    {/* HashRouter keeps deep links working on static hosts without rewrite rules. */}
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
