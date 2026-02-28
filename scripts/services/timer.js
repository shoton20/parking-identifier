/**
 * TimerService - Manages parking expiration timers and notifications
 * Checks timers every 60 seconds and triggers callbacks for warnings and expiration
 */
class TimerService {
    constructor() {
        this.timers = new Map();
        this.callbacks = [];
        this.checkInterval = null;
        this.CHECK_FREQUENCY = 60000; // 60 seconds
        this.WARNING_MINUTES = 15;
    }

    /**
     * Start a parking timer
     * @param {number} expirationTime - Unix timestamp (ms) when parking expires
     * @param {string} sessionId - Session ID
     * @returns {string} Timer ID
     */
    startTimer(expirationTime, sessionId) {
        const timerId = `timer_${sessionId}`;
        
        this.timers.set(timerId, {
            expirationTime,
            sessionId,
            warningSent: false,
            expiredSent: false,
            active: true
        });

        // Start checking if not already running
        if (!this.checkInterval) {
            this._startChecking();
        }

        return timerId;
    }

    /**
     * Cancel a timer
     * @param {string} timerId - Timer ID to cancel
     */
    cancelTimer(timerId) {
        this.timers.delete(timerId);
        
        // Stop checking if no active timers
        if (this.timers.size === 0 && this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    /**
     * Get remaining time until expiration
     * @param {number} expirationTime - Unix timestamp (ms)
     * @returns {Object} Object with hours, minutes, seconds, and expired flag
     */
    getRemainingTime(expirationTime) {
        const now = Date.now();
        const remaining = expirationTime - now;

        if (remaining <= 0) {
            return { hours: 0, minutes: 0, seconds: 0, expired: true };
        }

        const totalSeconds = Math.floor(remaining / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return { hours, minutes, seconds, expired: false };
    }

    /**
     * Register callback for timer events
     * @param {Function} callback - Callback function(event, sessionId)
     *                              event: 'warning' | 'expired'
     */
    onTimerEvent(callback) {
        this.callbacks.push(callback);
    }

    /**
     * Check all active timers and trigger events
     */
    checkTimers() {
        const now = Date.now();
        const WARNING_THRESHOLD = this.WARNING_MINUTES * 60 * 1000; // 15 minutes in ms
        const WARNING_WINDOW = 60 * 1000; // 1 minute window

        for (const [timerId, timer] of this.timers.entries()) {
            if (!timer.active) continue;

            const remaining = timer.expirationTime - now;

            // Check for warning (15 minutes before expiration)
            if (remaining > 0 && 
                remaining <= WARNING_THRESHOLD && 
                remaining > WARNING_THRESHOLD - WARNING_WINDOW &&
                !timer.warningSent) {
                
                timer.warningSent = true;
                this._triggerEvent('warning', timer.sessionId);
            }

            // Check for expiration
            if (remaining <= 0 && !timer.expiredSent) {
                timer.expiredSent = true;
                timer.active = false;
                this._triggerEvent('expired', timer.sessionId);
            }
        }
    }

    /**
     * Recover timers from stored session data (on app restart)
     * @param {Object} session - Session with timer data
     */
    recoverTimer(session) {
        if (session.timer && session.timer.active && session.timer.expirationTime) {
            const now = Date.now();
            
            // Only recover if not expired
            if (session.timer.expirationTime > now) {
                this.startTimer(session.timer.expirationTime, session.id);
            }
        }
    }

    /**
     * Start periodic timer checking
     * @private
     */
    _startChecking() {
        // Check immediately
        this.checkTimers();
        
        // Then check every 60 seconds
        this.checkInterval = setInterval(() => {
            this.checkTimers();
        }, this.CHECK_FREQUENCY);
    }

    /**
     * Trigger event callbacks
     * @private
     * @param {string} event - Event type ('warning' | 'expired')
     * @param {string} sessionId - Session ID
     */
    _triggerEvent(event, sessionId) {
        this.callbacks.forEach(callback => {
            try {
                callback({ event, sessionId });
            } catch (error) {
                console.error('[TimerService] Callback error:', error);
            }
        });
    }

    /**
     * Format remaining time for display
     * @param {number} expirationTime - Unix timestamp (ms)
     * @returns {string} Formatted time string (e.g., "1h 25m")
     */
    formatRemainingTime(expirationTime) {
        const { hours, minutes, expired } = this.getRemainingTime(expirationTime);
        
        if (expired) {
            return 'Expired';
        }

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }
}
