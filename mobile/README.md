# Daily Love For Jesus — Mobile App 📱

> **Cross-Platform React Native application built with Expo SDK 52, NativeWind (Tailwind CSS), and full API integration with the NestJS backend.**

---

## 🌟 Screens & Features

- **Home Screen**: Today's featured devotional card, Verse of the Day, quick actions, and backend connection indicator.
- **Devotionals Screen**: Full daily devotional reader with scripture references, reflections, and prayers.
- **Hymns Screen**: Searchable Christian hymn directory with chorus highlights and category navigation.
- **Bible Screen**: Bible reader with chapter navigation, translation switcher, and back button navigation.
- **Auth Screen**: Supabase authentication with persistent session storage.
- **Offline & Fallback Resilience**: Seamless fallback to offline cached data when offline.

---

## 🚀 Quick Start

### Prerequisites
- Node.js `v24.21.0` (or `>=20.18.0 <=24.x.x`)
- npm `>=10.0.0`
- Expo Go on iOS / Android or Android Studio / Xcode simulators

### Installation
From the root directory:
```bash
npm run install:mobile
```
Or directly inside `mobile/`:
```bash
cd mobile
npm install --legacy-peer-deps
```

### Environment Setup
Create `mobile/.env`:
```bash
cp .env.example .env
```
Key configuration:
- `EXPO_PUBLIC_API_URL`: Points to your NestJS backend (e.g. `http://localhost:4000` on iOS simulator, `http://10.0.2.2:4000` on Android emulator, or your deployed backend URL).
- `EXPO_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key.

### Starting Development Server
```bash
npm run start
```
- Press `a` to open in Android Emulator
- Press `i` to open in iOS Simulator
- Press `w` to open in Web Browser
- Scan the QR code with **Expo Go** on a physical device

---

## 📦 Building for Production (EAS)

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   eas login
   ```
2. Build Android APK / App Bundle (AAB):
   ```bash
   eas build --platform android --profile production
   ```
3. Build iOS IPA:
   ```bash
   eas build --platform ios --profile production
   ```
