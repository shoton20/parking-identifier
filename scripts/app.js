/**
 * ParkingPal Lite - Main Application
 * Coordinates all services and manages UI
 */
class ParkingPalApp {
    constructor() {
        // Initialize services
        this.locationService = new LocationService();
        this.photoService = new PhotoService();
        this.storageService = new StorageService();
        this.timerService = new TimerService();
        this.notificationService = new NotificationService();
        this.mapService = new MapService();
        this.navigationManager = new NavigationManager(this.locationService);
        
        // Initialize managers
        this.sessionManager = new SessionManager(
            this.locationService,
            this.photoService,
            this.timerService,
            this.storageService
        );
        this.offlineManager = new OfflineManager();
        this.pwaInstallManager = new PWAInstallManager();
        
        // State
        this.currentView = 'main';
        this.activeSession = null;
        this.navigationId = null;
        this.capturedPhoto = null;
        this.selectedTimerMinutes = null;
        
        // Initialize app
        this.init();
    }

    /**
     * Initialize application
     */
    async init() {
        console.log('[ParkingPal] Initializing app...');
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Set up timer event handler
        this.timerService.onTimerEvent(this.handleTimerEvent.bind(this));
        
        // Set up notification in-app alerts
        this.notificationService.onInAppAlert(this.showInAppAlert.bind(this));
        
        // Load active session
        await this.loadActiveSession();
        
        // Register service worker
        this.registerServiceWorker();
        
        console.log('[ParkingPal] App initialized');
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Menu button
        document.getElementById('menu-button')?.addEventListener('click', () => {
            this.showMenu();
        });
        
        // Save location button (will be added dynamically)
        document.addEventListener('click', (e) => {
            if (e.target.id === 'save-location-btn') {
                this.startSaveParkingFlow();
            }
            if (e.target.id === 'end-session-btn') {
                this.endSession();
            }
            if (e.target.id === 'view-history-btn') {
                this.showHistory();
            }
        });
    }

    /**
     * Load active session from storage
     */
    async loadActiveSession() {
        try {
            this.activeSession = await this.sessionManager.getActiveSession();
            
            if (this.activeSession) {
                console.log('[ParkingPal] Active session loaded:', this.activeSession.id);
                
                // Recover timer if active
                if (this.activeSession.timer.active) {
                    this.timerService.recoverTimer(this.activeSession);
                }
                
                // Show active session view
                this.showActiveSessionView();
            } else {
                // Show empty state
                this.showEmptyState();
            }
        } catch (error) {
            console.error('[ParkingPal] Failed to load active session:', error);
            this.showEmptyState();
        }
    }

