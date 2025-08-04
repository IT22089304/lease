"use client"

import { MapContainer, TileLayer, Marker } from "react-leaflet"
import { MapPin } from "lucide-react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

interface MapDisplayProps {
  lat: number
  lng: number
  title?: string
  address?: string
}

export function MapDisplay({ lat, lng, title, address }: MapDisplayProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MapPin className="h-4 w-4" />
        <span>Property Location</span>
      </div>
      <MapContainer
        center={{ lat, lng }}
        zoom={15}
        scrollWheelZoom={false}
        style={{ width: "100%", height: "192px", borderRadius: "0.5rem" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker
          position={{ lat, lng }}
          icon={L.icon({
            iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
            shadowSize: [41, 41],
          })}
        />
      </MapContainer>
      {address && (
        <div className="text-xs text-muted-foreground">{address}</div>
      )}
    </div>
  )
} 