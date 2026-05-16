import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { MapPin } from 'lucide-react'
import '../../utils/leafletConfig.js'

// ── Custom marker icon factory ────────────────────────────────────────────────

function markerSize(scans) {
  if (!scans || scans === 0) return 32
  return Math.min(32 + Math.log10(scans + 1) * 8, 56)
}

function createBillboardIcon(billboard) {
  const size  = markerSize(billboard.totalScans ?? 0)
  const color = billboard.isActive ? '#2F64FF' : '#475569'
  const count = billboard.totalScans ?? 0
  const label = count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count)

  const html = `
    <div style="
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.85);
      box-shadow: 0 2px 8px rgba(0,0,0,0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: Raleway, sans-serif;
      font-size: ${size < 40 ? 10 : 12}px;
      font-weight: 700;
      color: #fff;
      cursor: pointer;
      transition: transform 0.15s ease;
    ">${label}</div>
  `

  return L.divIcon({
    html,
    className: 'billboard-map-marker',
    iconSize:    [size, size],
    iconAnchor:  [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  })
}

// ── Auto-fit bounds helper ────────────────────────────────────────────────────

function FitBounds({ billboards }) {
  const map = useMap()

  useEffect(() => {
    const pins = billboards.filter(b => b.coordinates?.lat && b.coordinates?.lng)
    if (pins.length === 0) return

    if (pins.length === 1) {
      map.setView([pins[0].coordinates.lat, pins[0].coordinates.lng], 14)
      return
    }

    const bounds = L.latLngBounds(
      pins.map(b => [b.coordinates.lat, b.coordinates.lng])
    )
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
  }, [billboards, map])

  return null
}

// ── Main component ────────────────────────────────────────────────────────────

const DEFAULT_CENTER = [41.9981, 21.4254]  // Skopje
const DEFAULT_ZOOM   = 12
const TILE_URL       = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_ATTR      = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

/**
 * @param {Object}   props
 * @param {Array}    props.billboards        - billboard docs (with coordinates)
 * @param {number}   [props.height=480]      - map container height in px
 * @param {Function} [props.onMarkerClick]   - called with billboard when marker/popup button clicked
 * @param {boolean}  [props.mini=false]      - compact mode (no zoom controls, simple popups)
 */
export default function BillboardsMap({ billboards = [], height = 480, onMarkerClick, mini = false }) {
  const mapRef = useRef(null)

  const withCoords = billboards.filter(b => b.coordinates?.lat && b.coordinates?.lng)
  const noCoords   = billboards.length - withCoords.length

  return (
    <div className="bmap-container" style={{ height }}>
      {billboards.length === 0 ? (
        <div className="bmap-empty">
          <MapPin size={32} strokeWidth={1.5} />
          <p>No billboards to display</p>
        </div>
      ) : (
        <>
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            style={{ width: '100%', height: '100%' }}
            zoomControl={!mini}
            scrollWheelZoom={!mini}
            ref={mapRef}
            attributionControl={!mini}
          >
            <TileLayer url={TILE_URL} attribution={TILE_ATTR} />
            <FitBounds billboards={withCoords} />

            {withCoords.map((board) => (
              <Marker
                key={board.id}
                position={[board.coordinates.lat, board.coordinates.lng]}
                icon={createBillboardIcon(board)}
              >
                <Popup className="bmap-popup" closeButton={!mini}>
                  {mini ? (
                    <div className="bmap-popup-mini">
                      <strong>{board.locationName}</strong>
                      <span>{board.city}</span>
                    </div>
                  ) : (
                    <div className="bmap-popup-content">
                      <div className="bmap-popup-header">
                        <span
                          className={`bmap-popup-dot ${board.isActive ? 'bmap-popup-dot--active' : 'bmap-popup-dot--inactive'}`}
                        />
                        <strong className="bmap-popup-name">{board.locationName}</strong>
                      </div>
                      <p className="bmap-popup-city">{board.city}</p>
                      <div className="bmap-popup-stats">
                        <span className="bmap-popup-scans">
                          {(board.totalScans ?? 0).toLocaleString()} scans
                        </span>
                        <span className={`bmap-popup-status ${board.isActive ? 'active' : 'inactive'}`}>
                          {board.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {onMarkerClick && (
                        <button
                          className="bmap-popup-btn"
                          onClick={() => onMarkerClick(board)}
                        >
                          View Details
                        </button>
                      )}
                    </div>
                  )}
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {noCoords > 0 && !mini && (
            <div className="bmap-notice">
              {noCoords} billboard{noCoords > 1 ? 's have' : ' has'} no coordinates — edit to add a location
            </div>
          )}
        </>
      )}
    </div>
  )
}
