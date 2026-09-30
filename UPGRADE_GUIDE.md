# Node.js Upgrade & Dependency Installation Guide

This guide details how to upgrade Node.js to the recommended LTS version and install dependencies across all subprojects (Root, NestJS Backend, React Vite Frontend, and Expo Mobile).

---

## 🟢 Node.js Version Support

- **Target Version**: **Node.js v24.21.0** (with backward compatibility for `>=20.18.0 <=24.x.x`)
- **Supported npm**: `>=10.0.0`
- Configured in [`.nvmrc`](file:///c:/Users/ayanw/Documents/Web%20Projects/Daily%20Love%20For%20Jesus/.nvmrc), [`.node-version`](file:///c:/Users/ayanw/Documents/Web%20Projects/Daily%20Love%20For%20Jesus/.node-version), and `engines` in all `package.json` manifests.
- TypeScript Node definitions (`@types/node`) upgraded to `^24.10.1` across backend and frontend workspaces.

---

## 🛠️ Step 1: Set / Upgrade Node.js to v24.21.0 on Windows

Choose any of the following methods that match your setup:

### Option A: Using `nvm-windows`
If you use NVM for Windows:
```powershell
nvm install 24.21.0
nvm use 24.21.0
```

### Option B: Using `fnm` (Fast Node Manager)
If you use `fnm`:
```powershell
fnm install 24.21.0
fnm use 24.21.0
fnm default 24.21.0
```

### Option C: Using Windows Package Manager (`winget`)
Run in PowerShell (as Administrator):
```powershell
winget upgrade OpenJS.NodeJS
# Or if installing fresh:
winget install OpenJS.NodeJS
```

### Option D: Direct Official Installer (.msi)
Download the Windows installer directly from:
👉 **[https://nodejs.org/en/download](https://nodejs.org/en/download)**

After updating, verify in your terminal:
```powershell
node -v   # Should show v24.21.0
npm -v    # Should show 10.x or 11.x
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
