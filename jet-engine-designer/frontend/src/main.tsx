import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './themes/palette-blueprint.css'  // ← change this import to swap palettes
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
