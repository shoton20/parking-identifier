# ParkingPal Lite - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Create App Icons

Before running the app, you need to create icons for the PWA:

**Quick Method (for testing):**
1. Go to https://www.pwabuilder.com/imageGenerator
2. Upload any square image (or use a car emoji screenshot)
3. Download the generated icons
4. Place them in the `icons/` folder

**Required icon sizes:**
- icon-192x192.png (minimum for PWA)
- icon-512x512.png (minimum for PWA)

Optional sizes: 72x72, 96x96, 128x128, 144x144, 152x152, 384x384

### Step 2: Start a Local Server

The app requires HTTPS or localhost to work (for GPS and PWA features).

**Option A: Using Python**
```bash
python -m http.server 8000
```

**Option B: Using Node.js**
```bash
npx serve .
```

**Option C: Using PHP**
```bash
php -S localhost:8000
```

### Step 3: Open in Browser

1. Open your browser and go to: `http://localhost:8000`
2. Allow location access when prompted
3. Click "Save Parking Location" to test the app

## 📱 Testing on Mobile

### Test on Your Phone (Same WiFi Network)

1. Find your computer's local IP address:
   - Windows: `ipconfig` (look for IPv4 Address)
   - Mac/Linux: `ifconfig` or `ip addr`

2. On your phone, open browser and go to:
   ```
   http://YOUR_IP_ADDRESS:8000
   ```
   Example: `http://192.168.1.100:8000`

3. Allow location and camera permissions

### Install as PWA on Mobile

1. Open the app in your mobile browser
2. Save a parking location (this triggers the install prompt)
3. Tap "Install App" or use browser menu → "Add to Home Screen"
4. The app icon will appear on your home screen

## 🧪 Testing Features

### Test GPS Location
1. Click "Save Parking Location"
2. Wait for GPS to capture your location
3. You should see your coordinates displayed

### Test Photo Capture
1. During save flow, click "Take Photo" or "Upload Photo"
2. Capture or select an image
3. Photo should be compressed and displayed

### Test Timer
1. During save flow, select a timer duration (e.g., "30 min")
2. Click "Save"
3. You should see the countdown timer

### Test Offline Mode
1. Save a parking location
2. Turn off WiFi/mobile data
3. The app should still work (show "Offline Mode" banner)
4. You can view your saved location and navigate

### Test Map
1. After saving a location, you should see a map
2. Blue dot = your current location
3. Car icon = your parked car
4. Map should show distance and direction

## 🐛 Troubleshooting

### "Location access denied"
- Check browser permissions (click lock icon in address bar)
- Enable location services on your device
- Try refreshing the page

### "Camera not available"
- Use "Upload Photo" instead of "Take Photo"
- Check browser camera permissions
- Some browsers don't support camera on HTTP (use HTTPS or localhost)

### Map tiles not loading
- Check internet connection
- Map tiles come from OpenStreetMap (free, no API key needed)
- Tiles are cached for offline use after first load

### Service Worker not registering
- Service Workers require HTTPS or localhost
- Check browser console for errors
- Try clearing browser cache and reloading

### Icons not showing
- Make sure you created the icons in the `icons/` folder
- Required: icon-192x192.png and icon-512x512.png
- Check manifest.json paths match your icon filenames

## 📦 Deployment

### Deploy to GitHub Pages

1. Create a GitHub repository
2. Push your code
3. Go to Settings → Pages
4. Select branch and folder
5. Your app will be live at: `https://username.github.io/repo-name`

### Deploy to Netlify

1. Sign up at https://netlify.com
2. Drag and drop your project folder
3. Your app will be live instantly with HTTPS

### Deploy to Vercel

1. Sign up at https://vercel.com
2. Import your GitHub repository
3. Deploy with one click

## 🎯 Next Steps

1. **Customize the design** - Edit `styles/main.css`
2. **Add more features** - Check `tasks.md` for optional features
3. **Test thoroughly** - Try all features on different devices
4. **Share with friends** - Get feedback and improve

## 💡 Tips

- **Test on real devices** - GPS works better on phones than laptops
- **Use in a parking lot** - Walk around to test navigation
- **Try offline mode** - Turn off internet after saving location
- **Set short timers** - Test with 1-2 minute timers for quick feedback
- **Take photos** - Photos help you remember where you parked

## 🆘 Need Help?

- Check the browser console for error messages (F12)
- Review the code comments in each file
- Check the spec documents in `.kiro/specs/parking-pal-lite/`

Happy parking! 🚗
