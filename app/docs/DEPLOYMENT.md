# Deployment Guide - Daily Love For Jesus

## Overview

This guide covers deploying the app to production across all platforms with zero-cost infrastructure.

## Architecture

```
┌─────────────────┐
│   Your Device   │
│  (iOS/Android)  │
│     or Web      │
└────────┬────────┘
         │
    ┌────▼────────────────────────────┐
    │  Expo Update Service            │
    │  (Weekly content updates)       │
    └────┬───────────────────────────┘
         │
    ┌────▼──────────────────────────────┐
    │  Vercel Functions (Backend)       │
    │  hono.js API endpoints            │
    └────┬────────────────────────────┘
         │
    ┌────▼─────────────────────────────┐
    │  Neon PostgreSQL (Database)      │
    │  https://neon.tech               │
    └──────────────────────────────────┘
```

## Prerequisites

- GitHub account (free)
- Expo account (free)
- Vercel account (free)
- Neon account (free)
- Android/iOS Developer accounts (optional for store release)

## Phase 1: Prepare Code for Production

### 1.1 Environment Variables

Create `.env.production` in `app/`:

```env
# API endpoint (will be set during deployment)
VITE_API_URL=https://your-backend.vercel.app

# Database
DATABASE_URL=postgresql://user:password@neon.tech/production-db

# Auth
JWT_SECRET=generate-a-secure-random-key

# Expo
EXPO_PUBLIC_API_URL=https://your-backend.vercel.app
```

### 1.2 Security Configuration

```bash
# Generate secure JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy output to JWT_SECRET
```

### 1.3 Update package.json

Ensure build scripts are correct:

```json
{
  "scripts": {
    "build": "vite build && esbuild api/boot.ts --platform=node --bundle --format=esm --outdir=dist",
    "deploy": "vercel --prod"
  }
}
```

## Phase 2: Setup Database (Neon PostgreSQL)

### 2.1 Create Neon Account & Database

