/**
 * LocationService - Handles GPS location capture and distance/bearing calculations
 * Uses browser Geolocation API and Haversine formula for accurate distance calculation
 */
class LocationService {
    constructor() {
        this.options = {
            enableHighAccuracy: true,
            timeout: 10000, // 10 seconds
            maximumAge: 0 // Always get fresh position
        };
    }

    /**
     * Get current device location using Geolocation API
     * @param {Object} options - Optional geolocation options
     * @returns {Promise<Object>} Location object with latitude, longitude, accuracy, timestamp
     * @throws {GeolocationError} If location cannot be obtained
     */
    async getCurrentLocation(options = {}) {
        if (!this.isSupported()) {
            throw new Error('Geolocation is not supported by this browser');
        }

        const geoOptions = { ...this.options, ...options };

        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: position.timestamp
                    });
                },
                (error) => {
                    reject(this._handleGeolocationError(error));
                },
                geoOptions
            );
        });
    }

    /**
     * Calculate distance between two coordinates using Haversine formula
     * @param {number} lat1 - First latitude (-90 to 90)
     * @param {number} lon1 - First longitude (-180 to 180)
     * @param {number} lat2 - Second latitude (-90 to 90)
     * @param {number} lon2 - Second longitude (-180 to 180)
     * @returns {number} Distance in meters
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Earth radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distance in meters
    }

    /**
     * Calculate compass bearing from point A to point B
     * @param {number} lat1 - Start latitude
     * @param {number} lon1 - Start longitude
     * @param {number} lat2 - End latitude
     * @param {number} lon2 - End longitude
     * @returns {number} Bearing in degrees (0-360)
     */
    calculateBearing(lat1, lon1, lat2, lon2) {
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const y = Math.sin(Δλ) * Math.cos(φ2);
        const x = Math.cos(φ1) * Math.sin(φ2) -
                  Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
        const θ = Math.atan2(y, x);

        return (θ * 180 / Math.PI + 360) % 360; // Bearing in degrees
    }

    /**
     * Convert bearing in degrees to cardinal direction
     * @param {number} bearing - Bearing in degrees (0-360)
     * @returns {string} Cardinal direction (N, NE, E, SE, S, SW, W, NW)
     */
    bearingToCardinal(bearing) {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const index = Math.round(bearing / 45) % 8;
        return directions[index];
    }

    /**
     * Check if geolocation is supported by the browser
     * @returns {boolean} True if geolocation is supported
     */
    isSupported() {
        return 'geolocation' in navigator;
    }

    /**
     * Handle geolocation errors and return user-friendly error objects
     * @private
     * @param {GeolocationPositionError} error - Geolocation error
     * @returns {Error} Error with user-friendly message
     */
    _handleGeolocationError(error) {
        let message = '';
        let userMessage = '';
        let code = error.code;

        switch (error.code) {
            case error.PERMISSION_DENIED:
                message = 'Location access denied by user';
                userMessage = 'Location access is required to save your parking spot. Please enable location access in your browser settings.';
                break;
            case error.POSITION_UNAVAILABLE:
                message = 'Location information unavailable';
                userMessage = 'GPS signal is weak. Please try again in a moment or move to an area with better GPS reception.';
                break;
            case error.TIMEOUT:
                message = 'Location request timed out';
                userMessage = 'Location request timed out. Please try again.';
                break;
            default:
                message = 'Unknown geolocation error';
                userMessage = 'Unable to get your location. Please try again.';
        }

        const err = new Error(message);
        err.userMessage = userMessage;
        err.code = code;
        err.originalError = error;

        // Log error for debugging
        console.error(`[LocationService] Error ${code}: ${message}`, error);

        return err;
    }
}
