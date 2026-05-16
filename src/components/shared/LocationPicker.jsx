import { useState, useEffect, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch'
import { Crosshair } from 'lucide-react'
import '../../utils/leafletConfig.js'
import './LocationPicker.css'

const SKOPJE   = [41.9981, 21.4254]
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

// Moves the marker and notifies parent on map click
function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

// Adds the geosearch bar to the map; uses a ref so the effect doesn't re-run when onPick changes
function SearchControl({ onPick }) {
  const map       = useMap()
  const onPickRef = useRef(onPick)
  useEffect(() => { onPickRef.current = onPick })

  useEffect(() => {
    const provider = new OpenStreetMapProvider()
    const ctrl = new GeoSearchControl({
      provider,
      style:       'bar',
      showMarker:  false,
      autoClose:   true,
      searchLabel: 'Search address…',
      keepResult:  true,
    })
    map.addControl(ctrl)

    const onResult = (e) => onPickRef.current(e.location.y, e.location.x)
    map.on('geosearch/showlocation', onResult)

    return () => {
      map.removeControl(ctrl)
      map.off('geosearch/showlocation', onResult)
    }
  }, [map])

  return null
}

/**
 * Interactive map picker for selecting a billboard's GPS coordinates.
 *
 * Props:
 *   initialLat / initialLng  – pre-fill position (edit mode); defaults to Skopje center
 *   onLocationChange(coords) – called with { lat, lng } on every position change, including mount
 *   height                   – map container height in px (default 300)
 */
export default function LocationPicker({ initialLat, initialLng, onLocationChange, height = 300 }) {
  const hasInit = initialLat != null && initialLng != null &&
                  !isNaN(Number(initialLat)) && !isNaN(Number(initialLng))

  const initPos = hasInit ? [Number(initialLat), Number(initialLng)] : SKOPJE

  const [position, setPosition] = useState(initPos)

  // Notify parent immediately on mount so the form always has valid coords
  useEffect(() => {
    onLocationChange({ lat: initPos[0], lng: initPos[1] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pick = useCallback((lat, lng) => {
    setPosition([lat, lng])
    onLocationChange({ lat, lng })
  }, [onLocationChange])

  const handleDragEnd = (e) => {
    const { lat, lng } = e.target.getLatLng()
    pick(lat, lng)
  }

  const handleGeolocate = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => pick(pos.coords.latitude, pos.coords.longitude),
      () => {},
    )
  }

  return (
    <div className="loc-picker">
      <div className="loc-picker__toolbar">
        <span className="loc-picker__hint">Click map or drag the marker to set location</span>
        <button type="button" className="loc-picker__geo-btn" onClick={handleGeolocate}>
          <Crosshair size={13} />
          Use Current Location
        </button>
      </div>

      <div className="loc-picker__coords">
        <span className="loc-picker__coord-pair">
          <span className="loc-picker__coord-label">Lat</span>
          <span className="loc-picker__coord-value">{position[0].toFixed(6)}</span>
        </span>
        <span className="loc-picker__coord-sep" />
        <span className="loc-picker__coord-pair">
          <span className="loc-picker__coord-label">Lng</span>
          <span className="loc-picker__coord-value">{position[1].toFixed(6)}</span>
        </span>
      </div>

      <div className="loc-picker__map" style={{ height }}>
        <MapContainer
          center={initPos}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer url={TILE_URL} attribution={TILE_ATTR} />
          <Marker
            position={position}
            draggable
            eventHandlers={{ dragend: handleDragEnd }}
          />
          <ClickHandler onPick={pick} />
          <SearchControl onPick={pick} />
        </MapContainer>
      </div>
    </div>
  )
}
