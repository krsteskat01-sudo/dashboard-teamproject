import { useEffect, useState } from 'react'
import { Wifi, WifiOff } from 'lucide-react'
import { createPortal } from 'react-dom'
import './NetworkStatus.css'

export default function NetworkStatus() {
  const [online,     setOnline]     = useState(navigator.onLine)
  const [showOnline, setShowOnline] = useState(false)

  useEffect(() => {
    let timer

    function handleOnline() {
      setOnline(true)
      setShowOnline(true)
      timer = setTimeout(() => setShowOnline(false), 3000)
    }

    function handleOffline() {
      clearTimeout(timer)
      setOnline(false)
      setShowOnline(false)
    }

    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearTimeout(timer)
    }
  }, [])

  const visible = !online || showOnline
  if (!visible) return null

  return createPortal(
    <div className={`ns-banner ${online ? 'ns-banner--online' : 'ns-banner--offline'}`}>
      {online ? <Wifi size={14} /> : <WifiOff size={14} />}
      <span>
        {online
          ? 'Back online!'
          : "You're offline — some features may not work."}
      </span>
    </div>,
    document.body,
  )
}
