import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
/* Tipografia da marca: Open Sauce Sans (texto, conforme manual) + Fraunces (títulos; substituta livre da Argent) */
import '@fontsource/open-sauce-sans/400.css'
import '@fontsource/open-sauce-sans/500.css'
import '@fontsource/open-sauce-sans/600.css'
import '@fontsource/open-sauce-sans/700.css'
import '@fontsource-variable/fraunces/wght.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
