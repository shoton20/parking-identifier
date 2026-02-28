/**
 * NotificationService - Handles browser notifications with fallback to in-app alerts
 * Uses Notifications API for system notifications
 */
class NotificationService {
    constructor() {
        this.inAppCallbacks = [];
    }

    /**
     * Request notification permission from user
     * @returns {Promise<string>} Permission status: 'granted', 'denied', or 'default'
     */
    async requestPermission() {
        if (!this.isSupported()) {
            return 'denied';
        }

        try {
            const permission = await Notification.requestPermission();
            return permission;
        } catch (error) {
            console.error('[NotificationService] Permission request failed:', error);
            return 'denied';
        }
    }

    /**
     * Send notification (browser or in-app fallback)
     * @param {string} title - Notification title
     * @param {string} body - Notification body text
     * @param {Object} options - Additional notification options
     * @returns {Promise<Notification|null>} Notification instance or null
     */
    async sendNotification(title, body, options = {}) {
        const permission = this.getPermissionStatus();

        if (permission === 'granted' && this.isSupported()) {
            return this._sendBrowserNotification(title, body, options);
        } else {
            // Fallback to in-app alert
            this._sendInAppAlert(title, body);
            return null;
        }
    }

    /**
     * Check if notifications are supported
     * @returns {boolean} True if Notifications API is supported
     */
    isSupported() {
        return 'Notification' in window;
    }

    /**
     * Get current notification permission status
     * @returns {string} Permission status: 'granted', 'denied', or 'default'
     */
    getPermissionStatus() {
        if (!this.isSupported()) {
            return 'denied';
        }
        return Notification.permission;
    }

    /**
     * Register callback for in-app alerts
     * @param {Function} callback - Callback function(title, body)
     */
    onInAppAlert(callback) {
        this.inAppCallbacks.push(callback);
    }

    /**
     * Send browser notification
     * @private
     * @param {string} title - Notification title
     * @param {string} body - Notification body
     * @param {Object} options - Notification options
     * @returns {Notification} Notification instance
     */
    _sendBrowserNotification(title, body, options = {}) {
        const notificationOptions = {
            body,
            icon: 'icons/icon-192x192.png',
            badge: 'icons/icon-72x72.png',
            vibrate: [200, 100, 200],
            tag: 'parkingpal-notification',
            requireInteraction: false,
            ...options
        };

        try {
            const notification = new Notification(title, notificationOptions);

            // Click handler - focus app
            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            return notification;
        } catch (error) {
            console.error('[NotificationService] Failed to send notification:', error);
            // Fallback to in-app alert
            this._sendInAppAlert(title, body);
            return null;
        }
    }

    /**
     * Send in-app alert (fallback)
     * @private
     * @param {string} title - Alert title
     * @param {string} body - Alert body
     */
    _sendInAppAlert(title, body) {
        // Trigger callbacks for in-app display
        this.inAppCallbacks.forEach(callback => {
            try {
                callback(title, body);
            } catch (error) {
                console.error('[NotificationService] In-app alert callback error:', error);
            }
        });
    }

    /**
     * Send parking warning notification
     * @param {number} minutesRemaining - Minutes until expiration
     */
    async sendParkingWarning(minutesRemaining) {
        await this.sendNotification(
            'Parking Expiring Soon ⏰',
            `${minutesRemaining} minutes until your parking expires`,
            { tag: 'parking-warning' }
        );
    }

    /**
     * Send parking expired notification
     */
    async sendParkingExpired() {
        await this.sendNotification(
            'Parking Expired! 🚨',
            'Your parking time has expired',
            { 
                tag: 'parking-expired',
                requireInteraction: true 
            }
        );
    }
}
