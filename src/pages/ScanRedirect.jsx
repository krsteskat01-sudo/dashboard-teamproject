import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { recordPublicScan } from '../firebase/publicScans'
import { getScanMetadata } from '../utils/deviceDetection'
import Logo from '../components/ui/Logo'
import './ScanRedirect.css'

const REDIRECT_URL  = 'https://next.edu.mk/'
const MAX_WAIT_MS   = 5000   // safety cap — always redirect within 5 s
const SHOW_DONE_MS  = 700    // show checkmark briefly before redirecting

export default function ScanRedirect() {
  const { billboardId } = useParams()
  const [status, setStatus] = useState('loading')  // 'loading' | 'done' | 'error'
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    let didRedirect = false

    function redirect() {
      if (!didRedirect) {
        didRedirect = true
        window.location.href = REDIRECT_URL
      }
    }

    // Safety cap — never leave the user waiting more than 5 s
    const safetyTimer = setTimeout(redirect, MAX_WAIT_MS)

    async function run() {
      try {
        const metadata = getScanMetadata()
        const result   = await recordPublicScan(billboardId, metadata)

        if (result.success) {
          setStatus('done')
        } else {
          setStatus('error')
          setErrorMsg(result.error ?? 'Unknown error')
          console.error('[ScanRedirect] recordPublicScan failed:', result.error)
        }
      } catch (err) {
        setStatus('error')
        setErrorMsg(err?.message ?? String(err))
        console.error('[ScanRedirect] unexpected error:', err)
      }

      // Writes finished — wait briefly to show result, then redirect
      await new Promise(r => setTimeout(r, SHOW_DONE_MS))
      clearTimeout(safetyTimer)
      redirect()
    }

    run()

    return () => {
      didRedirect = true      // stop redirect if component unmounts early
      clearTimeout(safetyTimer)
    }
  }, [billboardId])

  return (
    <div className="scan-page">
      <motion.div
        className="scan-card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <div className="scan-logo">
          <Logo variant="white" size={36} />
        </div>

        <AnimatePresence mode="wait">
          {status === 'loading' && (
            <motion.div
              key="loading"
              className="scan-icon-wrap"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{    opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <Loader2 className="scan-spinner" size={40} />
            </motion.div>
          )}

          {status === 'done' && (
            <motion.div
              key="done"
              className="scan-icon-wrap"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{    opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <CheckCircle2 className="scan-check" size={40} />
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div
              key="error"
              className="scan-icon-wrap"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{    opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <XCircle className="scan-error-icon" size={40} />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.p
          className="scan-message"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {status === 'loading' && 'Recording your scan…'}
          {status === 'done'    && 'Thanks for scanning!'}
          {status === 'error'   && 'Scan error'}
        </motion.p>

        {status === 'error' && errorMsg && (
          <motion.p
            className="scan-error-detail"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {errorMsg}
          </motion.p>
        )}

        <motion.p
          className="scan-sub"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          Redirecting you now…
        </motion.p>
      </motion.div>
    </div>
  )
}
