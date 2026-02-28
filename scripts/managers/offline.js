/**
 * OfflineManager - Manages online/offline state and notifies services
 * Detects connectivity changes and updates UI
 */
class OfflineManager {
    constructor() {
        this.isOffline = !navigator.onLine;
        this.listeners = [];
        this.setupListeners();
    }

    /**
     * Set up online/offline event listeners
     */
    setupListeners() {
        window.addEventListener('online', () => {
            this.isOffline = false;
            this.onStatusChange('online');
        });

        window.addEventListener('offline', () => {
            this.isOffline = true;
            this.onStatusChange('offline');
        });
    }

    /**
     * Handle connectivity status change
     * @param {string} status - 'online' or 'offline'
     */
    onStatusChange(status) {
        console.log(`[OfflineManager] Status changed to: ${status}`);

        // Update UI indicator
        this.updateUIIndicator(status);

        // Notify listeners
        this.notifyListeners(status);
    }

    /**
     * Update offline indicator in UI
     * @param {string} status - 'online' or 'offline'
     */
    updateUIIndicator(status) {
        const indicator = document.getElementById('offline-indicator');
        
        if (indicator) {
            if (status === 'offline') {
                indicator.classList.add('visible');
                indicator.textContent = '📡 Offline Mode';
            } else {
                indicator.classList.remove('visible');
            }
        }
    }

    /**
     * Register listener for status changes
     * @param {Function} callback - Callback function(status)
     */
    addListener(callback) {
        this.listeners.push(callback);
    }

    /**
     * Notify all listeners of status change
     * @param {string} status - 'online' or 'offline'
     */
    notifyListeners(status) {
        this.listeners.forEach(callback => {
            try {
                callback(status);
            } catch (error) {
                console.error('[OfflineManager] Listener error:', error);
            }
        });
    }

    /**
     * Check if currently offline
     * @returns {boolean} True if offline
     */
    isCurrentlyOffline() {
        return this.isOffline;
    }

    /**
     * Get current status
     * @returns {string} 'online' or 'offline'
     */
    getStatus() {
        return this.isOffline ? 'offline' : 'online';
    }
}
