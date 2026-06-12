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
- For a native-first, glassmorphism UI, we'll use `nativewind` + `tailwindcss` and `expo-updates` for OTA releases. I can add those packages once you confirm you want me to install them.

Next steps I can take:
- Run `npx create-expo-app mobile` here (requires network and will install dependencies).
- Add `nativewind` + `tailwindcss` config and example components.
- Integrate shared design tokens and type-safe API client.

Tell me which of the above to proceed with or if you want me to run the full `create-expo-app` now.
