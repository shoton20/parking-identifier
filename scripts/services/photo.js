/**
 * PhotoService - Handles photo capture, compression, and thumbnail generation
 * Uses MediaDevices API for camera access and Canvas API for image processing
 */
class PhotoService {
    constructor() {
        this.MAX_SIZE_KB = 500;
        this.MAX_DIMENSION = 1920;
        this.THUMBNAIL_SIZE = 150;
    }

    /**
     * Capture photo from device camera
     * @returns {Promise<string>} Base64 encoded image string
     * @throws {CameraError} If camera access fails
     */
    async captureFromCamera() {
        if (!this.isSupported()) {
            throw new Error('Camera is not supported by this browser');
        }

        try {
            // Request camera access
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } // Prefer back camera
            });

            // Create video element to capture frame
            const video = document.createElement('video');
            video.srcObject = stream;
            video.play();

            // Wait for video to be ready
            await new Promise((resolve) => {
                video.onloadedmetadata = resolve;
            });

            // Capture frame to canvas
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);

            // Stop camera stream
            stream.getTracks().forEach(track => track.stop());

            // Get base64 image
            const base64Image = canvas.toDataURL('image/jpeg', 0.8);

            // Compress if needed
            return await this.compressImage(base64Image, this.MAX_SIZE_KB);
        } catch (error) {
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                const err = new Error('Camera access denied');
                err.userMessage = 'Camera access denied. You can upload a photo instead.';
                throw err;
            } else if (error.name === 'NotFoundError') {
                const err = new Error('Camera not found');
                err.userMessage = 'Camera not available. Please upload a photo.';
                throw err;
            } else {
                throw new Error(`Camera error: ${error.message}`);
            }
        }
    }

    /**
     * Upload photo from file system
     * @param {File} file - Image file from input
     * @returns {Promise<string>} Base64 encoded image string
     * @throws {FileError} If file processing fails
     */
    async uploadFromFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            throw new Error('Invalid file type. Please select an image.');
        }

        // Check file size (max 10MB before compression)
        const MAX_FILE_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
            throw new Error('File too large. Please select an image under 10MB.');
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const base64Image = e.target.result;
                    const compressed = await this.compressImage(base64Image, this.MAX_SIZE_KB);
                    resolve(compressed);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsDataURL(file);
        });
    }

    /**
     * Compress image to target size using progressive quality reduction
     * @param {string} base64Image - Base64 encoded image
     * @param {number} maxSizeKB - Maximum size in kilobytes
     * @returns {Promise<string>} Compressed base64 image
     */
    async compressImage(base64Image, maxSizeKB = 500) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                try {
                    // Resize if too large
                    let width = img.width;
                    let height = img.height;

                    if (width > this.MAX_DIMENSION || height > this.MAX_DIMENSION) {
                        if (width > height) {
                            height = (height / width) * this.MAX_DIMENSION;
                            width = this.MAX_DIMENSION;
                        } else {
                            width = (width / height) * this.MAX_DIMENSION;
                            height = this.MAX_DIMENSION;
                        }
                    }

                    // Create canvas and draw resized image
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Progressive quality reduction
                    let quality = 0.8;
                    let compressed = canvas.toDataURL('image/jpeg', quality);

                    while (this._getBase64Size(compressed) > maxSizeKB * 1024 && quality > 0.1) {
                        quality -= 0.1;
                        compressed = canvas.toDataURL('image/jpeg', quality);
                    }

                    resolve(compressed);
                } catch (error) {
                    reject(new Error(`Image compression failed: ${error.message}`));
                }
            };

            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };

            img.src = base64Image;
        });
    }

    /**
     * Generate thumbnail from image
     * @param {string} base64Image - Base64 encoded image
     * @param {number} width - Thumbnail width
     * @param {number} height - Thumbnail height
     * @returns {Promise<string>} Thumbnail base64 image
     */
    async generateThumbnail(base64Image, width = 150, height = 150) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');

                    // Calculate crop dimensions to maintain aspect ratio
                    const scale = Math.max(width / img.width, height / img.height);
                    const scaledWidth = img.width * scale;
                    const scaledHeight = img.height * scale;
                    const x = (width - scaledWidth) / 2;
                    const y = (height - scaledHeight) / 2;

                    // Draw cropped and scaled image
                    ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

                    // Generate thumbnail with moderate quality
                    const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
                    resolve(thumbnail);
                } catch (error) {
                    reject(new Error(`Thumbnail generation failed: ${error.message}`));
                }
            };

            img.onerror = () => {
                reject(new Error('Failed to load image for thumbnail'));
            };

            img.src = base64Image;
        });
    }

    /**
     * Check if camera is supported
     * @returns {boolean} True if camera is supported
     */
    isSupported() {
        return 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
    }

    /**
     * Get size of base64 string in bytes
     * @private
     * @param {string} base64String - Base64 encoded string
     * @returns {number} Size in bytes
     */
    _getBase64Size(base64String) {
        const padding = (base64String.endsWith('==') ? 2 : base64String.endsWith('=') ? 1 : 0);
        return (base64String.length * 3) / 4 - padding;
    }
}
