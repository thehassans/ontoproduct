# iOS Capacitor Apps Setup Guide

## Prerequisites Checklist
- [ ] Mac with macOS 11+ installed
- [ ] Xcode 14+ installed from App Store
- [ ] Xcode Command Line Tools: `xcode-select --install`
- [ ] CocoaPods installed: `sudo gem install cocoapods`
- [ ] Node.js and npm installed
- [ ] Apple Developer Account (for physical device testing/deployment)

---

## Part 1: Build & Sync iOS Platform

### Step 1: Build the Frontend
```bash
cd /Users/hassansarwar/Desktop/changing\ buysial/changingbuysial/frontend

# Build the production frontend
npm run build
```

### Step 2: Sync Capacitor to iOS
```bash
# This copies web assets to iOS and updates native dependencies
npx cap sync ios
```

If you encounter network timeouts, try:
```bash
# Alternative: Update iOS platform only
npx cap update ios

# Then copy web assets
npx cap copy ios
```

### Step 3: Install CocoaPods Dependencies
```bash
cd ios/App
pod install
cd ../..
```

This creates the `.xcworkspace` file needed for Xcode.

---

## Part 2: Configure iOS App in Xcode

### Step 4: Open Project in Xcode
```bash
# Open the workspace (NOT the .xcodeproj file)
open ios/App/App.xcworkspace
```

### Step 5: Configure App Settings

#### A. General Tab
1. **Display Name**: "BuySial Management" (or "BuySial Store" for e-commerce)
2. **Bundle Identifier**: `com.buysial.management` (or `.store`)
3. **Version**: `1.0.0`
4. **Build**: `1`
5. **Deployment Target**: iOS 14.0 or higher
6. **Device Orientation**: Portrait, Landscape Left, Landscape Right

#### B. Signing & Capabilities Tab
1. Click **"+ Capability"** to add:
   - **Push Notifications** (if needed)
   - **Background Modes** > Check "Remote notifications"
   - **Camera** (if product scanning/uploads needed)
   - **Photo Library**
2. **Automatically manage signing**: Enable
3. **Team**: Select your Apple Developer team

### Step 6: Configure Info.plist

In Xcode, find **Info.plist** and add these permissions:

```xml
<key>NSCameraUsageDescription</key>
<string>We need camera access to scan products and upload images</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>We need photo library access to select and upload product images</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>We need your location to provide accurate delivery estimates</string>
```

### Step 7: Update App Icons
1. In Xcode navigator, find `Assets.xcassets > AppIcon`
2. Drag and drop app icons (1024x1024 for App Store, various sizes for device)
3. **Generate icons**: Use online tools like [AppIcon.co](https://www.appicon.co/)

### Step 8: Configure Splash Screen
1. Find `App > public > splash.png`
2. Replace with your custom splash screen (2732x2732 recommended)

---

## Part 3: Test on Simulator

### Step 9: Run on iOS Simulator
In Xcode:
1. Select a simulator (e.g., "iPhone 15 Pro")
2. Click **▶ Run** button (or Cmd+R)
3. App should launch in simulator

Or via terminal:
```bash
npx cap run ios
```

### Step 10: Test Core Features
- [ ] App launches without crashes
- [ ] Login screen loads
- [ ] Navigation between pages works
- [ ] API calls connect to `https://web.buysial.com`
- [ ] Images load properly
- [ ] Theme toggle works

---

## Part 4: Test on Physical iPhone

### Step 11: Connect iPhone
1. Plug iPhone into Mac via USB
2. Trust computer on iPhone
3. In Xcode, select your iPhone from device dropdown
4. Click **▶ Run**

### Step 12: Trust Developer Certificate
On your iPhone:
1. Go to **Settings > General > VPN & Device Management**
2. Find your developer certificate
3. Tap **Trust**

### Step 13: Launch App
- App should now run on your physical device
- Test all features, especially camera, location, notifications

---

## Part 5: Create E-Commerce Version (Optional)

To create a separate **E-Commerce** iOS app:

### Step 14: Modify capacitor.config.json
```json
{
  "appId": "com.buysial.store",
  "appName": "BuySial Store",
  "webDir": "dist",
  "server": {
    "url": "https://web.buysial.com",
    "cleartext": true
  },
  "ios": {
    "contentInset": "always"
  }
}
```

### Step 15: Update App Entry Point
Modify `frontend/src/main.jsx` or create environment variable to show only e-commerce routes:
```javascript
const IS_ECOMMERCE_APP = import.meta.env.VITE_APP_MODE === 'ecommerce'
```

### Step 16: Rebuild & Sync
```bash
VITE_APP_MODE=ecommerce npm run build
npx cap sync ios
```

### Step 17: Update Xcode Settings
- Change **Display Name** to "BuySial Store"
- Change **Bundle ID** to `com.buysial.store`
- Update app icons to e-commerce branding

---

## Part 6: Build for Distribution

### Step 18: Archive App
1. In Xcode, select **Any iOS Device** (not simulator)
2. Click **Product > Archive**
3. Wait for build to complete

### Step 19: Distribute to TestFlight
1. In Organizer (opens automatically after archive)
2. Click **Distribute App**
3. Choose **App Store Connect**
4. Follow prompts to upload

### Step 20: App Store Submission
1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Create new app listing
3. Fill in all required metadata
4. Submit for review

---

## Troubleshooting

### Issue: "No Podfile found"
**Solution**:
```bash
cd ios/App
pod init
# Edit Podfile to include Capacitor dependencies
pod install
```

### Issue: Network timeouts during sync
**Solution**:
- Check internet connection
- Try using a VPN or different network
- Run `npx cap copy ios` instead of `sync`

### Issue: App crashes on launch
**Solution**:
- Check Xcode console for error messages
- Verify `capacitor.config.json` has correct webDir
- Ensure `dist` folder contains built files
- Clean build: Product > Clean Build Folder

### Issue: White screen on launch
**Solution**:
- Check that frontend is built: `npm run build`
- Verify `dist` folder exists
- Run `npx cap copy ios` to copy web assets
- Check server URL in capacitor config

---

## Quick Reference Commands

```bash
# Build frontend
npm run build

# Sync to iOS
npx cap sync ios

# Open in Xcode
npx cap open ios

# Run on simulator
npx cap run ios

# Update dependencies
cd ios/App && pod update && cd ../..
```

---

## Next Steps

Once iOS apps are working:
1. Set up CI/CD for automated builds
2. Configure push notifications (Firebase Cloud Messaging)
3. Add analytics (Firebase Analytics, Mixpanel)
4. Implement in-app purchases (if needed)
5. Set up crash reporting (Sentry, Crashlytics)
