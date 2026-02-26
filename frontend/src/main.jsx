import { StrictMode } from 'react'
console.log('%c [Inphora] Build v1.0.4 - Initializing... ', 'background: #3b82f6; color: white; border-radius: 4px; padding: 2px 4px; font-weight: bold;');
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
