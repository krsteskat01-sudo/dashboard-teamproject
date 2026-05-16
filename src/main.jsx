import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { PreferencesProvider } from './contexts/PreferencesContext'
import { ToastProvider } from './components/ui'
import 'leaflet/dist/leaflet.css'
import './styles/global.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <PreferencesProvider>
        <ToastProvider position="top-right" maxToasts={5}>
          <App />
        </ToastProvider>
      </PreferencesProvider>
    </AuthProvider>
  </BrowserRouter>,
)