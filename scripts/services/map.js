/**
 * MapService - Handles interactive maps using Leaflet.js and OpenStreetMap
 * Manages markers, bounds, and tile caching for offline support
 */
class MapService {
    constructor() {
        this.map = null;
        this.parkingMarker = null;
        this.currentLocationMarker = null;
        this.tileLayer = null;
        this.TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        this.ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    }

    /**
     * Initialize map in container element
     * @param {string} containerId - ID of container element
     * @param {Array} center - [latitude, longitude]
     * @param {number} zoom - Initial zoom level (default: 15)
     * @returns {Object} Leaflet map instance
     */
    initMap(containerId, center, zoom = 15) {
        // Remove existing map if any
        if (this.map) {
            this.map.remove();
        }

        // Create map
        this.map = L.map(containerId, {
            center: center,
            zoom: zoom,
            zoomControl: true,
            attributionControl: true
        });

        // Add tile layer
        this.tileLayer = L.tileLayer(this.TILE_URL, {
            attribution: this.ATTRIBUTION,
            maxZoom: 19,
            minZoom: 10
        }).addTo(this.map);

        // Handle tile loading errors
        this.tileLayer.on('tileerror', (error) => {
            console.warn('[MapService] Tile loading error:', error);
        });

        return this.map;
    }

    /**
     * Add marker for saved parking location
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @param {string} label - Marker label (default: 'Your Car')
     * @returns {Object} Leaflet marker instance
     */
    addParkingMarker(lat, lon, label = 'Your Car') {
        if (!this.map) {
            throw new Error('Map not initialized');
        }

        // Remove existing parking marker
        if (this.parkingMarker) {
            this.map.removeLayer(this.parkingMarker);
        }

        // Create custom icon for car
        const carIcon = L.divIcon({
            className: 'car-marker',
            html: '<div style="font-size: 32px;">🚗</div>',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        // Add marker
        this.parkingMarker = L.marker([lat, lon], { icon: carIcon })
            .addTo(this.map)
            .bindPopup(`<b>${label}</b><br>Lat: ${lat.toFixed(6)}<br>Lon: ${lon.toFixed(6)}`);

        return this.parkingMarker;
    }

    /**
     * Add marker for current user location
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {Object} Leaflet marker instance
     */
    addCurrentLocationMarker(lat, lon) {
        if (!this.map) {
            throw new Error('Map not initialized');
        }

        // Remove existing current location marker
        if (this.currentLocationMarker) {
            this.map.removeLayer(this.currentLocationMarker);
        }

        // Create custom icon for current location
        const locationIcon = L.divIcon({
            className: 'location-marker',
            html: '<div style="width: 16px; height: 16px; background: #4A90E2; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 8px rgba(0,0,0,0.3);"></div>',
            iconSize: [22, 22],
            iconAnchor: [11, 11]
        });

        // Add marker
        this.currentLocationMarker = L.marker([lat, lon], { icon: locationIcon })
            .addTo(this.map)
            .bindPopup(`<b>You are here</b><br>Lat: ${lat.toFixed(6)}<br>Lon: ${lon.toFixed(6)}`);

        return this.currentLocationMarker;
    }

    /**
     * Fit map bounds to show all markers
     * @param {Array} markers - Array of Leaflet markers
     */
    fitBounds(markers) {
        if (!this.map || !markers || markers.length === 0) {
            return;
        }

        const bounds = L.latLngBounds(markers.map(m => m.getLatLng()));
        this.map.fitBounds(bounds, { padding: [50, 50] });
    }

    /**
     * Center map on coordinates
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @param {number} zoom - Zoom level (optional)
     */
    centerMap(lat, lon, zoom) {
        if (!this.map) {
            return;
        }

        if (zoom) {
            this.map.setView([lat, lon], zoom);
        } else {
            this.map.panTo([lat, lon]);
        }
    }

    /**
     * Cache map tiles for offline use (using Cache API)
     * @param {number} lat - Center latitude
     * @param {number} lon - Center longitude
     * @param {number} radius - Radius in meters (default: 1000)
     * @returns {Promise<void>}
     */
    async cacheMapTiles(lat, lon, radius = 1000) {
        if (!('caches' in window)) {
            console.warn('[MapService] Cache API not supported');
            return;
        }

        try {
            const cache = await caches.open('parkingpal-maps-v1');
            const zoomLevels = [13, 14, 15, 16, 17]; // Cache multiple zoom levels

            for (const zoom of zoomLevels) {
                const tiles = this._getTileCoordinates(lat, lon, zoom, radius);
                
                for (const tile of tiles) {
                    const url = this.TILE_URL
                        .replace('{s}', 'a')
                        .replace('{z}', tile.z)
                        .replace('{x}', tile.x)
                        .replace('{y}', tile.y);
                    
                    try {
                        await cache.add(url);
                    } catch (error) {
                        // Ignore individual tile errors
                        console.warn(`[MapService] Failed to cache tile: ${url}`);
                    }
                }
            }

            console.log('[MapService] Map tiles cached successfully');
        } catch (error) {
            console.error('[MapService] Failed to cache map tiles:', error);
        }
    }

    /**
     * Check if tiles are cached for location
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {Promise<boolean>} True if tiles are cached
     */
    async hasCachedTiles(lat, lon) {
        if (!('caches' in window)) {
            return false;
        }

        try {
            const cache = await caches.open('parkingpal-maps-v1');
            const tile = this._getTileCoordinates(lat, lon, 15, 0)[0];
            const url = this.TILE_URL
                .replace('{s}', 'a')
                .replace('{z}', tile.z)
                .replace('{x}', tile.x)
                .replace('{y}', tile.y);
            
            const response = await cache.match(url);
            return !!response;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get tile coordinates for a location and radius
     * @private
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @param {number} zoom - Zoom level
     * @param {number} radius - Radius in meters
     * @returns {Array} Array of tile coordinates {x, y, z}
     */
    _getTileCoordinates(lat, lon, zoom, radius) {
        const tiles = [];
        const centerTile = this._latLonToTile(lat, lon, zoom);
        
        // Calculate tile range based on radius
        const tilesPerMeter = Math.pow(2, zoom) / (40075016.686 * Math.cos(lat * Math.PI / 180));
        const tileRadius = Math.ceil(radius * tilesPerMeter);

        // Get tiles in radius
        for (let dx = -tileRadius; dx <= tileRadius; dx++) {
            for (let dy = -tileRadius; dy <= tileRadius; dy++) {
                tiles.push({
                    x: centerTile.x + dx,
                    y: centerTile.y + dy,
                    z: zoom
                });
            }
        }

        return tiles;
    }

    /**
     * Convert lat/lon to tile coordinates
     * @private
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @param {number} zoom - Zoom level
     * @returns {Object} Tile coordinates {x, y}
     */
    _latLonToTile(lat, lon, zoom) {
        const x = Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
        const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
        return { x, y };
    }

    /**
     * Destroy map instance
     */
    destroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
            this.parkingMarker = null;
            this.currentLocationMarker = null;
        }
    }
}
