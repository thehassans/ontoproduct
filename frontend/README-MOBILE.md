# Mobile App Build Instructions (Android)

This project has been configured with **Capacitor** to allow building an Android .apk file from the existing React codebase.

## Prerequisites
- [Android Studio](https://developer.android.com/studio) installed on your machine.
- Java JDK installed (already verified).

## Steps to Build APK

1. **Update Frontend Build**:
   Ensure your frontend code is built and up to date.
   ```bash
   cd frontend
   npm run build
   npx cap sync
   ```

2. **Open in Android Studio**:
   Use the following command to open the project in Android Studio:
   ```bash
   npx cap open android
   ```
   *Alternatively, launch Android Studio and open the `frontend/android` directory.*

3. **Build the APK**:
   - In Android Studio, wait for Gradle sync to finish.
   - Go to **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
   - Once complete, a popup will appear "APK(s) generated successfully". Click **locate** to find your `.apk` file.
   - You can copy this file to your phone to test.

4. **Release for Play Store**:
   - Go to **Build** > **Generate Signed Bundle / APK**.
   - Choose **Android App Bundle** (best for Play Store) or **APK**.
   - Create a new Key Store (keep your password safe!).
   - Build the release version.
   - Upload the generated `.aab` (bundle) or `.apk` to the Google Play Console.

## Production Build (BuySial Management)

The app is pre-configured to connect to **https://web.buysial.com** when running on a mobile device.

**Built APK Location**:
`frontend/android/app/build/outputs/apk/debug/BuySIalManagement.apk`

**Note**: This is a *Debug* build. For Google Play Store submission, you must generate a **Signed Release Bundle (.aab)** using Android Studio:
1.  Open Project in Android Studio (`npx cap open android`).
2.  Menu: **Build > Generate Signed Bundle / APK**.
3.  Select **Android App Bundle**.
4.  Create a new Key Store and follow the wizard.

## Updates
If you make changes to the React code, simply run:
```bash
npm run build
npx cap sync
```
## iOS App Build

To build the iOS application, executed the following commands in the `frontend` directory:

1.  **Open in Xcode**:
    ```bash
    npx cap open ios
    ```
2.  **Configuration**:
    - Select your Team in Xcode (Signing & Capabilities).
    - Ensure your Bundle Identifier matches what is set in `capacitor.config.json` (`com.buysial.app`).
3.  **Run/Archive**:
    - Connect your iPhone or select a Simulator.
    - Click the Play button to Run.
    - To publish: **Product > Archive**.

**Note**: You must have Xcode installed on your Mac.
