# Mobile Setup Addendum - Integration with Web Backend

**Purpose**: Bridge mobile and web apps with shared authentication, types, and API client

---

## 1. Shared Types Setup

Create `shared/types.ts` in project root (parallel to `app/` and `mobile/`):

```typescript
// shared/types.ts

export interface User {
  id: string
  email: string
  name: string
  createdAt: Date
}

export interface BibleVerse {
  id: string
  book: string
  chapter: number
  verse: number
  text: string
  version: string
}

export interface Hymn {
  id: string
  title: string
  lyrics: string
  author: string
  year: number
}

export interface Devotional {
  id: string
  title: string
  content: string
  scripture: string
  date: Date
  author: string
}

export interface APIResponse<T> {
  data?: T
  error?: string
  status: number
}
```

---

## 2. Shared API Client

Create `shared/api-client.ts`:

```typescript
// shared/api-client.ts

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api'

export class APIClient {
  private token: string | null = null

  setToken(token: string) {
    this.token = token
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options?.headers,
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }

    return response.json()
  }

  // Auth
  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async register(email: string, password: string, name: string) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    })
  }

  // Bible
  async getBibleBooks() {
    return this.request('/bible/books')
  }

  async getBibleChapter(bookId: number, chapterNumber: number) {
    return this.request(`/bible/books/${bookId}/chapters/${chapterNumber}`)
  }

  // Hymns
  async getHymns(limit = 50, offset = 0) {
    return this.request(`/hymns?limit=${limit}&offset=${offset}`)
  }

  async getHymn(id: string) {
    return this.request(`/hymns/${id}`)
  }

  // Devotionals
  async getDevotionals(limit = 50, offset = 0) {
    return this.request(`/devotionals?limit=${limit}&offset=${offset}`)
  }

  async getDevotional(id: string) {
    return this.request(`/devotionals/${id}`)
  }
}

export const apiClient = new APIClient()
```

---

## 3. Update Mobile App.tsx

Update `mobile/App.tsx` to connect to API:

```typescript
import React, { useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaView, Text, View, ScrollView } from 'react-native'
import { apiClient } from '../shared/api-client'
import GlassCard from './src/components/GlassCard'

export default function App() {
  const [devotional, setDevotional] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDevotional = async () => {
      try {
        const data = await apiClient.getDevotionals(1)
        if (data.devotionals && data.devotionals.length > 0) {
          setDevotional(data.devotionals[0])
        }
      } catch (error) {
        console.error('Failed to load devotional:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDevotional()
  }, [])

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScrollView className="flex-1 p-4">
        <Text className="text-3xl font-bold text-white mb-4 text-center">
          Daily Love For Jesus
        </Text>

        {loading ? (
          <Text className="text-white text-center">Loading...</Text>
        ) : devotional ? (
          <GlassCard title={devotional.title}>
            <Text className="text-white/90 mb-3">{devotional.content}</Text>
            <Text className="text-amber-300 italic">{devotional.scripture}</Text>
          </GlassCard>
        ) : (
          <Text className="text-white/60 text-center">No devotional found</Text>
        )}

        <Text className="text-white/60 text-center mt-8 text-xs">
          Powered by ForLove Media
        </Text>
      </ScrollView>

      <StatusBar style="auto" />
    </SafeAreaView>
  )
}
```

---

## 4. Update Web App to Use Shared Types

In `app/src/App.tsx`, import shared types:

```typescript
import type { Devotional, BibleVerse, Hymn } from '../../../shared/types'
```

---

## 5. Environment Variables for Mobile

Create `mobile/.env`:

```env
REACT_APP_API_URL=http://localhost:3000/api
```

For production (when deployed):

```env
REACT_APP_API_URL=https://your-backend.vercel.app/api
```

---

## 6. Setup Instructions

### For Development

```bash
# 1. Navigate to mobile folder
cd mobile

# 2. Install dependencies
npm install

# 3. Install NativeWind & Tailwind
npm install nativewind tailwindcss postcss autoprefixer

# 4. Initialize Tailwind config (if not done)
npx tailwindcss init -p

# 5. Create .env file (optional, uses default if not present)
echo 'REACT_APP_API_URL=http://localhost:3000/api' > .env

# 6. Ensure web backend is running
# In another terminal: cd app && npm run dev

# 7. Start Expo
npm run start
```

### For Production

```bash
# Update .env with production backend URL
echo 'REACT_APP_API_URL=https://your-backend.vercel.app/api' > .env

# Build and deploy
eas build --platform all
eas submit --platform all
```

---

## 7. Verification Checklist

- [ ] Mobile app starts without errors
- [ ] Can fetch devotionals from backend
- [ ] Glassmorphism styling displays correctly
- [ ] "Daily Love For Jesus" title shows
- [ ] "Powered by ForLove Media" footer shows
- [ ] Tailwind classes applied correctly

---

## Next Steps

1. ✅ Mobile scaffold created
2. ✅ NativeWind + Tailwind configured
3. ✅ GlassCard component ready
4. 👉 **Now: Run install & connect to backend**
5. ⏳ Add more glassmorphism screens
6. ⏳ Setup offline sync
7. ⏳ Deploy to app stores

---

**Last Updated**: June 13, 2026
