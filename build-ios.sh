#!/bin/bash

# BuySial iOS Build Script
# This script automates the iOS build process for Capacitor apps

set -e  # Exit on error

echo "🚀 Starting iOS Build Process..."
echo ""

# Step 1: Navigate to frontend directory
cd "$(dirname "$0")/frontend"
echo "📁 Working directory: $(pwd)"
echo ""

# Step 2: Check if dist folder exists  
if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
    echo "⚠️  No dist folder found. Building frontend..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "❌ Frontend build failed!"
        exit 1
    fi
    echo "✅ Frontend built successfully"
else
    echo "✅ Using existing dist folder from: $(stat -f "%Sm" dist)"
fi
echo ""

# Step 3: Copy web assets to iOS
echo "📦 Copying web assets to iOS platform..."
npx cap copy ios 2>&1 || {
    echo "⚠️  Capacitor copy failed, but continuing..."
    echo "   You may need to run 'npx cap sync ios' manually when network is stable"
}
echo ""

# Step 4: Install CocoaPods dependencies
echo "📚 Installing CocoaPods dependencies..."
cd ios/App

if [ ! -f "Podfile" ]; then
    echo "⚠️  No Podfile found! Initializing CocoaPods..."
    pod init
fi

pod install 2>&1 || {
    echo "⚠️  Pod install failed. Trying pod update..."
    pod update || {
        echo "❌ CocoaPods installation failed!"
        echo "   Please check your internet connection and try again"
        exit 1
    }
}
cd ../..
echo "✅ CocoaPods dependencies installed"
echo ""

# Step 5: Check if workspace was created
if [ -f "ios/App/App.xcworkspace" ]; then
    echo "✅ Xcode workspace created successfully!"
    echo ""
    echo "🎯 Next steps:"
    echo "   1. Open the workspace in Xcode:"
    echo "      open ios/App/App.xcworkspace"
    echo ""
    echo "   2. Configure signing in Xcode:"
    echo "      - Select the App target"
    echo "      - Go to 'Signing & Capabilities'"
    echo "      - Enable 'Automatically manage signing'"
    echo "      - Select your development team"
    echo ""
    echo "   3. Run on simulator or device:"
    echo "      - Select your target device"
    echo "      - Click the Run button (▶️) or press Cmd+R"
    echo ""
    echo "✨ iOS build preparation complete!"
else
    echo "⚠️  Xcode workspace not found. You may need to:"
    echo "   1. Run 'npx cap sync ios' when network is available"
    echo "   2. Or manually open ios/App/App.xcodeproj"
fi
