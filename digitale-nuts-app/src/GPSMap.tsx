import React, { useState, useRef, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// Fix voor Leaflet icons in React
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

// Draggable Marker Component
const DraggableMarker: React.FC<{
  position: [number, number]
  onDragEnd: (lat: number, lng: number) => void
  isDraggable: boolean
}> = ({ position, onDragEnd, isDraggable }) => {
  const markerRef = useRef<L.Marker>(null)
  
  const eventHandlers = {
    dragend() {
      const marker = markerRef.current
      if (marker != null) {
        const newPos = marker.getLatLng()
        onDragEnd(newPos.lat, newPos.lng)
      }
    },
  }

  return (
    <Marker
      draggable={isDraggable}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
    >
      <Popup>
        <div className="map-popup">
          <strong>📍 {isDraggable ? 'Inspectie Locatie (versleepbaar)' : 'Huidige Locatie'}</strong><br />
          <small>
            GPS: {position[0].toFixed(4)}, {position[1].toFixed(4)}<br />
            Nauwkeurigheid: ±3 meter
            {isDraggable && <><br /><em>Sleep de pin om de locatie aan te passen</em></>}
          </small>
        </div>
      </Popup>
    </Marker>
  )
}

interface GPSMapProps {
  latitude: number
  longitude: number
  zoom?: number
  isCompact?: boolean
  onLocationChange?: (lat: number, lng: number) => void
  isDraggable?: boolean
}

const GPSMap: React.FC<GPSMapProps> = ({ 
  latitude, 
  longitude, 
  zoom = 16,
  isCompact = false,
  onLocationChange,
  isDraggable = false
}) => {
  const [currentPosition, setCurrentPosition] = useState<[number, number]>([latitude, longitude])
  const mapHeight = isCompact ? '120px' : '200px'

  useEffect(() => {
    setCurrentPosition([latitude, longitude])
  }, [latitude, longitude])
  
  const handleMarkerDragEnd = (lat: number, lng: number) => {
    setCurrentPosition([lat, lng])
    if (onLocationChange) {
      onLocationChange(lat, lng)
    }
  }
  
  return (
    <div className={`gps-map ${isCompact ? 'compact' : ''}`}>
      <MapContainer
        key={`${currentPosition[0]}-${currentPosition[1]}`}
        center={currentPosition}
        zoom={zoom}
        style={{ height: mapHeight, width: '100%', borderRadius: '12px' }}
        zoomControl={!isCompact}
        scrollWheelZoom={!isCompact}
        dragging={!isCompact}
        touchZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | Stad Antwerpen'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Huidige locatie marker */}
        <DraggableMarker
          position={currentPosition}
          onDragEnd={handleMarkerDragEnd}
          isDraggable={isDraggable}
        />
        
        {/* Nauwkeurigheids cirkel */}
        <Circle
          center={currentPosition}
          radius={3}
          pathOptions={{
            color: '#E10019',
            fillColor: '#E10019',
            fillOpacity: 0.2,
            weight: 2
          }}
        />
        
        {/* Antwerpen centrum referentie (als ver weg) */}
        {Math.abs(currentPosition[0] - 51.2194) > 0.01 && (
          <Marker position={[51.2194, 4.4025]}>
            <Popup>
              <div className="map-popup">
                <strong>🏛️ Antwerpen Centrum</strong><br />
                <small>Stadhuis - Grote Markt</small>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
      
      {isCompact && (
        <div className="map-overlay">
          <div className="map-coords">
            📍 {currentPosition[0].toFixed(4)}, {currentPosition[1].toFixed(4)}
            {isDraggable && <span className="draggable-hint"> (versleepbaar)</span>}
          </div>
          <button 
            className="map-fullscreen-btn"
            onClick={() => {
              // Hier zou een fullscreen kaart geopend kunnen worden
              alert('🗺️ Fullscreen kaart\n\nZou hier een groot kaartscherm openen voor gedetailleerde navigatie en locatie selectie.')
            }}
          >
            🔍
          </button>
        </div>
      )}
    </div>
  )
}

export default GPSMap
