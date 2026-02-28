/**
 * NavigationManager - Manages real-time navigation to parking location
 * Updates distance and direction every 5 seconds
 */
class NavigationManager {
    constructor(locationService) {
        this.locationService = locationService;
        this.navigationIntervals = new Map();
        this.UPDATE_FREQUENCY = 5000; // 5 seconds
        this.ARRIVAL_THRESHOLD = 10; // 10 meters
    }

    /**
     * Start navigation updates
     * @param {number} targetLat - Target latitude
     * @param {number} targetLon - Target longitude
     * @param {Function} updateCallback - Callback function(navigationData)
     * @returns {string} Navigation ID
     */
    startNavigation(targetLat, targetLon, updateCallback) {
        const navigationId = `nav_${Date.now()}`;

        // Update immediately
        this._updateNavigation(targetLat, targetLon, updateCallback, navigationId);

        // Then update every 5 seconds
        const intervalId = setInterval(() => {
            this._updateNavigation(targetLat, targetLon, updateCallback, navigationId);
        }, this.UPDATE_FREQUENCY);

        this.navigationIntervals.set(navigationId, intervalId);

        return navigationId;
    }

    /**
     * Stop navigation updates
     * @param {string} navigationId - Navigation ID to stop
     */
    stopNavigation(navigationId) {
        const intervalId = this.navigationIntervals.get(navigationId);
        
        if (intervalId) {
            clearInterval(intervalId);
            this.navigationIntervals.delete(navigationId);
        }
    }

    /**
     * Format distance for display
     * @param {number} meters - Distance in meters
     * @returns {string} Formatted distance (e.g., "250 m" or "1.5 km")
     */
    formatDistance(meters) {
        if (meters < 1000) {
            return `${Math.round(meters)} m`;
        } else {
            return `${(meters / 1000).toFixed(1)} km`;
        }
    }

    /**
     * Update navigation data
     * @private
     * @param {number} targetLat - Target latitude
     * @param {number} targetLon - Target longitude
     * @param {Function} callback - Update callback
     * @param {string} navigationId - Navigation ID
     */
    async _updateNavigation(targetLat, targetLon, callback, navigationId) {
        try {
            // Get current location
            const currentLocation = await this.locationService.getCurrentLocation();

            // Calculate distance
            const distance = this.locationService.calculateDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                targetLat,
                targetLon
            );

            // Calculate bearing
            const bearing = this.locationService.calculateBearing(
                currentLocation.latitude,
                currentLocation.longitude,
                targetLat,
                targetLon
            );

            // Convert to cardinal direction
            const direction = this.locationService.bearingToCardinal(bearing);

            // Format distance
            const distanceText = this.formatDistance(distance);

            // Check if arrived
            const arrived = distance <= this.ARRIVAL_THRESHOLD;

            // Call callback with navigation data
            callback({
                distance,
                distanceText,
                bearing,
                direction,
                currentLocation,
                arrived
            });

            // Stop navigation if arrived
            if (arrived) {
                this.stopNavigation(navigationId);
            }
        } catch (error) {
            console.error('[NavigationManager] Navigation update failed:', error);
            
            // Call callback with error
            callback({
                error: error.message,
                userMessage: error.userMessage || 'Unable to update navigation'
            });
        }
    }

    /**
     * Stop all active navigations
     */
    stopAll() {
        for (const [navigationId, intervalId] of this.navigationIntervals.entries()) {
            clearInterval(intervalId);
        }
        this.navigationIntervals.clear();
    }
}
