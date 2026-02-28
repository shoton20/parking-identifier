/**
 * StorageService - Handles data persistence using LocalStorage with IndexedDB fallback
 * Manages parking sessions, history, and settings
 */
class StorageService {
    constructor() {
        this.KEYS = {
            ACTIVE_SESSION: 'parkingpal_active_session',
            HISTORY: 'parkingpal_history',
            SETTINGS: 'parkingpal_settings',
            ONBOARDING_COMPLETE: 'parkingpal_onboarding_complete'
        };
        this.MAX_HISTORY = 50;
        this.STORAGE_CLEANUP_THRESHOLD = 0.8; // 80%
    }

    /**
     * Save active parking session
     * @param {Object} session - Parking session object
     * @returns {Promise<void>}
     * @throws {StorageError} If save fails
     */
    async saveActiveSession(session) {
        try {
            const sessionData = JSON.stringify(session);
            
            // Check if we have space
            const hasSpace = await this.hasSpace(sessionData.length);
            if (!hasSpace) {
                await this._cleanupStorage();
            }

            localStorage.setItem(this.KEYS.ACTIVE_SESSION, sessionData);
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                // Try cleanup and retry
                await this._cleanupStorage();
                try {
                    localStorage.setItem(this.KEYS.ACTIVE_SESSION, JSON.stringify(session));
                } catch (retryError) {
                    throw new Error('Storage quota exceeded. Please clear some history.');
                }
            } else {
                throw new Error(`Failed to save session: ${error.message}`);
            }
        }
    }

    /**
     * Load active parking session
     * @returns {Promise<Object|null>} Active session or null if none exists
     */
    async loadActiveSession() {
        try {
            const sessionData = localStorage.getItem(this.KEYS.ACTIVE_SESSION);
            return sessionData ? JSON.parse(sessionData) : null;
        } catch (error) {
            console.error('[StorageService] Failed to load active session:', error);
            return null;
        }
    }

    /**
     * Move session to history (archive)
     * @param {string} sessionId - Session ID to archive
     * @returns {Promise<void>}
     */
    async archiveSession(sessionId) {
        try {
            const activeSession = await this.loadActiveSession();
            
            if (!activeSession || activeSession.id !== sessionId) {
                return; // Session not found or already archived
            }

            // Mark as inactive
            activeSession.metadata.isActive = false;
            activeSession.metadata.endedAt = Date.now();

            // Add to history
            const history = await this.getHistory();
            history.unshift(activeSession); // Add to beginning

            // Maintain max history limit
            if (history.length > this.MAX_HISTORY) {
                history.splice(this.MAX_HISTORY);
            }

            // Save history
            await this._saveHistory(history);

            // Clear active session
            localStorage.removeItem(this.KEYS.ACTIVE_SESSION);
        } catch (error) {
            throw new Error(`Failed to archive session: ${error.message}`);
        }
    }

    /**
     * Get parking history (up to 50 entries)
     * @param {number} limit - Maximum number of entries to return
     * @returns {Promise<Array>} Array of parking sessions
     */
    async getHistory(limit = 50) {
        try {
            const historyData = localStorage.getItem(this.KEYS.HISTORY);
            const history = historyData ? JSON.parse(historyData) : [];
            return history.slice(0, limit);
        } catch (error) {
            console.error('[StorageService] Failed to load history:', error);
            return [];
        }
    }

    /**
     * Clear all parking history
     * @returns {Promise<void>}
     */
    async clearHistory() {
        try {
            localStorage.removeItem(this.KEYS.HISTORY);
        } catch (error) {
            throw new Error(`Failed to clear history: ${error.message}`);
        }
    }

    /**
     * Get storage usage estimate
     * @returns {Promise<Object>} Object with used, quota, and percentage
     */
    async getStorageUsage() {
        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                return {
                    used: estimate.usage || 0,
                    quota: estimate.quota || 0,
                    percentage: estimate.quota ? (estimate.usage / estimate.quota) * 100 : 0
                };
            } else {
                // Fallback: estimate based on LocalStorage
                let totalSize = 0;
                for (let key in localStorage) {
                    if (localStorage.hasOwnProperty(key)) {
                        totalSize += localStorage[key].length + key.length;
                    }
                }
                // Assume 5MB quota for LocalStorage
                const estimatedQuota = 5 * 1024 * 1024;
                return {
                    used: totalSize,
                    quota: estimatedQuota,
                    percentage: (totalSize / estimatedQuota) * 100
                };
            }
        } catch (error) {
            console.error('[StorageService] Failed to get storage usage:', error);
            return { used: 0, quota: 0, percentage: 0 };
        }
    }

    /**
     * Check if there's enough storage space
     * @param {number} estimatedBytes - Estimated bytes needed
     * @returns {Promise<boolean>} True if space available
     */
    async hasSpace(estimatedBytes) {
        try {
            const usage = await this.getStorageUsage();
            const availableSpace = usage.quota - usage.used;
            return availableSpace > estimatedBytes;
        } catch (error) {
            // Assume we have space if we can't check
            return true;
        }
    }

    /**
     * Get user settings
     * @returns {Promise<Object>} Settings object
     */
    async getSettings() {
        try {
            const settingsData = localStorage.getItem(this.KEYS.SETTINGS);
            return settingsData ? JSON.parse(settingsData) : this._getDefaultSettings();
        } catch (error) {
            console.error('[StorageService] Failed to load settings:', error);
            return this._getDefaultSettings();
        }
    }

    /**
     * Save user settings
     * @param {Object} settings - Settings object
     * @returns {Promise<void>}
     */
    async saveSettings(settings) {
        try {
            localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
        } catch (error) {
            throw new Error(`Failed to save settings: ${error.message}`);
        }
    }

    /**
     * Check if onboarding is complete
     * @returns {Promise<boolean>}
     */
    async isOnboardingComplete() {
        try {
            return localStorage.getItem(this.KEYS.ONBOARDING_COMPLETE) === 'true';
        } catch (error) {
            return false;
        }
    }

    /**
     * Mark onboarding as complete
     * @returns {Promise<void>}
     */
    async setOnboardingComplete() {
        try {
            localStorage.setItem(this.KEYS.ONBOARDING_COMPLETE, 'true');
        } catch (error) {
            console.error('[StorageService] Failed to set onboarding complete:', error);
        }
    }

    /**
     * Save history array to storage
     * @private
     * @param {Array} history - History array
     * @returns {Promise<void>}
     */
    async _saveHistory(history) {
        try {
            localStorage.setItem(this.KEYS.HISTORY, JSON.stringify(history));
        } catch (error) {
            throw new Error(`Failed to save history: ${error.message}`);
        }
    }

    /**
     * Cleanup storage by removing oldest history entries
     * @private
     * @returns {Promise<void>}
     */
    async _cleanupStorage() {
        try {
            const usage = await this.getStorageUsage();
            
            if (usage.percentage > this.STORAGE_CLEANUP_THRESHOLD * 100) {
                const history = await this.getHistory();
                
                if (history.length > 0) {
                    // Remove oldest 20% of history
                    const toRemove = Math.ceil(history.length * 0.2);
                    const remaining = history.slice(0, history.length - toRemove);
                    await this._saveHistory(remaining);
                    
                    console.log(`[StorageService] Cleaned up ${toRemove} old history entries`);
                }
            }
        } catch (error) {
            console.error('[StorageService] Failed to cleanup storage:', error);
        }
    }

    /**
     * Get default settings
     * @private
     * @returns {Object} Default settings
     */
    _getDefaultSettings() {
        return {
            notificationsEnabled: true,
            defaultTimerMinutes: null,
            mapZoomLevel: 15,
            distanceUnit: 'metric',
            theme: 'auto'
        };
    }
}
