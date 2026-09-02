import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { supabase } from '@/integrations/supabase/client'
import { API_CONFIG } from './config'

export interface Location {
  latitude: number
  longitude: number
  address?: string
}

export interface OfferMarker extends Location {
  id: string
  title: string
  businessName: string
  discount: number
  distance?: number
}

export class MapboxService {
  private map: mapboxgl.Map | null = null
  private markers: mapboxgl.Marker[] = []
  private mapboxToken: string | null = null

  constructor() {
    this.initializeMapbox()
  }

  private async initializeMapbox() {
    // For now, we'll use a placeholder since we need to get the token from edge function
    // This will be updated when we implement proper token management
    mapboxgl.accessToken = 'pk.placeholder'
  }

  initializeMap(container: HTMLElement, center: Location = {
    latitude: API_CONFIG.MAPBOX.DEFAULT_CENTER[1],
    longitude: API_CONFIG.MAPBOX.DEFAULT_CENTER[0]
  }): mapboxgl.Map {
    this.map = new mapboxgl.Map({
      container,
      style: API_CONFIG.MAPBOX.STYLE,
      center: [center.longitude, center.latitude],
      zoom: API_CONFIG.MAPBOX.DEFAULT_ZOOM,
      pitch: 45,
      bearing: 0
    })

    // Add navigation controls
    this.map.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    )

    // Add geolocate control
    this.map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
      }),
      'top-right'
    )

    return this.map
  }

  addOfferMarkers(offers: OfferMarker[]): void {
    if (!this.map) return

    // Clear existing markers
    this.clearMarkers()

    offers.forEach(offer => {
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        closeOnClick: true
      }).setHTML(`
        <div class="p-3">
          <h3 class="font-bold text-sm">${offer.title}</h3>
          <p class="text-xs text-gray-600">${offer.businessName}</p>
          <p class="text-sm font-bold text-green-600">${offer.discount}% OFF</p>
          ${offer.distance ? `<p class="text-xs text-gray-500">${offer.distance.toFixed(1)} km</p>` : ''}
        </div>
      `)

      const marker = new mapboxgl.Marker({
        color: '#2D5A27',
        scale: 0.8
      })
        .setLngLat([offer.longitude, offer.latitude])
        .setPopup(popup)
        .addTo(this.map!)

      this.markers.push(marker)
    })
  }

  clearMarkers(): void {
    this.markers.forEach(marker => marker.remove())
    this.markers = []
  }

  flyTo(location: Location, zoom: number = 15): void {
    if (!this.map) return

    this.map.flyTo({
      center: [location.longitude, location.latitude],
      zoom,
      duration: 2000
    })
  }

  async getCurrentLocation(): Promise<Location> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalização não suportada'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        },
        (error) => {
          reject(error)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      )
    })
  }

  calculateDistance(from: Location, to: Location): number {
    const R = 6371 // Earth's radius in km
    const dLat = this.deg2rad(to.latitude - from.latitude)
    const dLon = this.deg2rad(to.longitude - from.longitude)
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(from.latitude)) * Math.cos(this.deg2rad(to.latitude)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180)
  }

  destroy(): void {
    if (this.map) {
      this.clearMarkers()
      this.map.remove()
      this.map = null
    }
  }
}

export const mapboxService = new MapboxService()