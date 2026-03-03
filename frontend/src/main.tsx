import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import SovereignErrorBoundary from './SovereignErrorBoundary.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SovereignErrorBoundary>
      <App />
    </SovereignErrorBoundary>
  </StrictMode>,
)
