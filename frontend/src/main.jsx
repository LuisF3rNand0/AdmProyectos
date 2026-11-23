import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import axios from 'axios'

// Las llamadas /api/* usan el backend publicado en Render.
// En desarrollo local, Vite mantiene su proxy configurado.
axios.defaults.baseURL = import.meta.env.VITE_API_URL || ''
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
