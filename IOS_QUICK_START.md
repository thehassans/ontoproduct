# Quick Start: iOS Apps for BuySial

## ⚡ Fastest Path to iOS App

### Prerequisites
- Mac with Xcode installed
- CocoaPods: `sudo gem install cocoapods`

### Option 1: Automated Script (Recommended)
```bash
cd /Users/hassansarwar/Desktop/changing\ buysial/changingbuysial
./build-ios.sh
```

This script will:
- ✅ Build frontend (or use existing)
- ✅ Copy assets to iOS
- ✅ Install CocoaPods dependencies
- ✅ Create Xcode workspace

### Option 2: Manual Steps
```bash
cd frontend

# 1. Build (if needed)
npm run build

# 2. Try to sync (may timeout)
npx cap sync ios

# 3. Install pods
cd ios/App
pod install
cd ../..

# 4. Open in Xcode
open ios/App/App.xcworkspace
```

---

## 🎯 In Xcode

1. **Select Target**: Click "App" in the left sidebar
2. **Signing**: 
   - Go to "Signing & Capabilities"
   - Check "Automatically manage signing"
   - Select your Team
3. **Run**: Select device/simulator and click ▶️ (or Cmd+R)

---

## 📱 Two Apps Setup

### Management App (Current)
- Bundle ID: `com.buysial.management`
- Name: "BuySial Management"

### E-Commerce App (Future)
1. Modify `capacitor.config.json`:
   ```json
   {
     "appId": "com.buysial.store",
     "appName": "BuySial Store"
   }
   ```
2. Rebuild: `npm run build`
3. Sync: `npx cap sync ios`
4. Update Xcode bundle ID

---

## 🔧 Troubleshooting

**Network Timeouts?**
- The iOS platform files already exist
- Just run `pod install` in `ios/App/`
- Then open workspace in Xcode

**App Won't Build?**
- Clean: Product → Clean Build Folder
- Verify `dist/` folder has files
- Check `capacitor.config.json` exists

**White Screen?**
- Ensure `npm run build` completed
- Check `dist/index.html` exists
- Run `npx cap copy ios` again

---

## 📖 Full Documentation

See **[IOS_SETUP_GUIDE.md](file:///Users/hassansarwar/Desktop/changing%20buysial/changingbuysial/IOS_SETUP_GUIDE.md)** for complete instructions.
