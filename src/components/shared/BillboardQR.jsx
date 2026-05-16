import { useRef } from 'react'
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'
import { Download } from 'lucide-react'
import './BillboardQR.css'

const QR_BG = '#131A2E'
const QR_FG = '#FFFFFF'

const SIZES = { preview: 80, default: 200, large: 400 }

/**
 * QR code display component with optional PNG download.
 *
 * @param {string} value - URL to encode
 * @param {number} size - pixel size (used when variant is 'default')
 * @param {string} label - optional text shown below the code
 * @param {boolean} downloadable - shows download button and hidden canvas
 * @param {'default'|'preview'|'large'} variant
 */
export default function BillboardQR({ value, size = 200, label, downloadable = false, variant = 'default' }) {
  const canvasRef = useRef(null)

  const displaySize = SIZES[variant] ?? size
  const safeValue   = value || 'https://example.com'

  function handleDownload() {
    const canvas = canvasRef.current
    if (!canvas) return
    const url  = canvas.toDataURL('image/png')
    const slug = label
      ? label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      : 'billboard-qr'
    const a    = document.createElement('a')
    a.href     = url
    a.download = `qr-${slug}.png`
    a.click()
  }

  return (
    <div className={`billboard-qr billboard-qr--${variant}`}>
      <div className="billboard-qr__wrapper">
        <QRCodeSVG
          value={safeValue}
          size={displaySize}
          bgColor={QR_BG}
          fgColor={QR_FG}
          level="H"
        />
        {downloadable && (
          <QRCodeCanvas
            ref={canvasRef}
            value={safeValue}
            size={1000}
            bgColor={QR_BG}
            fgColor={QR_FG}
            level="H"
            style={{ display: 'none' }}
          />
        )}
      </div>

      {label && <span className="billboard-qr__label">{label}</span>}

      {downloadable && (
        <button className="billboard-qr__download" type="button" onClick={handleDownload}>
          <Download size={14} />
          Download PNG
        </button>
      )}
    </div>
  )
}
