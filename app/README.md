# Daily Love For Jesus - Native Mobile App

A premium cross-platform devotional app featuring Bible passages, hymns, and daily devotionals with offline capability and glassmorphism UI.

## 🎯 Project Vision

- **Native-First**: iOS, Android, Web from a single codebase
- **Offline-First**: Works without internet, syncs weekly
- **Zero-Cost**: Built entirely on free infrastructure  
- **Production-Ready**: Scalable from 1 to 1M+ users
- **Premium UI**: Glassmorphism design with smooth animations

## 🏗️ Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for complete technical overview.

### Technology Stack

- **Frontend**: React Native + Expo + Nativewind (TypeScript)
- **Backend**: Hono.js on Vercel (serverless)
- **Database**: Neon PostgreSQL + local SQLite
- **Updates**: Expo OTA (Over-the-Air updates)
- **Styling**: Nativewind + Tailwind CSS
- **Authentication**: JWT with secure storage

### Free Infrastructure

| Service | Tier | Monthly Cost |
|---------|------|--------------|
| Expo | Developer | $0 |
| Vercel | Hobby | $0 |
| Neon PostgreSQL | Free | $0 |
| Vercel Blob | 100GB | $0 |
| **Total** | | **$0** |

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm or yarn
- Expo CLI: `npm install -g expo-cli`

### Setup

```bash
# Install dependencies
npm install

# Start development
npm run dev

# Build for web
npm run build

# Deploy to Vercel
npm run deploy
```

## 📁 Project Structure

```
app/
├── src/
│   ├── app/              # App navigation & routing
│   ├── features/         # Feature modules
│   │   ├── bible/
│   │   ├── hymns/
│   │   ├── devotionals/
│   │   └── auth/
│   ├── components/
│   │   └── ui/          # Glassmorphism UI components
│   └── lib/
│       ├── db.ts        # SQLite local database
│       ├── sync.ts      # Weekly sync engine
│       └── updates.ts   # OTA update manager
│
├── api/                 # Vercel serverless functions
├── contracts/           # Shared types
└── db/                  # Database schemas & migrations
```

## 🎨 UI Components

All components use **Glassmorphism** design:

- Frosted glass effects with backdrop blur
- Soft shadows for depth
- Premium gradients
- Smooth 60fps animations
- Dark/light mode support

## 📲 Platforms

- ✅ iOS 13+
- ✅ Android 5+  
- ✅ Web (responsive)
- ✅ macOS
- ✅ Windows

## 🔄 Weekly Update Cycle

Content updates happen automatically via Expo Updates:

1. **Monday-Tuesday**: Content team updates database
2. **Tuesday UTC**: Backend exports weekly bundle
3. **Tuesday+**: Users automatically notified, download in background
4. **No app rebuild needed** - instant distribution

## 🔐 Security

- ✅ Encrypted local storage
- ✅ End-to-end authentication
- ✅ GDPR compliant
- ✅ Open source ready

## 📊 Performance

- App Size: <100MB
- Startup: <2s
- Sync: <30s
- FPS: 60 (native rendering)

## 📚 Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
- [API.md](./docs/API.md) - Backend endpoints
- [SETUP.md](./docs/SETUP.md) - Detailed setup guide
- [DEPLOYMENT.md](./docs/DEPLOYMENT.md) - Production deployment

## 🤝 Contributing

This project uses TypeScript for type safety and follows clean architecture principles.

### Development

```bash
npm run dev        # Start dev server
npm run build      # Build production
npm run test       # Run tests
npm run lint       # Run ESLint
npm run format     # Format code
npm run check      # Type check
```

## 📋 Roadmap

- [ ] Phase 1: Setup Expo project (2h)
- [ ] Phase 2: Glasmorphism UI (3h)
- [ ] Phase 3: Core features (4h)
- [ ] Phase 4: Backend restructure (3h)
- [ ] Phase 5: Distribution (2h)

See [ARCHITECTURE.md](./ARCHITECTURE.md#-migration-roadmap) for detailed timeline.

## 📞 Resources

- [Expo Documentation](https://docs.expo.dev)
- [React Native](https://reactnative.dev)
- [Nativewind](https://www.nativewind.dev)
- [Vercel Deployment](https://vercel.com/docs)
- [Neon PostgreSQL](https://neon.tech)