    /**
     * Show empty state (no active session)
     */
    showEmptyState() {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🚗</div>
                <h2>No Active Parking Session</h2>
                <p>Save your parking location to get started</p>
                <button id="save-location-btn" class="btn-primary">
                    📍 Save Parking Location
                </button>
            </div>
            
            <div class="info-section">
                <h2>Recent Parking History</h2>
                <div id="recent-history"></div>
                <button id="view-history-btn" class="btn-secondary mt-md">
                    View All History
                </button>
            </div>
        `;
        
        // Load recent history
        this.loadRecentHistory();
    }

    /**
     * Show active session view
     */
    showActiveSessionView() {
        const session = this.activeSession;
        const mainContent = document.getElementById('main-content');
        
        mainContent.innerHTML = `
            <div class="map-container">
                <div id="map"></div>
            </div>
            
            <div class="info-section">
                <h2>📍 Your Car</h2>
                <p>Saved ${this.formatDate(session.metadata.createdAt)}</p>
                <p class="info-value">${session.location.latitude.toFixed(6)}, ${session.location.longitude.toFixed(6)}</p>
            </div>
            
            ${session.timer.active ? `
            <div class="info-section">
                <h2>⏱️ Time Remaining</h2>
                <p class="info-value" id="timer-display">Calculating...</p>
                <p id="expiration-time">Expires at ${this.formatTime(session.timer.expirationTime)}</p>
            </div>
            ` : ''}
            
            <div class="info-section">
                <h2>🧭 Navigation</h2>
                <div id="navigation-info">
                    <div class="loading-container">
                        <div class="spinner"></div>
                        <p class="loading-text">Getting your location...</p>
                    </div>
                </div>
            </div>
            
            ${session.photo.full ? `
            <div class="info-section">
                <h2>📷 Parking Spot Photo</h2>
                <img src="${session.photo.full}" alt="Parking spot" class="photo-preview">
            </div>
            ` : ''}
            
            <div class="action-buttons">
                <button id="end-session-btn" class="btn-danger">
                    End Parking Session
                </button>
            </div>
        `;
        
        // Initialize map
        this.initializeMap();
        
        // Start navigation updates
        this.startNavigation();
        
        // Update timer display if active
        if (session.timer.active) {
            this.updateTimerDisplay();
            setInterval(() => this.updateTimerDisplay(), 1000);
        }
    }

    /**
     * Initialize map with parking location
     */
    initializeMap() {
        const session = this.activeSession;
        
        try {
            // Initialize map centered on parking location
            this.mapService.initMap(
                'map',
                [session.location.latitude, session.location.longitude],
                15
            );
            
            // Add parking marker
            const parkingMarker = this.mapService.addParkingMarker(
                session.location.latitude,
                session.location.longitude
            );
            
            // Try to add current location marker
            this.locationService.getCurrentLocation()
                .then(location => {
                    const currentMarker = this.mapService.addCurrentLocationMarker(
                        location.latitude,
                        location.longitude
                    );
                    
                    // Fit bounds to show both markers
                    this.mapService.fitBounds([parkingMarker, currentMarker]);
                })
                .catch(error => {
                    console.warn('[ParkingPal] Could not get current location for map:', error);
                });
                
            // Cache tiles for offline use
            this.mapService.cacheMapTiles(
                session.location.latitude,
                session.location.longitude
            );
        } catch (error) {
            console.error('[ParkingPal] Failed to initialize map:', error);
        }
    }

    /**
     * Start navigation updates
     */
    startNavigation() {
        const session = this.activeSession;
        
        this.navigationId = this.navigationManager.startNavigation(
            session.location.latitude,
            session.location.longitude,
            (navData) => {
                if (navData.error) {
                    document.getElementById('navigation-info').innerHTML = `
                        <p class="error-message">${navData.userMessage || navData.error}</p>
                    `;
                } else {
                    document.getElementById('navigation-info').innerHTML = `
                        <div class="navigation-display">
                            <div class="navigation-distance">${navData.distanceText}</div>
                            <div class="navigation-arrow">${this.getDirectionArrow(navData.direction)}</div>
                            <div class="navigation-direction">${navData.direction}</div>
                        </div>
                    `;
                    
                    // Update current location marker on map
                    if (this.mapService.map && navData.currentLocation) {
                        this.mapService.addCurrentLocationMarker(
                            navData.currentLocation.latitude,
                            navData.currentLocation.longitude
                        );
                    }
                    
                    // Check if arrived
                    if (navData.arrived) {
                        this.showInAppAlert('You\'ve arrived!', 'You are within 10 meters of your car');
                    }
                }
            }
        );
    }

    /**
     * Update timer display
     */
    updateTimerDisplay() {
        const session = this.activeSession;
        if (!session || !session.timer.active) return;
        
        const remaining = this.timerService.getRemainingTime(session.timer.expirationTime);
        const display = document.getElementById('timer-display');
        
        if (!display) return;
        
        if (remaining.expired) {
            display.textContent = 'Expired';
            display.className = 'info-value timer-expired';
        } else if (remaining.hours === 0 && remaining.minutes <= 15) {
            display.textContent = this.timerService.formatRemainingTime(session.timer.expirationTime);
            display.className = 'info-value timer-warning';
        } else {
            display.textContent = this.timerService.formatRemainingTime(session.timer.expirationTime);
            display.className = 'info-value';
        }
    }

    /**
     * Start save parking flow
     */
    async startSaveParkingFlow() {
        const mainContent = document.getElementById('main-content');
        
        mainContent.innerHTML = `
            <div class="save-flow">
                <!-- Step 1: Capture Location -->
                <div class="save-flow-step active" id="step-location">
                    <div class="step-header">
                        <h2>Save Parking Location</h2>
                        <p>Getting your GPS location...</p>
                    </div>
                    <div class="loading-container">
                        <div class="spinner"></div>
                        <p class="loading-text">This may take a few seconds</p>
                    </div>
                </div>
                
                <!-- Step 2: Add Photo (Optional) -->
                <div class="save-flow-step" id="step-photo">
                    <div class="step-header">
                        <h2>Add Photo (Optional)</h2>
                        <p>Take a photo to remember your parking spot</p>
                    </div>
                    <div class="step-content photo-capture-container" id="photo-preview-container">
                    </div>
                    <div class="step-actions">
                        ${this.photoService.isSupported() ? '<button id="take-photo-btn" class="btn-primary">📷 Take Photo</button>' : ''}
                        <button id="upload-photo-btn" class="btn-secondary">📁 Upload Photo</button>
                        <input type="file" id="photo-input" class="photo-input" accept="image/*">
                        <button id="skip-photo-btn" class="btn-secondary">Skip</button>
                    </div>
                </div>
                
                <!-- Step 3: Set Timer (Optional) -->
                <div class="save-flow-step" id="step-timer">
                    <div class="step-header">
                        <h2>Set Parking Timer (Optional)</h2>
                        <p>How long are you parking?</p>
                    </div>
                    <div class="step-content">
                        <div class="timer-presets">
                            <button class="timer-preset" data-minutes="30">30 min</button>
                            <button class="timer-preset" data-minutes="60">1 hour</button>
                            <button class="timer-preset" data-minutes="120">2 hours</button>
                            <button class="timer-preset" data-minutes="240">4 hours</button>
                        </div>
                    </div>
                    <div class="step-actions">
                        <button id="skip-timer-btn" class="btn-secondary">Skip</button>
                        <button id="save-session-btn" class="btn-primary" disabled>Save</button>
                    </div>
                </div>
            </div>
        `;
        
        // Start location capture
        this.captureLocation();
    }

    /**
     * Capture location (Step 1)
     */
    async captureLocation() {
        try {
            const location = await this.locationService.getCurrentLocation();
            console.log('[ParkingPal] Location captured:', location);
            
            // Move to photo step
            this.showStep('step-photo');
            this.setupPhotoStep();
        } catch (error) {
            console.error('[ParkingPal] Location capture failed:', error);
            
            document.getElementById('step-location').innerHTML = `
                <div class="step-header">
                    <h2>Location Error</h2>
                </div>
                <div class="error-message">
                    <strong>Unable to get your location</strong>
                    <p>${error.userMessage || error.message}</p>
                </div>
                <div class="step-actions">
                    <button id="retry-location-btn" class="btn-primary">Try Again</button>
                    <button id="cancel-save-btn" class="btn-secondary">Cancel</button>
                </div>
            `;
            
            document.getElementById('retry-location-btn')?.addEventListener('click', () => {
                this.startSaveParkingFlow();
            });
            
            document.getElementById('cancel-save-btn')?.addEventListener('click', () => {
                this.loadActiveSession();
            });
        }
    }

    /**
     * Set up photo step event listeners
     */
    setupPhotoStep() {
        // Take photo button
        document.getElementById('take-photo-btn')?.addEventListener('click', async () => {
            try {
                const photoData = await this.photoService.captureFromCamera();
                this.capturedPhoto = photoData;
                this.showPhotoPreview(photoData);
            } catch (error) {
                alert(error.userMessage || error.message);
            }
        });
        
        // Upload photo button
        document.getElementById('upload-photo-btn')?.addEventListener('click', () => {
            document.getElementById('photo-input').click();
        });
        
        // Photo input change
        document.getElementById('photo-input')?.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const photoData = await this.photoService.uploadFromFile(file);
                    this.capturedPhoto = photoData;
                    this.showPhotoPreview(photoData);
                } catch (error) {
                    alert(error.message);
                }
            }
        });
        
        // Skip photo button
        document.getElementById('skip-photo-btn')?.addEventListener('click', () => {
            this.capturedPhoto = null;
            this.showStep('step-timer');
            this.setupTimerStep();
        });
    }

    /**
     * Show photo preview
     */
    showPhotoPreview(photoData) {
        document.getElementById('photo-preview-container').innerHTML = `
            <img src="${photoData}" alt="Parking spot preview" class="photo-preview-large">
            <button id="retake-photo-btn" class="btn-secondary">Retake Photo</button>
            <button id="continue-with-photo-btn" class="btn-primary">Continue</button>
        `;
        
        document.getElementById('retake-photo-btn')?.addEventListener('click', () => {
            this.capturedPhoto = null;
            this.setupPhotoStep();
        });
        
        document.getElementById('continue-with-photo-btn')?.addEventListener('click', () => {
            this.showStep('step-timer');
            this.setupTimerStep();
        });
    }

    /**
     * Set up timer step event listeners
     */
    setupTimerStep() {
        // Timer preset buttons
        document.querySelectorAll('.timer-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove selected class from all
                document.querySelectorAll('.timer-preset').forEach(b => b.classList.remove('selected'));
                
                // Add selected class to clicked
                btn.classList.add('selected');
                
                // Store selected minutes
                this.selectedTimerMinutes = parseInt(btn.dataset.minutes);
                
                // Enable save button
                document.getElementById('save-session-btn').disabled = false;
            });
        });
        
        // Skip timer button
        document.getElementById('skip-timer-btn')?.addEventListener('click', () => {
            this.selectedTimerMinutes = null;
            this.saveSession();
        });
        
        // Save session button
        document.getElementById('save-session-btn')?.addEventListener('click', () => {
            this.saveSession();
        });
    }

    /**
     * Save parking session
     */
    async saveSession() {
        try {
            // Show loading
            document.getElementById('step-timer').innerHTML = `
                <div class="loading-container">
                    <div class="spinner"></div>
                    <p class="loading-text">Saving your parking session...</p>
                </div>
            `;
            
            // Create session
            const session = await this.sessionManager.createSession({
                includePhoto: !!this.capturedPhoto,
                photoData: this.capturedPhoto,
                timerMinutes: this.selectedTimerMinutes
            });
            
            console.log('[ParkingPal] Session created:', session.id);
            
            // Request notification permission if timer is set
            if (this.selectedTimerMinutes) {
                await this.notificationService.requestPermission();
            }
            
            // Mark first save complete (for PWA install prompt)
            this.pwaInstallManager.markFirstSaveComplete();
            
            // Load the new session
            this.activeSession = session;
            this.showActiveSessionView();
            
            // Show success message briefly
            this.showInAppAlert('Success!', 'Parking location saved');
        } catch (error) {
            console.error('[ParkingPal] Failed to save session:', error);
            alert('Failed to save parking session: ' + error.message);
            this.loadActiveSession();
        }
    }

    /**
     * End parking session
     */
    async endSession() {
        if (!this.activeSession) return;
        
        if (!confirm('Are you sure you want to end this parking session?')) {
            return;
        }
        
        try {
            // Stop navigation
            if (this.navigationId) {
                this.navigationManager.stopNavigation(this.navigationId);
                this.navigationId = null;
            }
            
            // End session
            await this.sessionManager.endSession(this.activeSession.id);
            
            console.log('[ParkingPal] Session ended:', this.activeSession.id);
            
            // Clear active session
            this.activeSession = null;
            
            // Show empty state
            this.showEmptyState();
            
            // Show success message
            this.showInAppAlert('Session Ended', 'Your parking session has been saved to history');
        } catch (error) {
            console.error('[ParkingPal] Failed to end session:', error);
            alert('Failed to end session: ' + error.message);
        }
    }

    /**
     * Show specific step in save flow
     */
    showStep(stepId) {
        document.querySelectorAll('.save-flow-step').forEach(step => {
            step.classList.remove('active');
        });
        document.getElementById(stepId)?.classList.add('active');
    }

    /**
     * Load recent history (last 3 entries)
     */
    async loadRecentHistory() {
        try {
            const history = await this.storageService.getHistory(3);
            const container = document.getElementById('recent-history');
            
            if (!container) return;
            
            if (history.length === 0) {
                container.innerHTML = '<p class="text-center" style="color: var(--text-secondary); padding: var(--spacing-md);">No parking history yet</p>';
                return;
            }
            
            container.innerHTML = history.map(session => `
                <div class="history-item" data-session-id="${session.id}">
                    ${session.photo.thumbnail ? 
                        `<img src="${session.photo.thumbnail}" alt="Parking spot" class="history-thumbnail">` :
                        `<div class="history-thumbnail-placeholder">🚗</div>`
                    }
                    <div class="history-info">
                        <div class="history-date">${this.formatDate(session.metadata.createdAt)}</div>
                        <div class="history-coords">${session.location.latitude.toFixed(4)}, ${session.location.longitude.toFixed(4)}</div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('[ParkingPal] Failed to load recent history:', error);
        }
    }

    /**
     * Show history view
     */
    async showHistory() {
        try {
            const history = await this.storageService.getHistory();
            const mainContent = document.getElementById('main-content');
            
            mainContent.innerHTML = `
                <div class="history-list">
                    <h2 style="margin-bottom: var(--spacing-md);">Parking History</h2>
                    ${history.length === 0 ? 
                        '<p class="text-center" style="color: var(--text-secondary); padding: var(--spacing-xl);">No parking history yet</p>' :
                        history.map(session => `
                            <div class="history-item" data-session-id="${session.id}">
                                ${session.photo.thumbnail ? 
                                    `<img src="${session.photo.thumbnail}" alt="Parking spot" class="history-thumbnail">` :
                                    `<div class="history-thumbnail-placeholder">🚗</div>`
                                }
                                <div class="history-info">
                                    <div class="history-date">${this.formatDate(session.metadata.createdAt)}</div>
                                    <div class="history-coords">${session.location.latitude.toFixed(6)}, ${session.location.longitude.toFixed(6)}</div>
                                </div>
                            </div>
                        `).join('')
                    }
                    <button id="back-to-main-btn" class="btn-secondary mt-lg">Back</button>
                </div>
            `;
            
            document.getElementById('back-to-main-btn')?.addEventListener('click', () => {
                this.loadActiveSession();
            });
        } catch (error) {
            console.error('[ParkingPal] Failed to show history:', error);
        }
    }

    /**
     * Show menu
     */
    showMenu() {
        // TODO: Implement menu
        alert('Menu coming soon!');
    }

    /**
     * Handle timer events
     */
    handleTimerEvent(event) {
        console.log('[ParkingPal] Timer event:', event);
        
        if (event.event === 'warning') {
            this.notificationService.sendParkingWarning(15);
        } else if (event.event === 'expired') {
            this.notificationService.sendParkingExpired();
        }
    }

    /**
     * Show in-app alert
     */
    showInAppAlert(title, body) {
        // Simple alert for now
        // TODO: Implement better in-app notification UI
        console.log(`[ParkingPal] Alert: ${title} - ${body}`);
    }

    /**
     * Register service worker
     */
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/service-worker.js');
                console.log('[ParkingPal] Service Worker registered:', registration);
            } catch (error) {
                console.error('[ParkingPal] Service Worker registration failed:', error);
            }
        }
    }

    /**
     * Format date for display
     */
    formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        
        return date.toLocaleDateString();
    }

    /**
     * Format time for display
     */
    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    /**
     * Get direction arrow emoji
     */
    getDirectionArrow(direction) {
        const arrows = {
            'N': '⬆️',
            'NE': '↗️',
            'E': '➡️',
            'SE': '↘️',
            'S': '⬇️',
            'SW': '↙️',
            'W': '⬅️',
            'NW': '↖️'
        };
        return arrows[direction] || '⬆️';
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.parkingPalApp = new ParkingPalApp();
    });
} else {
    window.parkingPalApp = new ParkingPalApp();
}
