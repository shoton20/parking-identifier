/**
 * PWAInstallManager - Manages PWA installation prompt
 * Shows install button after first successful parking save
 */
class PWAInstallManager {
    constructor() {
        this.deferredPrompt = null;
        this.setupListener();
    }

    /**
     * Set up beforeinstallprompt event listener
     */
    setupListener() {
        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevent default install prompt
            e.preventDefault();
            
            // Store the event for later use
            this.deferredPrompt = e;

            console.log('[PWAInstallManager] Install prompt available');

            // Show install button if first save is complete
            const firstSaveComplete = localStorage.getItem('parkingpal_first_save');
            if (firstSaveComplete === 'true') {
                this.showInstallButton();
            }
        });

        // Listen for app installed event
        window.addEventListener('appinstalled', () => {
            console.log('[PWAInstallManager] PWA installed successfully');
            this.deferredPrompt = null;
            this.hideInstallButton();
        });
    }

    /**
     * Prompt user to install PWA
     * @returns {Promise<string>} User choice: 'accepted' or 'dismissed'
     */
    async promptInstall() {
        if (!this.deferredPrompt) {
            console.warn('[PWAInstallManager] No install prompt available');
            return 'dismissed';
        }

        // Show the install prompt
        this.deferredPrompt.prompt();

        // Wait for user choice
        const { outcome } = await this.deferredPrompt.userChoice;

        console.log(`[PWAInstallManager] User ${outcome} the install prompt`);

        // Clear the deferred prompt
        this.deferredPrompt = null;

        // Hide install button
        if (outcome === 'accepted') {
            this.hideInstallButton();
        }

        return outcome;
    }

    /**
     * Show install button in UI
     */
    showInstallButton() {
        const button = document.getElementById('install-button');
        
        if (button) {
            button.classList.add('visible');
            
            // Add click handler if not already added
            if (!button.hasAttribute('data-handler-added')) {
                button.addEventListener('click', () => {
                    this.promptInstall();
                });
                button.setAttribute('data-handler-added', 'true');
            }
        }
    }

    /**
     * Hide install button in UI
     */
    hideInstallButton() {
        const button = document.getElementById('install-button');
        
        if (button) {
            button.classList.remove('visible');
        }
    }

    /**
     * Mark first save as complete (triggers install button)
     */
    markFirstSaveComplete() {
        localStorage.setItem('parkingpal_first_save', 'true');
        
        // Show install button if prompt is available
        if (this.deferredPrompt) {
            this.showInstallButton();
        }
    }

    /**
     * Check if install prompt is available
     * @returns {boolean} True if prompt is available
     */
    isInstallAvailable() {
        return this.deferredPrompt !== null;
    }
}
