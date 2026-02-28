/**
 * SessionManager - Orchestrates parking session lifecycle
 * Coordinates LocationService, PhotoService, TimerService, and StorageService
 */
class SessionManager {
    constructor(locationService, photoService, timerService, storageService) {
        this.locationService = locationService;
        this.photoService = photoService;
        this.timerService = timerService;
        this.storageService = storageService;
    }

    /**
     * Create new parking session
     * @param {Object} options - Session options
     * @param {boolean} options.includePhoto - Whether to capture photo
     * @param {number} options.timerMinutes - Timer duration in minutes (optional)
     * @param {string} options.photoData - Pre-captured photo data (optional)
     * @returns {Promise<Object>} Created parking session
     */
    async createSession(options = {}) {
        try {
            // Check if there's already an active session
            const existingSession = await this.storageService.loadActiveSession();
            if (existingSession && existingSession.metadata.isActive) {
                throw new Error('An active parking session already exists. Please end it first.');
            }

            // Capture location
            const location = await this.locationService.getCurrentLocation();

            // Generate unique session ID
            const sessionId = this._generateSessionId();

            // Initialize session object
            const session = {
                id: sessionId,
                location: {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    accuracy: location.accuracy,
                    timestamp: location.timestamp
                },
                photo: {
                    full: null,
                    thumbnail: null,
                    timestamp: null
                },
                timer: {
                    expirationTime: null,
                    durationMinutes: null,
                    active: false,
                    warningSent: false,
                    expiredSent: false
                },
                metadata: {
                    createdAt: Date.now(),
                    endedAt: null,
                    isActive: true
                }
            };

            // Add photo if requested
            if (options.includePhoto && options.photoData) {
                session.photo.full = options.photoData;
                session.photo.thumbnail = await this.photoService.generateThumbnail(options.photoData);
                session.photo.timestamp = Date.now();
            }

            // Set up timer if requested
            if (options.timerMinutes && options.timerMinutes >= 5 && options.timerMinutes <= 1440) {
                const expirationTime = Date.now() + (options.timerMinutes * 60 * 1000);
                session.timer.expirationTime = expirationTime;
                session.timer.durationMinutes = options.timerMinutes;
                session.timer.active = true;

                // Start timer
                this.timerService.startTimer(expirationTime, sessionId);
            }

            // Save session
            await this.storageService.saveActiveSession(session);

            // Cache map tiles for offline use
            // (This will be handled by MapService when map is displayed)

            return session;
        } catch (error) {
            console.error('[SessionManager] Failed to create session:', error);
            throw error;
        }
    }

    /**
     * End active parking session
     * @param {string} sessionId - Session ID to end
     * @returns {Promise<void>}
     */
    async endSession(sessionId) {
        try {
            const activeSession = await this.storageService.loadActiveSession();

            if (!activeSession || activeSession.id !== sessionId) {
                throw new Error('Session not found or already ended');
            }

            // Cancel timer if active
            if (activeSession.timer.active) {
                this.timerService.cancelTimer(`timer_${sessionId}`);
            }

            // Archive session
            await this.storageService.archiveSession(sessionId);

        } catch (error) {
            console.error('[SessionManager] Failed to end session:', error);
            throw error;
        }
    }

    /**
     * Get active parking session
     * @returns {Promise<Object|null>} Active session or null
     */
    async getActiveSession() {
        try {
            return await this.storageService.loadActiveSession();
        } catch (error) {
            console.error('[SessionManager] Failed to get active session:', error);
            return null;
        }
    }

    /**
     * Load session from history
     * @param {string} sessionId - Session ID to load
     * @returns {Promise<Object|null>} Session or null
     */
    async loadHistorySession(sessionId) {
        try {
            const history = await this.storageService.getHistory();
            return history.find(session => session.id === sessionId) || null;
        } catch (error) {
            console.error('[SessionManager] Failed to load history session:', error);
            return null;
        }
    }

    /**
     * Update active session
     * @param {Object} updates - Partial session updates
     * @returns {Promise<Object>} Updated session
     */
    async updateSession(updates) {
        try {
            const activeSession = await this.storageService.loadActiveSession();

            if (!activeSession) {
                throw new Error('No active session to update');
            }

            // Merge updates
            const updatedSession = {
                ...activeSession,
                ...updates
            };

            // Save updated session
            await this.storageService.saveActiveSession(updatedSession);

            return updatedSession;
        } catch (error) {
            console.error('[SessionManager] Failed to update session:', error);
            throw error;
        }
    }

    /**
     * Validate session data
     * @param {Object} session - Session to validate
     * @returns {boolean} True if valid
     */
    validateSession(session) {
        if (!session || typeof session !== 'object') {
            return false;
        }

        // Check required fields
        if (!session.id || !session.location || !session.metadata) {
            return false;
        }

        // Check location fields
        if (typeof session.location.latitude !== 'number' ||
            typeof session.location.longitude !== 'number') {
            return false;
        }

        // Validate latitude/longitude ranges
        if (session.location.latitude < -90 || session.location.latitude > 90) {
            return false;
        }

        if (session.location.longitude < -180 || session.location.longitude > 180) {
            return false;
        }

        return true;
    }

    /**
     * Generate unique session ID
     * @private
     * @returns {string} Unique session ID
     */
    _generateSessionId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        return `session_${timestamp}_${random}`;
    }
}
