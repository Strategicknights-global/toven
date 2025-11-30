import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// --- ADD THESE LINES ---
// This loads the base font (weight 400)
// @ts-ignore: suppress missing type declarations for font CSS package
import '@fontsource/poppins';
import '@fontsource/poppins/700.css';
// -----------------------

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)