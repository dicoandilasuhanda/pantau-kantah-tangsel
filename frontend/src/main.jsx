import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { registerPwaServiceWorker } from './utils/pwa.js'

// Tandai bahwa bootstrap React berhasil dijalankan
window.__APP_MOUNTED__ = true;
registerPwaServiceWorker();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)
