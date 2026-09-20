Getting started with the Expo mobile scaffold

This folder contains a minimal Expo-managed scaffold. To create and run the app locally, follow these steps:

1. Install `expo-cli` (optional) or use `npx`:

```bash
# using npx (recommended, no global install)
npx create-expo-app mobile --template blank
# or if you prefer, globally:
npm install -g expo-cli
expo init mobile
```

2. Move into the folder and start the dev server:

```bash
cd mobile
npm install
npm run start
# then open on a device via Expo Go or run on emulator
```

Notes:
- We intentionally created a minimal scaffold here. Running `npx create-expo-app` will populate the project with the correct `dependencies` and native templates.
- For a native-first, glassmorphism UI, we'll use `nativewind` + `tailwindcss` and `expo-updates` for OTA releases.

Quick setup (run locally):

```bash
cd mobile
# install core Expo deps
npm install

# install NativeWind + Tailwind (optional; recommended for glassmorphism UI)
npm install nativewind tailwindcss postcss autoprefixer

# initialize Tailwind config (creates tailwind.config.js + postcss.config.js)
npx tailwindcss init -p

# start Expo dev server
npm run start
```

NativeWind notes:
- We've added `babel.config.js`, `tailwind.config.js`, and a starter `App.tsx` that uses Tailwind classNames via NativeWind.
- A reusable `GlassCard` component is in `src/components/GlassCard.tsx` to help you build the glassmorphism UI.

Branding
- App title: Daily Love For Jesus
- Footer: Powered by ForLove Media

Next steps I can take here:
- Add more example screens and wire an API client to the web backend.
- Create CI/CD workflows for Expo Updates (OTAs) and publish automation.

Run the install locally and tell me when it's done; I'll then add the glassmorphism screens and polish styles.