1. Go to [neon.tech](https://neon.tech)
2. Sign up with GitHub (free)
3. Create new project
4. Note your connection string: `postgresql://user:password@neon.tech/dbname`

### 2.2 Create Database Schema

```bash
# Set production DATABASE_URL
export DATABASE_URL="postgresql://..."

# Generate migrations
npm run db:generate

# Apply to production
npm run db:migrate

# Seed initial data
npm run db:seed
```

### 2.3 Verify Database

```bash
# Connect to test it
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
```

## Phase 3: Deploy Backend (Vercel)

### 3.1 Setup Vercel

```bash
npm install -g vercel
vercel login
# Sign up with GitHub if needed
```

### 3.2 Configure Project

```bash
cd app

# Link to Vercel project
vercel link
# Select "Daily Love For Jesus" or create new
```

### 3.3 Add Environment Variables

```bash
vercel env add
# Add each variable from .env.production:
# - VITE_API_URL
# - DATABASE_URL
# - JWT_SECRET
```

Or set via Vercel dashboard:
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select project
3. Settings → Environment Variables
4. Add each variable

### 3.4 Configure Vercel Functions

Create `vercel.json` in root:

```json
{
  "functions": {
    "api/**": {
      "memory": 1024,
      "maxDuration": 30
    }
  },
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

### 3.5 Deploy

```bash
# Deploy to production
vercel --prod

# Your backend is now at https://your-project.vercel.app
```

### 3.6 Verify Backend

```bash
# Test API endpoint
curl https://your-project.vercel.app/api/health

# Should return: { "status": "ok" }
```

## Phase 4: Setup Expo Project

### 4.1 Create Expo Project

```bash
npm install -g expo-cli
expo login
# Use your Expo account credentials
```

### 4.2 Configure Expo

Update `app.json`:

```json
{
  "expo": {
    "name": "Daily Love For Jesus",
    "slug": "daily-love-for-jesus",
    "version": "1.0.0",
    "updates": {
      "enabled": true,
      "checkAutomatically": "ON_LOAD",
      "fallbackToCacheTimeout": 0,
      "url": "https://u.expo.dev/your-project-id"
    },
    "plugins": [
      ["expo-sqlite", {}]
    ]
  }
}
```

### 4.3 Build Release App

#### iOS

```bash
eas build --platform ios --auto-submit

# This:
# 1. Builds the app for Apple's TestFlight
# 2. Submits to App Store for review
# 3. Can take 2-24 hours for review

# Monitor at: https://appstoreconnect.apple.com
```

Requires:
- Apple Developer account ($99/year)
- App signing certificate

#### Android

```bash
eas build --platform android --auto-submit

# This:
# 1. Builds signed APK/AAB
# 2. Submits to Google Play Store
# 3. Usually approved within hours

# Monitor at: https://play.google.com/console
```

Requires:
- Google Developer account ($25 one-time)

#### Web

```bash
npm run build

# Deploy to Vercel
vercel deploy --prod

# Your web app is at https://your-project.vercel.app
```

## Phase 5: Setup Weekly Updates (OTA)

### 5.1 Configure Expo Updates

```bash
eas update --branch production
# Creates release build for distribution
```

### 5.2 Publishing Weekly Content

Create GitHub Actions workflow `.github/workflows/weekly-update.yml`:

```yaml
name: Weekly Content Update

on:
  schedule:
    - cron: '0 0 * * 2'  # Every Tuesday at midnight UTC

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm install
      
      - name: Generate new content
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: npm run db:seed
      
      - name: Build and publish update
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
        run: |
          npm run build
          eas update --branch production --message "Weekly content update"
      
      - name: Notify users
        run: |
          # Send push notification about update
          curl -X POST https://your-project.vercel.app/api/notify \
            -H "Content-Type: application/json" \
            -d '{"message":"New content available"}'
```

### 5.3 Get Expo Token

```bash
expo whoami  # Get your username

# On https://expo.dev, create personal access token
# Add to GitHub Secrets as EXPO_TOKEN
```

## Phase 6: Monitoring & Maintenance

### 6.1 Setup Error Tracking

Option A: Use Vercel Analytics (free tier)
- Logs automatically available in Vercel dashboard

Option B: Self-hosted (Sentry free tier)
```bash
npm install @sentry/expo

# Add to app entry point:
import * as Sentry from "@sentry/expo";
Sentry.init({
  dsn: "https://your-sentry-dsn@sentry.io/project-id",
});
```

### 6.2 Monitor Database

Use Neon Console:
1. Go to [console.neon.tech](https://console.neon.tech)
2. View query performance
3. Check storage usage
4. Setup automatic backups

### 6.3 Check Logs

```bash
# Backend logs
vercel logs

# Expo build logs
eas builds

# Database logs
# Check Neon console
```

## Phase 7: Update Distribution

### 7.1 iOS App Updates

```bash
# Push new version to App Store
npm version patch  # Bumps version

eas build --platform ios --auto-submit
# Incremental updates via Expo Updates between major versions
```

### 7.2 Android App Updates

```bash
# Push to Google Play
npm version patch

eas build --platform android --auto-submit
```

### 7.3 Content Updates (No App Store)

```bash
# Update content, no version bump needed
npm run db:seed

# Publish OTA update
eas update --branch production

# Users get update automatically on next launch
```

## Phase 8: Cost Monitoring

### Monthly Check

| Service | Limit | Usage | Cost |
|---------|-------|-------|------|
| Expo | 3 projects | 1-2 projects | $0 |
| Vercel | 100 serverless functions | ~10 functions | $0 |
| Neon PostgreSQL | 5GB storage | 100-500MB | $0 |
| Vercel Blob | 100GB | 10-50GB | $0 |
| **Total** | | | **$0** |

### When to Upgrade

Upgrade only when:
- App reaches 10k+ DAU
- Database exceeds 5GB
- Functions exceed 100/month
- Then: Approximately $50-100/month total

## Troubleshooting

### Build Fails

```bash
# Clear cache
eas build --clear-cache

# Rebuild
eas build --platform all
```

### App Won't Start

```bash
# Check backend is running
curl https://your-project.vercel.app/api/health

# Check database connection
psql $DATABASE_URL -c "SELECT 1"

# View logs
vercel logs
```

### Update Not Deploying

```bash
# Force clear Expo cache
expo prebuild --clean

# Rebuild and redeploy
eas update --branch production --message "Force update"
```

### Database Connection Error

```bash
# Verify DATABASE_URL is set
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Recreate connection pool if needed
# Restart Vercel function
vercel redeploy
```

## Security Checklist

- [ ] JWT_SECRET is randomly generated
- [ ] No secrets in .env files (use environment variables)
- [ ] Database URL only in production env
- [ ] HTTPS enforced everywhere
- [ ] CORS properly configured
- [ ] Rate limiting enabled on API
- [ ] Regular backups configured

## Performance Optimization

### App Size

Target: <100MB bundle

```bash
# Analyze
npm run build

# Check size
ls -lh dist/

# Optimize if needed
# - Tree shake unused code
# - Split code by route
# - Compress assets
```

### Database Queries

- Index frequently queried columns
- Use pagination for large datasets
- Cache common queries in Redis (if needed)

### API Response Time

Target: <500ms

```bash
# Monitor in Vercel dashboard
# Settings → Analytics
```

## Rollback Procedure

If update breaks the app:

```bash
# Revert to previous version
eas update --branch production --message "Rollback" --republish

# Or rebuild from Git
git checkout previous-commit
eas update --branch production
```

## Resources

- [Vercel Deployment Docs](https://vercel.com/docs)
- [Expo Deployment](https://docs.expo.dev/build/setup)
- [Neon PostgreSQL Docs](https://neon.tech/docs)
- [EAS Build & Submit](https://docs.expo.dev/eas)

---

**Status**: Ready for production deployment
**Cost**: $0/month on free tier
**Support**: Check platform documentation if issues arise
