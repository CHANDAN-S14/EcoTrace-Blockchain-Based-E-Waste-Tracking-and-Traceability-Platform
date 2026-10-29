import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import { useBatchStore } from '../../hooks/useBatchStore'

const TRANSIT_NODES = [
  { name: 'Bangalore Central Intake Hub', coords: [12.9716, 77.5946], role: 'Collection Depot' },
  { name: 'Whitefield E-Depot', coords: [12.9815, 77.7289], role: 'Collection Depot' },
  { name: 'Peenya Sorting Center', coords: [13.0285, 77.5256], role: 'Sorting Yard' },
  { name: 'Electronic City Hazmat Bay', coords: [12.8399, 77.6770], role: 'Collection Depot' },
]

export function CustodyMap() {
  const { facilities } = useBatchStore()
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)

  useEffect(() => {
    if (!mapContainerRef.current) return
    if (mapInstanceRef.current) return

    try {
      const map = L.map(mapContainerRef.current, {
        center: [12.9716, 77.62],
        zoom: 11,
        scrollWheelZoom: false,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map)

      // Add Collection Nodes
      TRANSIT_NODES.forEach((node) => {
        const marker = L.circleMarker(node.coords, {
          radius: 7,
          fillColor: '#176B45',
          color: '#FFFFFF',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        }).addTo(map)

        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 11px;">
            <strong style="color: #176B45;">${node.name}</strong><br/>
            <span>Type: ${node.role}</span>
          </div>
        `)
      })

      // Add Certified Recycler Facilities from store
      const facilityList = (facilities && facilities.length > 0) ? facilities : []
      facilityList.forEach((fac) => {
        const coords = fac.coordinates || [12.9716, 77.5946]
        const marker = L.circleMarker(coords, {
          radius: 9,
          fillColor: '#239B66',
          color: '#003B23',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        }).addTo(map)

        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 11px;">
            <strong style="color: #003B23;">${fac.name}</strong><br/>
            <span>Type: ${fac.facilityType === 'COLLECTION_CENTRE' ? 'Collection Centre' : 'Certified Recycler'}</span><br/>
            <span>Licence: ${fac.licenceNumber || (fac.facilityType === 'COLLECTION_CENTRE' ? 'Public Intake Point' : 'Pending Verification')}</span><br/>
            <span>Capacity: ${fac.capacityKgMonth ? `${(fac.capacityKgMonth / 1000).toFixed(0)} Tonnes/mo` : 'Intake Hub (No smelting quota)'}</span>
          </div>
        `)
      })

      // Draw corridor routes
      const polyline = L.polyline([
        [12.9716, 77.5946],
        [13.0285, 77.5256],
        [12.9815, 77.7289],
        [12.8184, 77.6854],
      ], {
        color: '#176B45',
        weight: 3,
        opacity: 0.6,
        dashArray: '6, 8',
      }).addTo(map)

      mapInstanceRef.current = map
    } catch (err) {
      console.warn('Map initialization note:', err)
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  return (
    <div className="bg-white rounded-2xl p-5 border border-[#E3EAE5] shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-[#003B23]">
            Active Logistics Transit Corridors
          </h3>
          <p className="text-xs text-[#66756D]">
            Live OpenStreetMap coordinates of collection depots, weighbridges, and recycling facilities
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5 text-[#176B45]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#176B45]"></span> Collection Depots
          </span>
          <span className="flex items-center gap-1.5 text-[#239B66]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#239B66]"></span> Certified Recyclers
          </span>
        </div>
      </div>

      <div
        ref={mapContainerRef}
        className="w-full h-64 sm:h-72 rounded-xl border border-[#E3EAE5] overflow-hidden z-10"
      />
    </div>
  )
}
