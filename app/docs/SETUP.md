# Setup Guide - Daily Love For Jesus

## Prerequisites

- **Node.js**: v20+ (download from [nodejs.org](https://nodejs.org))
- **npm**: v10+ (included with Node)
- **Git**: For version control
- **Expo CLI**: `npm install -g expo-cli`

### Verify Installation

```bash
2    # Should show v20.x.x
npm --version     # Should show 10.x.x
expo --version    # Should show latest
```

## 1. Install Project Dependencies

```bash
cd app
npm install
```

This installs:
- React Native + Expo
- Nativewind (Tailwind for React Native)
- Hono.js (backend)
- Drizzle ORM (database)
- Type definitions

### Troubleshooting Dependencies

If you get errors:

```bash
# Clear cache
npm cache clean --force

# Delete node_modules and reinstall
rm -r node_modules
npm install
```

## 2. Environment Setup

Create `.env.local` in the `app/` directory:

```bash
# Backend API
VITE_API_URL=http://localhost:3000

# Database (local SQLite for development)
DATABASE_URL=file:./dev.db

# JWT Secret (for local testing)
JWT_SECRET=dev-secret-key-change-in-production

# AWS S3 (if using for media)
AWS_ACCESS_KEY_ID=your_key_here
AWS_SECRET_ACCESS_KEY=your_secret_here

# Firebase (for push notifications - optional)
FIREBASE_PROJECT_ID=your_project_id
```

## 3. Database Setup

### Initialize SQLite (Local)

```bash
npm run db:generate    # Generate migrations
npm run db:push        # Create local database
```

### Seed Sample Data

```bash
npm run db:seed        # Load Bible, hymns, devotionals
```

## 4. Start Development

### Option A: Expo CLI (Recommended)

```bash
npm run dev
# This starts:
# - Backend API at http://localhost:3000/api
# - Expo dev server at http://localhost:8081
# - Web app at http://localhost:5173
```

### Option B: Vite Dev Server

```bash
npm run dev

# In another terminal, for backend only:
npm run dev:api
```

## 5. Mobile Development

### iOS (Mac only)

```bash
npx expo start --ios
# Opens iOS Simulator automatically
# HMR (Hot Module Reload) works for instant updates
```

### Android

```bash
# Install Android Studio first, then:

npx expo start --android

# Opens Android Emulator
```

### Web

```bash
npx expo start --web
# Opens http://localhost:5173 in browser
```

## 6. Testing the App

### Run Unit Tests

```bash
npm run test
# Watches for changes with Vitest
```

### Type Checking

```bash
npm run check
# Validates all TypeScript files
```

### Linting

```bash
npm run lint
# Checks code style and issues
```

### Format Code

```bash
npm run format
# Fixes formatting with Prettier
```

## 7. Building for Production

### Web Build

```bash
npm run build
# Creates optimized build in dist/
```

### Mobile Build with EAS

#### Setup EAS

```bash
npm install -g eas-cli
eas login
# Enter your Expo credentials
```

#### Build for iOS

```bash
eas build --platform ios
# Creates development build for testing
# Or: eas build --platform ios --auto-submit
# To automatically submit to App Store
```

#### Build for Android

```bash
eas build --platform android
# Creates APK or AAB for Google Play
```

#### Build All Platforms

```bash
eas build --platform all
```

## 8. Deploying to Production

### Web Deployment (Vercel)

```bash
npm install -g vercel
npm run build
vercel
# Follow prompts to deploy to Vercel
```

### iOS App Store

```bash
eas submit --platform ios
# Submits latest build for review
```

### Android Google Play

```bash
eas submit --platform android
# Submits latest build for review
```

### Web Deployment

```bash
vercel deploy --prod
```

## 9. Database Management

### Connect to Remote Database

Once deployed, update `.env.production`:

```
DATABASE_URL=postgresql://user:password@neon.tech/db
```

### Run Migrations

```bash
npm run db:migrate
# Applies pending migrations to production
```

### Backup Database

```bash
# Neon PostgreSQL automatic daily backups
# Restore: Contact Neon support or use Neon Console
```

## 10. Monitoring & Debugging

### View Logs

```bash
# Local development
npm run dev

# Production (Vercel)
vercel logs

# Mobile (Expo)
# Check console in simulator/device
```

### React DevTools

```bash
# Install extension in browser
# For React Native: npx react-native-debugger
```

### Performance Monitoring

```bash
# Use React Query DevTools in dev mode
# See: src/providers/trpc.tsx
```

## 11. Troubleshooting

### "Cannot find module" errors

```bash
# Clear cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Port 3000 already in use

```bash
# Use different port
npm run dev -- --port 3001

# Or kill existing process
# macOS/Linux:
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### TypeScript errors

```bash
npm run check
# Shows all type errors

# Fix issues in affected files, then:
npm run format
```

### Expo Build Fails

```bash
# Clear Expo cache
expo prebuild --clean

# Rebuild
eas build --platform all --clear-cache
```

## 12. Development Workflow

### Feature Development

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes
# ... edit files ...

# Test
npm run test
npm run check
npm run lint

# Format code
npm run format

# Commit
git add .
git commit -m "feat: add new feature"

# Push & create PR
git push origin feature/new-feature
```

### Before Deployment

```bash
# Run full test suite
npm run test
npm run check
npm run lint

# Build for all platforms
npm run build
eas build --platform all

# Test in actual simulators/devices
npx expo start --ios
npx expo start --android
```

## 13. Key Development Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server (all platforms) |
| `npm run build` | Build for production |
| `npm run test` | Run tests |
| `npm run lint` | Check code style |
| `npm run check` | Type check |
| `npm run format` | Format code |
| `npm run db:generate` | Generate DB migrations |
| `npm run db:push` | Apply migrations |
| `npm run db:seed` | Load sample data |

## 14. Resources

- [Expo Documentation](https://docs.expo.dev)
- [React Native API](https://reactnative.dev/docs/getting-started)
- [Nativewind Documentation](https://www.nativewind.dev)
- [Hono.js Guide](https://hono.dev)
- [Drizzle ORM](https://orm.drizzle.team)

## Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Setup environment: Create `.env.local`
3. ✅ Initialize database: `npm run db:push`
4. ⏳ Start development: `npm run dev`
5. ⏳ Begin feature development
