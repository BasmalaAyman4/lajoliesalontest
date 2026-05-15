// ─── MapPicker (shared) ───────────────────────────────────────────────────────
//
//  Drag-and-drop marker + address search via Nominatim.
//  Also handles Google Maps Plus Codes (e.g. "385Q+36P Cairo") by stripping
//  the plus-code token and searching with the remaining context string.
//
//  value / onChange shape:
//    { address: string; latitude: string; longitude: string }

import { useState, useEffect, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { HiSearch, HiLocationMarker } from 'react-icons/hi'
import { cn } from '@/lib/cn'
import Button from '../Button'

// ── Fix Leaflet's broken default icon in Vite/Webpack bundlers ────────────────
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// @ts-expect-error – internal Leaflet API
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

// ── Types ─────────────────────────────────────────────────────────────────────
export interface MapValue {
  address: string
  latitude: string
  longitude: string
}

interface MapPickerProps {
  value?: MapValue
  onChange?: (value: MapValue) => void
  label?: string
  error?: string
  disabled?: boolean
  required?: boolean
  /** Map height in px, default 300 */
  height?: number
}

// ── Default: Cairo, Egypt ─────────────────────────────────────────────────────
const DEFAULT_LAT = 30.045
const DEFAULT_LNG = 31.233

// ── Plus Code helpers ─────────────────────────────────────────────────────────
// Plus codes look like:  "385Q+36P" (short) or "7GXF385Q+36P" (full/global)
// Google Maps pastes them as: "385Q+36P, Al Manteqah Al Oula, Cairo"
const PLUS_CODE_RE = /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}/i

/**
 * If the query starts with a Plus Code token, strip it and return the
 * remaining context (e.g. city/region) which Nominatim CAN geocode.
 * Returns null if there is no Plus Code in the string.
 *
 * "385Q+36P, Al Manteqah Al Oula, Madinet, Cairo Governorate 11511"
 *   → "Al Manteqah Al Oula, Madinet, Cairo Governorate 11511"
 */
function stripPlusCode(query: string): string | null {
  const trimmed = query.trim()
  const match = trimmed.match(PLUS_CODE_RE)
  if (!match) return null

  // Remove the matched token + any following comma/space
  const after = trimmed.slice(match[0].length).replace(/^[\s,]+/, '').trim()
  return after || null
}

// ── Inner component — syncs map view when position changes ────────────────────
function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom(), { duration: 0.8 })
  }, [lat, lng, map])
  return null
}

// ── Nominatim search ──────────────────────────────────────────────────────────
interface NominatimResult {
  lat: string
  lon: string
  display_name: string
}

