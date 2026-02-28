# ParkingPal Lite

A free Progressive Web App (PWA) that helps you save your parking location and never forget where you parked.

## Features

- 📍 Save parking location with GPS
- 📷 Take photos of your parking spot
- ⏱️ Set parking timers with alerts
- 🗺️ Interactive map with navigation
- 🔔 Browser notifications
- 📱 Works offline
- 🔒 Privacy-focused (all data stored locally)
- 💯 100% free (no paid APIs)

## Tech Stack

- HTML5, CSS3, Vanilla JavaScript
- Leaflet.js + OpenStreetMap for maps
- LocalStorage/IndexedDB for data persistence
- Service Worker for offline functionality
- PWA manifest for installability

## Getting Started

### Development

1. Clone or download this repository
2. Start a local server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Or using Node.js
   npx serve .
   ```
3. Open `http://localhost:8000` in your browser

### Deployment

Deploy to any static hosting service:
- GitHub Pages
- Netlify
- Vercel

**Important**: HTTPS is required for PWA features (Geolocation, Service Worker, Notifications).

## Browser Support

- Chrome 90+ (desktop and mobile)
- Safari 14+ (desktop and mobile)
- Firefox 88+ (desktop and mobile)
- Edge 90+

## License

MIT License - Free to use and modify

## Privacy

ParkingPal Lite stores all data locally on your device. No data is transmitted to external servers (except map tiles from OpenStreetMap).
