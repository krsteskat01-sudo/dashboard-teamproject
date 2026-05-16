import { useState, useEffect, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import { Crosshair, MapPin, ChevronDown, Search } from 'lucide-react'
import '../../utils/leafletConfig.js'
import './LocationPicker.css'

const SKOPJE   = [41.9981, 21.4254]
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

const SKOPJE_LOCATIONS = [
  { name: 'City Center (Ploshtad)',      lat: 41.9961, lng: 21.4314 },
  { name: 'Bit Pazar',                   lat: 41.9993, lng: 21.4278 },
  { name: 'Chair / Shair',              lat: 42.0061, lng: 21.4378 },
  { name: 'Gazi Baba',                   lat: 41.9997, lng: 21.4756 },
  { name: 'Aerodrom',                    lat: 41.9714, lng: 21.4319 },
  { name: 'Kisela Voda',                 lat: 41.9617, lng: 21.4456 },
  { name: 'Karpoš',                      lat: 41.9944, lng: 21.3878 },
  { name: 'Butel',                       lat: 42.0233, lng: 21.4344 },
  { name: 'Saraj',                       lat: 41.9878, lng: 21.3456 },
  { name: 'Gjorche Petrov',              lat: 41.9978, lng: 21.3644 },
  { name: 'Centar',                      lat: 41.9914, lng: 21.4244 },
  { name: 'Novo Lisiche',                lat: 41.9806, lng: 21.4606 },
  { name: 'Zelezara / Industrial Zone',  lat: 42.0078, lng: 21.4678 },
  { name: 'Vlae',                        lat: 41.9811, lng: 21.3978 },
  { name: 'Drachevo',                    lat: 41.9467, lng: 21.4456 },
  { name: 'Ilinden Blvd',               lat: 41.9961, lng: 21.4056 },
  { name: 'Partizanski Odredi Blvd',    lat: 41.9994, lng: 21.3944 },
  { name: 'Jane Sandanski Blvd',        lat: 41.9678, lng: 21.4344 },
  { name: 'Skopje Airport Area',        lat: 41.9614, lng: 21.6214 },
  { name: 'Skopje Bus Station',         lat: 41.9972, lng: 21.4339 },
  { name: 'Skopje Train Station',       lat: 41.9950, lng: 21.4294 },
  { name: 'GTC Mall',                   lat: 41.9947, lng: 21.4242 },
  { name: 'City Mall',                  lat: 41.9994, lng: 21.4689 },
  { name: 'Ramstore Mall',              lat: 41.9778, lng: 21.4500 },
  { name: 'East Gate Mall',             lat: 41.9989, lng: 21.4811 },
  { name: 'Vero Center',               lat: 41.9994, lng: 21.4078 },
  { name: 'Alexander the Great Statue', lat: 41.9961, lng: 21.4317 },
  { name: 'Skopje Fortress (Kale)',     lat: 42.0017, lng: 21.4303 },
  { name: 'Matka Canyon entrance',     lat: 41.9564, lng: 21.3208 },
  { name: 'Naroden Teatar',            lat: 41.9956, lng: 21.4267 },
]

function ClickHandler({ onPick }) {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng) } })
  return null
}

function FlyOnce({ position }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo(position, 15, { animate: true, duration: 0.7 })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

// Opens upward — panel is absolutely positioned above the trigger
// No portal needed: the wrapper has overflow:visible and high z-index
function LocationDropdown({ onSelect }) {
  const [open,  setOpen]  = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const filtered = query.trim()
    ? SKOPJE_LOCATIONS.filter(l => l.name.toLowerCase().includes(query.toLowerCase()))
    : SKOPJE_LOCATIONS

  function handleSelect(loc) {
    onSelect(loc.lat, loc.lng)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="loc-dropdown" ref={wrapRef}>
      <button
        type="button"
        className="loc-dropdown__trigger"
        onClick={() => { setOpen(v => !v); setQuery('') }}
      >
        <MapPin size={13} />
        <span>Skopje locations</span>
        <ChevronDown size={13} className={`loc-dropdown__chevron ${open ? 'loc-dropdown__chevron--open' : ''}`} />
      </button>

      {open && (
        <div className="loc-dropdown__panel">
          <div className="loc-dropdown__search">
            <Search size={13} />
            <input
              autoFocus
              type="text"
              placeholder="Search location…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <ul className="loc-dropdown__list">
            {filtered.length === 0
              ? <li className="loc-dropdown__empty">No results</li>
              : filtered.map(loc => (
                <li key={loc.name}>
                  <button type="button" onClick={() => handleSelect(loc)}>
                    <MapPin size={11} />{loc.name}
                  </button>
                </li>
              ))
            }
          </ul>
        </div>
      )}
    </div>
  )
}

export default function LocationPicker({ initialLat, initialLng, onLocationChange, height = 230 }) {
  const hasInit = initialLat != null && initialLng != null &&
                  !isNaN(Number(initialLat)) && !isNaN(Number(initialLng))
  const initPos = hasInit ? [Number(initialLat), Number(initialLng)] : SKOPJE

  const [position, setPosition] = useState(initPos)
  const [flyKey,   setFlyKey]   = useState(null)

  useEffect(() => {
    onLocationChange({ lat: initPos[0], lng: initPos[1] })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pick = useCallback((lat, lng) => {
    setPosition([lat, lng])
    onLocationChange({ lat, lng })
  }, [onLocationChange])

  function handlePreset(lat, lng) {
    pick(lat, lng)
    setFlyKey(k => (k ?? 0) + 1)
  }

  const handleDragEnd = (e) => {
    const { lat, lng } = e.target.getLatLng()
    pick(lat, lng)
  }

  const handleGeolocate = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(pos => {
      pick(pos.coords.latitude, pos.coords.longitude)
      setFlyKey(k => (k ?? 0) + 1)
    }, () => {})
  }

  return (
    <div className="loc-picker">

      {/* Toolbar — overflow:visible so dropdown panel floats above map */}
      <div className="loc-picker__toolbar">
        <LocationDropdown onSelect={handlePreset} />
        <button type="button" className="loc-picker__geo-btn" onClick={handleGeolocate}>
          <Crosshair size={13} />
          My Location
        </button>
      </div>

      {/* Coords + hint row */}
      <div className="loc-picker__meta">
        <span className="loc-picker__hint">Click map or drag marker to fine-tune</span>
        <span className="loc-picker__coords">
          {position[0].toFixed(5)}, {position[1].toFixed(5)}
        </span>
      </div>

      {/* Map — low z-index, never overlaps toolbar */}
      <div className="loc-picker__map" style={{ height }}>
        <MapContainer
          center={initPos}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer url={TILE_URL} attribution={TILE_ATTR} />
          <Marker position={position} draggable eventHandlers={{ dragend: handleDragEnd }} />
          <ClickHandler onPick={pick} />
          {flyKey !== null && <FlyOnce key={flyKey} position={position} />}
        </MapContainer>
      </div>

    </div>
  )
}