async function nominatimSearch(q: string): Promise<NominatimResult | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`,
      { headers: { 'Accept-Language': 'en' } },
    )
    const data = await res.json()
    return data?.[0] ?? null
  } catch {
    return null
  }
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function MapPicker({
  value,
  onChange,
  label,
  error,
  disabled = false,
  required = false,
  height = 300,
}: MapPickerProps) {
  const [lat, setLat] = useState(
    value?.latitude ? parseFloat(value.latitude) : DEFAULT_LAT,
  )
  const [lng, setLng] = useState(
    value?.longitude ? parseFloat(value.longitude) : DEFAULT_LNG,
  )
  const [address, setAddress] = useState(value?.address ?? '')
  const [searchQuery, setSearchQuery] = useState(value?.address ?? '')
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [flyKey, setFlyKey] = useState(0)
  const markerRef = useRef<L.Marker>(null)

  // Sync when parent value changes (e.g. form reset)
  useEffect(() => {
    if (value?.latitude) setLat(parseFloat(value.latitude))
    if (value?.longitude) setLng(parseFloat(value.longitude))
    if (value?.address !== undefined) {
      setAddress(value.address)
      setSearchQuery(value.address)
    }
  }, [value?.latitude, value?.longitude, value?.address])

  // Reverse-geocode a coordinate pair
  const reverseGeocode = useCallback(async (la: number, ln: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${la}&lon=${ln}&format=json`,
        { headers: { 'Accept-Language': 'en' } },
      )
      const data = await res.json()
      return (data?.display_name as string) ?? ''
    } catch {
      return ''
    }
  }, [])

  // Emit upwards
  const emit = useCallback(
    (la: number, ln: number, addr: string) => {
      onChange?.({ address: addr, latitude: String(la), longitude: String(ln) })
    },
    [onChange],
  )

  // Marker dragged
  const handleDragEnd = useCallback(async () => {
    const marker = markerRef.current
    if (!marker) return
    const pos = marker.getLatLng()
    const addr = await reverseGeocode(pos.lat, pos.lng)
    setLat(pos.lat)
    setLng(pos.lng)
    setAddress(addr)
    setSearchQuery(addr)
    setSearchError(null)
    emit(pos.lat, pos.lng, addr)
  }, [reverseGeocode, emit])

  // Search button clicked
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    setSearchError(null)

    try {
      let result: NominatimResult | null = null

      // ── Strategy 1: try the raw query first ──────────────────────────────
      result = await nominatimSearch(searchQuery)

      // ── Strategy 2: if no result AND query contains a Plus Code,
      //    strip the plus-code token and retry with just the context string
      if (!result) {
        const context = stripPlusCode(searchQuery)
        if (context) {
          result = await nominatimSearch(context)
        }
      }

      if (result) {
        const la = parseFloat(result.lat)
        const ln = parseFloat(result.lon)
        const addr = result.display_name
        setLat(la)
        setLng(ln)
        setAddress(addr)
        setFlyKey((k) => k + 1)
        emit(la, ln, addr)
      } else {
        setSearchError('Location not found. Try a more specific address.')
      }
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery, emit])

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {/* Label */}
      {label && (
        <label className="text-sm font-medium text-[var(--text-secondary)]">
          {label}
          {required && <span className="text-[var(--danger)] ms-1">*</span>}
        </label>
      )}

      {/* Search row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
            <HiSearch size={15} />
          </span>
          <input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setSearchError(null)
            }}
            onKeyDown={(e) => e.key === 'Enter' && !disabled && handleSearch()}
            placeholder="Search address or paste Google Maps location…"
            disabled={disabled}
            className={cn(
              'w-full ps-9 pe-3 py-2.5 rounded-[var(--radius)] border bg-[var(--bg-card)]',
              'text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)]',
              'outline-none transition-all border-[var(--border)]',
              'focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--accent-soft)]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              (error || searchError) && 'border-[var(--danger)]',
            )}
          />
        </div>
        <Button
          onClick={handleSearch}
          loading={isSearching}
          disabled={disabled || !searchQuery.trim()}
          size="md"
        >
          Search
        </Button>
      </div>

      {/* Search-specific error (not a validation error) */}
      {searchError && (
        <p className="text-xs text-[var(--danger)]">{searchError}</p>
      )}

      {/* Map */}
      <div
        className={cn(
          'w-full rounded-[var(--radius)] overflow-hidden border',
          error ? 'border-[var(--danger)]' : 'border-[var(--border)]',
        )}
        style={{ height }}
      >
        <MapContainer
          center={[lat, lng]}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <Marker
            position={[lat, lng]}
            draggable={!disabled}
            ref={markerRef}
            eventHandlers={{ dragend: handleDragEnd }}
          >
            <Popup>
              <span className="text-xs">{address || 'Selected location'}</span>
            </Popup>
          </Marker>
          <FlyTo key={flyKey} lat={lat} lng={lng} />
        </MapContainer>
      </div>

      {/* Resolved address display */}
      {address && (
        <p className="flex items-start gap-1.5 text-xs text-[var(--text-muted)]">
          <HiLocationMarker size={13} className="shrink-0 mt-0.5 text-[var(--accent)]" />
          {address}
        </p>
      )}

      {/* Validation error */}
      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
    </div>
  )
}