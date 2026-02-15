# System Diagnostics & Troubleshooting

## File System Timeout Issues

### Symptoms
- Commands failing with `ETIMEDOUT` errors
- File read/write operations timing out
- `cat`, `npm`, and other file operations hanging

### Possible Causes
1. **Network File System Issues** - If your Desktop is synced (iCloud, Dropbox, etc.)
2. **Disk I/O Problems** - Failing hard drive or SSD
3. **Antivirus/Security Software** - Scanning slowing down file access
4. **Low Disk Space** - System running out of storage
5. **Corrupted File System** - Permissions or meta data issues

### Diagnostic Commands

```bash
# Check disk space
df -h

# Check disk health
diskutil verifyDisk disk0

# Check for iCloud sync
ls -la ~/Desktop/ | grep @

# Check running processes
top -o cpu

# Check system logs
log show --predicate 'eventMessage contains "timeout"' --last 10m
```

### Solutions

#### 1. Move Project Out of Cloud-Synced Folder
```bash
# If Desktop is syncing to iCloud/Dropbox
cd ~
mkdir Projects
cp -R ~/Desktop/changing\ buysial ~/Projects/
cd ~/Projects/changing\ buysial
```

#### 2. Repair Disk Permissions
```bash
sudo diskutil repairPermissions /
```

#### 3. Restart File System Daemons
```bash
sudo killall -HUP mDNSResponder
sudo killall Finder
```

#### 4. Disable Real-Time Antivirus Scanning
- Temporarily disable antivirus for the project directory
- Add project folder to antivirus exclusions

#### 5. Free Up Disk Space
```bash
# Check what's using space
du -sh ~/Library/Caches/*
du -sh ~/Downloads/*

# Clean npm cache
npm cache clean --force

# Clean CocoaPods cache
pod cache clean --all

# Clean Xcode derived data
rm -rf ~/Library/Developer/Xcode/DerivedData
```

#### 6. Restart Your Mac
Sometimes a simple restart resolves file system issues.

## iOS Build Troubleshooting

### Issue: "Missing appId"
**Solution**: Create capacitor.config.json with valid appId
```json
{
  "appId": "com.buysial.management",
  "appName": "BuySial Management",
  "webDir": "dist"
}
```

### Issue: "No Podfile found"
**Solution**: iOS platform not properly initialized
```bash
npx cap add ios
```

### Issue: Xcode workspace not created
**Solution**: Run pod install
```bash
cd frontend/ios/App
pod install
```

### Issue: Network timeouts during npm/npx
**Solutions**:
1. Use different network (mobile hotspot, VPN)
2. Update npm registry: `npm config set registry https://registry.npmjs.org/`
3. Clear npm cache: `npm cache clean --force`

### Issue: White screen in iOS app
**Checks**:
1. Verify dist folder exists: `ls -la frontend/dist/`
2. Check capacitor.config.json webDir points to "dist"
3. Re-run: `npx cap copy ios`

### Issue: Build fails in Xcode
**Solutions**:
1. Clean build: Product → Clean Build Folder (Cmd+Shift+K)
2. Delete derived data
3. Reinstall pods:
   ```bash
   cd frontend/ios/App
   pod deintegrate
   pod install
   ```

## Required Software Versions

- **macOS**: 11.0 or later
- **Xcode**: 14.0 or later
- **Node.js**: 16.0 or later
- **npm**: 8.0 or later
- **CocoaPods**: 1.11 or later

## Verify Installation

```bash
# Check versions
node --version      # Should be v16+
npm --version       # Should be 8+
pod --version       # Should be 1.11+
xcodebuild -version # Should be 14+

# Check Capacitor
npx cap --version   # Should be 8.0.0

# Check iOS platform
ls -la frontend/ios/
```

## Emergency Manual Setup

If all automated methods fail, follow manual steps:

1. **Create capacitor.config.json manually in Xcode or text editor**
2. **Run commands one by one** with long wait times between
3. **Use Xcode UI** to create new iOS app and manually copy files
4. **Contact support** if persistent issues remain

## Getting Help

If you continue experiencing issues:

1. **Export system diagnostics**:
   ```bash
   system_profiler SPSoftwareDataType > system_info.txt
   df -h > disk_info.txt
   ```

2. **Check project status**:
   ```bash
   cd frontend
   npx cap doctor
   ```

3. **Create minimal test project** to isolate issue:
   ```bash
   npx @capacitor/cli create
   ```
