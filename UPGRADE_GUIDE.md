# Node.js Upgrade & Dependency Installation Guide

This guide details how to upgrade Node.js to the recommended LTS version and install dependencies across all subprojects (Root, NestJS Backend, React Vite Frontend, and Expo Mobile).

---

## 🟢 Node.js Version Recommendation

- **Recommended Version**: **Node.js v22.14.0 LTS** (Active LTS) or `>=20.18.0`
- **Supported npm**: `>=10.0.0`
- Configured in [`.nvmrc`](file:///c:/Users/ayanw/Documents/Web%20Projects/Daily%20Love%20For%20Jesus/.nvmrc), [`.node-version`](file:///c:/Users/ayanw/Documents/Web%20Projects/Daily%20Love%20For%20Jesus/.node-version), and `engines` in all `package.json` manifests.

---

## 🛠️ Step 1: Upgrade Node.js on Windows

Choose any of the following methods that match your setup:

### Option A: Using Windows Package Manager (`winget`) — Recommended
Run in PowerShell (as Administrator):
```powershell
winget upgrade OpenJS.NodeJS.LTS
# Or if installing fresh:
winget install OpenJS.NodeJS.LTS
```

### Option B: Using `nvm-windows`
If you use NVM for Windows:
```powershell
nvm install 22.14.0
nvm use 22.14.0
```

### Option C: Using `fnm` (Fast Node Manager)
If you use `fnm`:
```powershell
fnm install 22
fnm use 22
fnm default 22
```

### Option D: Direct Official Installer (.msi)
Download the latest LTS Windows installer directly from:
👉 **[https://nodejs.org/en/download](https://nodejs.org/en/download)**

After updating, verify in your terminal:
```powershell
node -v   # Should show v22.x.x (or v20.18+)
npm -v    # Should show 10.x.x
```

---

## 📦 Step 2: Install Dependencies Across the Dev Environment

Run the unified installation script from the project root:

```powershell
# 1. Install all dependencies across root, backend, and frontend with peer-dependency safety:
npm run install:all
```

Or install specific parts individually:

```powershell
# Backend (NestJS, Drizzle ORM, tRPC, Supabase)
npm run install:backend

# Frontend (React 19, Vite, Tailwind CSS, Radix UI, TanStack Query)
npm run install:frontend

# Mobile App (React Native, Expo)
npm run install:mobile
```

---

## 🚀 Step 3: Run the Development Environment

Once dependencies are installed:

```powershell
# 1. Start NestJS Backend (Port 4000)
npm run dev:backend

# 2. In a separate terminal, start React Web SPA (Port 3000)
npm run dev:frontend
```
