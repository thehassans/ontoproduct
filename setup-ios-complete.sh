#!/bin/bash

# ============================================================================
# BuySial iOS Complete Setup Script
# ============================================================================
# This script sets up iOS platform for BuySial Management app
# Run this when your file system is stable (no timeout errors)
# ============================================================================

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         BuySial iOS Platform Complete Setup               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_info() { echo "ℹ $1"; }

# ============================================================================
# Step 0: System Diagnostics
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 0: System Diagnostics"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

print_info "Checking disk space..."
df -h | grep -E "/$|Filesystem"

print_info "Checking Node.js version..."
node --version || print_error "Node.js not found!"

print_info "Checking npm version..."
npm --version || print_error "npm not found!"

print_info "Checking CocoaPods..."
pod --version || print_warning "CocoaPods not installed! Run: sudo gem install cocoapods"

print_info "Checking Xcode..."
xcodebuild -version || print_warning "Xcode not found or not configured!"

echo ""

# ============================================================================
# Step 1: Navigate to Frontend
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Navigate to Frontend Directory"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$(dirname "$0")/frontend" || {
    print_error "Failed to navigate to frontend directory!"
    exit 1
}
print_success "Working directory: $(pwd)"
echo ""

# ============================================================================
# Step 2: Create Capacitor Config
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Create Capacitor Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "capacitor.config.json" ]; then
    print_warning "capacitor.config.json already exists"
    echo "Current config:"
    cat capacitor.config.json
    read -p "Overwrite? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Keeping existing config"
    else
        rm capacitor.config.json
    fi
fi

if [ ! -f "capacitor.config.json" ]; then
    print_info "Creating capacitor.config.json..."
    cat > capacitor.config.json << 'EOF'
{
  "appId": "com.buysial.management",
  "appName": "BuySial Management",
  "webDir": "dist",
  "server": {
    "url": "https://web.buysial.com",
    "cleartext": true
  },
  "ios": {
    "contentInset": "always"
  },
  "android": {
    "buildOptions": {
      "keystorePath": "",
      "keystoreAlias": ""
    }
  }
}
EOF
    print_success "Created capacitor.config.json"
else
    print_success "Using existing capacitor.config.json"
fi
echo ""

# ============================================================================
# Step 3: Build Frontend
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Build Frontend Application"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -d "dist" ] && [ "$(ls -A dist)" ]; then
    DIST_DATE=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" dist 2>/dev/null || echo "unknown")
    print_warning "dist folder already exists (from $DIST_DATE)"
    read -p "Rebuild? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Building frontend..."
        npm run build || {
            print_error "Build failed! Check errors above."
            exit 1
        }
        print_success "Frontend built successfully"
    else
        print_info "Using existing dist folder"
    fi
else
    print_info "Building frontend..."
    npm run build || {
        print_error "Build failed! Check errors above."
        exit 1
    }
    print_success "Frontend built successfully"
fi
echo ""

# ============================================================================
# Step 4: Add/Initialize iOS Platform
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4: Initialize iOS Platform"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -d "ios" ]; then
    print_warning "iOS platform directory already exists"
    read -p "Reinitialize? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Removing old iOS platform..."
        rm -rf ios
        print_info "Adding iOS platform..."
        npx cap add ios || {
            print_error "Failed to add iOS platform!"
            print_info "Try running manually: npx cap add ios"
            exit 1
        }
        print_success "iOS platform added"
    else
        print_info "Using existing iOS platform"
    fi
else
    print_info "Adding iOS platform..."
    npx cap add ios || {
        print_error "Failed to add iOS platform!"
        print_info "Try running manually: npx cap add ios"
        exit 1
    }
    print_success "iOS platform added"
fi
echo ""

# ============================================================================
# Step 5: Sync Web Assets to iOS
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 5: Sync Web Assets to iOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

print_info "Copying web assets to iOS platform..."
npx cap copy ios || {
    print_warning "Asset copy failed, trying sync instead..."
    npx cap sync ios || print_warning "Sync also failed - you may need to run this manually"
}
print_success "Web assets synced to iOS"
echo ""

# ============================================================================
# Step 6: Install CocoaPods Dependencies
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 6: Install CocoaPods Dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd ios/App || {
    print_error "ios/App directory not found!"
    print_info "iOS platform may not be properly initialized"
    exit 1
}

if [ ! -f "Podfile" ]; then
    print_error "Podfile not found! iOS platform is incomplete."
    print_info "Try running: npx cap add ios"
    exit 1
fi

print_info "Installing CocoaPods dependencies (this may take a few minutes)..."
pod install || {
    print_warning "pod install failed, trying pod update..."
    pod update || {
        print_error "CocoaPods installation failed!"
        print_info "Troubleshooting steps:"
        print_info "1. Update CocoaPods: sudo gem install cocoapods"
        print_info "2. Clear cache: pod cache clean --all"
        print_info "3. Try again: pod install"
        exit 1
    }
}

cd ../..
print_success "CocoaPods dependencies installed"
echo ""

# ============================================================================
# Step 7: Verify Setup
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 7: Verify Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ERRORS=0

# Check for Xcode workspace
if [ -f "ios/App/App.xcworkspace" ]; then
    print_success "Xcode workspace created"
else
    print_error "Xcode workspace NOT found!"
    ERRORS=$((ERRORS + 1))
fi

# Check for Pods
if [ -d "ios/App/Pods" ]; then
    print_success "CocoaPods installed"
else
    print_warning "Pods directory not found"
fi

# Check for dist folder
if [ -d "dist" ] && [ "$(ls -A dist)" ]; then
    print_success "Frontend build exists"
else
    print_error "Frontend build NOT found!"
    ERRORS=$((ERRORS + 1))
fi

# Check capacitor config
if [ -f "capacitor.config.json" ]; then
    print_success "Capacitor config exists"
else
    print_error "Capacitor config NOT found!"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# ============================================================================
# Final Summary
# ============================================================================
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    Setup Complete!                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

if [ $ERRORS -eq 0 ]; then
    print_success "All checks passed! iOS platform is ready."
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎯 Next Steps:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "1. Open in Xcode:"
    echo "   open ios/App/App.xcworkspace"
    echo ""
    echo "2. Configure Signing:"
    echo "   - Select 'App' target in Xcode"
    echo "   - Go to 'Signing & Capabilities'"
    echo "   - Enable 'Automatically manage signing'"
    echo "   - Select your Team"
    echo ""
    echo "3. Run the app:"
    echo "   - Select a simulator or device"
    echo "   - Click Run (▶) or press Cmd+R"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📱 To create E-Commerce app:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "1. Change appId in capacitor.config.json to:"
    echo "   \"com.buysial.store\""
    echo ""
    echo "2. Change appName to:"
    echo "   \"BuySial Store\""
    echo ""
    echo "3. Rebuild and sync:"
    echo "   npm run build && npx cap sync ios"
    echo ""
else
    print_error "$ERRORS error(s) found! Please fix them before proceeding."
    echo ""
    echo "Common fixes:"
    echo "- Run 'npx cap sync ios' manually"
    echo "- Check internet connection"
    echo "- Verify Xcode is installed"
    echo "- Update CocoaPods: sudo gem install cocoapods"
fi

echo ""
echo "For detailed troubleshooting, see: IOS_SETUP_GUIDE.md"
echo ""
