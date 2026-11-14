import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles.css'
import App from './App'
import { LiveProvider } from './live'
import { PaletteProvider } from './palette'
import { PinsProvider } from './pins'
import { ThemeProvider } from './theme'

const container = document.getElementById('root')
if (!container) throw new Error('Missing #root element')

createRoot(container).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <LiveProvider>
          <PaletteProvider>
            <PinsProvider>
              <App />
            </PinsProvider>
          </PaletteProvider>
        </LiveProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
