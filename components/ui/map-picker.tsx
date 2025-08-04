"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, Navigation } from "lucide-react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number) => void
  initialLat?: number
  initialLng?: number
}

const defaultPosition = { lat: 37.7749, lng: -122.4194 } // San Francisco

function LocationMarker({ position, setPosition, onLocationSelect }: any) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng)
      onLocationSelect(e.latlng.lat, e.latlng.lng)
    },
  })

  return position === null ? null : (
    <Marker
      position={position}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target
          const latlng = marker.getLatLng()
          setPosition(latlng)
          onLocationSelect(latlng.lat, latlng.lng)
        },
      }}
      icon={L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        shadowSize: [41, 41],
      })}
    />
  )
}

export function MapPicker({ onLocationSelect, initialLat, initialLng }: MapPickerProps) {
  const [position, setPosition] = useState<any>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  )
  const [mapCenter, setMapCenter] = useState(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : defaultPosition
  )

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          setMapCenter({ lat, lng })
          setPosition({ lat, lng })
          onLocationSelect(lat, lng)
        },
        (error) => {
          console.error("Error getting current location:", error)
        }
      )
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Select Property Location
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleUseCurrentLocation}
            className="flex items-center gap-2"
          >
            <Navigation className="h-4 w-4" />
            Use Current Location
          </Button>
        </div>
        <MapContainer
          center={mapCenter}
          zoom={13}
          scrollWheelZoom={true}
          style={{ width: "100%", height: "256px", borderRadius: "0.5rem" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={position} setPosition={setPosition} onLocationSelect={onLocationSelect} />
        </MapContainer>
        {position && (
          <div className="text-sm text-muted-foreground">
            Selected: {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
          </div>
        )}
        <div className="text-xs text-muted-foreground">
          Click on the map to select a location, or drag the marker to adjust the position.
        </div>
      </CardContent>
    </Card>
  )
} 