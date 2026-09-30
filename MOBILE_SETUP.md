# Mobile Setup & Integration Guide: Daily Love For Jesus 📱

> **Guide for configuring, running, and deploying the React Native / Expo SDK 52 mobile application with the NestJS modular backend.**

---

## 1. 🏗️ Architecture & Connectivity

The mobile application is a cross-platform client (iOS & Android) that connects directly to the NestJS backend API:

```
┌──────────────────────────────────────────────┐
│       Expo SDK 52 / React Native App         │
│  - HomeScreen (Today Devotional + Scripture) │
│  - DevotionalsScreen (Reader & Archive)      │
│  - HymnsScreen (Lyrics Directory)            │
│  - BibleScreen (Scripture Navigation)        │
│  - AuthScreen (Supabase Authentication)      │
└──────────────────────┬───────────────────────┘
                       │
       REST / OpenAPI  │  (EXPO_PUBLIC_API_URL)
                       ▼
┌──────────────────────────────────────────────┐
│           NestJS Enterprise Backend          │
│            Listening on Port 4000            │
└──────────────────────────────────────────────┘
```

---

## 2. 🔑 Environment Configuration

Create `mobile/.env` (using [`mobile/.env.example`](mobile/.env.example)):

```env
# Base API URL pointing to the NestJS backend
# For local Android emulator: http://10.0.2.2:4000
# For local iOS simulator: http://localhost:4000
# For production: https://your-backend.railway.app
EXPO_PUBLIC_API_URL=http://localhost:4000

# Supabase Auth Integration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

> [!NOTE]
> All mobile environment variables are prefixed with `EXPO_PUBLIC_` so they are available inside the Expo runtime bundle without secret leakage.

---

## 3. 🚀 Running Locally

### Step 1: Install Dependencies
From the project root:
```bash
npm run install:mobile
```
Or inside `mobile/`:
```bash
cd mobile
npm install --legacy-peer-deps
```

### Step 2: Ensure NestJS Backend Is Running
In a separate terminal:
```bash
npm run dev:backend
```
Confirm the backend is alive by checking `http://localhost:4000/api/sync/health`.

### Step 3: Start Expo Development Server
```bash
cd mobile
npm run start
```

- **Android Emulator**: Press `a` (automatic fallback mapping `http://10.0.2.2:4000`).
- **iOS Simulator**: Press `i` (connects to `http://localhost:4000`).
- **Web Browser**: Press `w`.
- **Physical Device**: Scan the terminal QR code using the **Expo Go** app (ensure phone and computer are on the same Wi-Fi, and set `EXPO_PUBLIC_API_URL` to your computer's local IP address like `http://192.168.1.50:4000`).

---

## 4. 📦 Production Builds (EAS Build)

1. **Install EAS CLI**:
   ```bash
   npm install -g eas-cli
   eas login
   ```

2. **Configure Project**:
   ```bash
   cd mobile
   eas build:configure
   ```

3. **Build Android Release**:
   ```bash
   # Standalone installable APK:
   eas build --platform android --profile preview

   # Production Google Play App Bundle (AAB):
   eas build --platform android --profile production
   ```

4. **Build iOS Release**:
   ```bash
   eas build --platform ios --profile production
   ```

---

## 5. 🩺 Verification Checklist

- [x] App loads clean with native navigation
- [x] Connection banner shows `Connected (NestJS Backend)`
- [x] Today's devotional loads from `/api/devotionals/today`
- [x] Christian hymns load with lyrics and categories
- [x] Bible screen allows chapter navigation with back button support
- [x] Auth screen enables Supabase email sign-in / registration
