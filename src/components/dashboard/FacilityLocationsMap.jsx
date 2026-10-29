import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import { useBatchStore } from '../../hooks/useBatchStore'

export function FacilityLocationsMap() {
  const { facilities, batches } = useBatchStore()
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)

  useEffect(() => {
    if (!mapContainerRef.current) return
    if (mapInstanceRef.current) return

    try {
      const map = L.map(mapContainerRef.current, {
        center: [12.9716, 77.62],
        zoom: 10,
        scrollWheelZoom: false,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 18,
      }).addTo(map)

      // Add real registered facilities
      const facList = Array.isArray(facilities) ? facilities : []
      facList.forEach((fac) => {
        const coords = fac.coordinates || [12.9716, 77.5946]
        const isCollection = fac.facilityType === 'COLLECTION_CENTRE'
        const marker = L.circleMarker(coords, {
          radius: isCollection ? 7 : 9,
          fillColor: isCollection ? '#2563EB' : '#16A34A',
          color: '#FFFFFF',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        }).addTo(map)

        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; padding: 2px;">
            <strong style="color: ${isCollection ? '#2563EB' : '#16A34A'};">${fac.name}</strong><br/>
            <span style="color: #4B5563; font-size: 11px;">Type: ${isCollection ? 'Public Collection Centre' : 'Certified Recycler'}</span><br/>
            <span style="color: #4B5563; font-size: 11px;">Status: ${fac.licenceStatus || 'Unverified'}</span><br/>
            <span style="color: #6B7280; font-size: 10px;">Source: ${fac.dataSource || 'Official'}</span>
          </div>
        `)
      })

      // Add collection depots from registered batches
      const uniqueHubs = Array.from(new Set((batches || []).map(b => b.collectionFacility).filter(Boolean)))
      const hubCoords = [
        [12.9716, 77.5946],
        [12.9815, 77.7289],
        [13.0285, 77.5256],
        [12.8399, 77.6770],
      ]
      uniqueHubs.forEach((hubName, idx) => {
        const coords = hubCoords[idx % hubCoords.length]
        const marker = L.circleMarker(coords, {
          radius: 8,
          fillColor: '#16A34A',
          color: '#FFFFFF',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        }).addTo(map)

        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; padding: 2px;">
            <strong style="color: #16A34A;">${hubName}</strong><br/>
            <span style="color: #4B5563; font-size: 11px;">Type: Collection Center</span>
          </div>
        `)
      })

      mapInstanceRef.current = map
    } catch (err) {
      console.warn('Map initialization:', err.message)
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [facilities, batches])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col h-full shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900 text-sm">Collection &amp; Facility Locations</h3>
        <select className="text-xs border border-gray-200 rounded-lg px-2.5 py-1 text-gray-600 bg-gray-50 focus:outline-none">
          <option>All Locations</option>
          <option>Bengaluru Urban</option>
          <option>Peenya Industrial</option>
          <option>Whitefield</option>
        </select>
      </div>

      <div className="relative flex-1 min-h-[220px] rounded-lg overflow-hidden border border-gray-100">
        <div ref={mapContainerRef} className="w-full h-full min-h-[220px]" />

        {/* Map Legend Overlay matching reference image */}
        <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-xs p-2 rounded-lg border border-gray-200 shadow-sm text-[10px] space-y-1.5 z-[1000] pointer-events-none">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] shrink-0"></span>
            <span className="text-gray-700 font-medium">Collection Centers</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] shrink-0"></span>
            <span className="text-gray-700 font-medium">Transporters</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] shrink-0"></span>
            <span className="text-gray-700 font-medium">Recycling Facilities</span>
          </div>
        </div>
      </div>
    </div>
  )
}
