# API Documentation - Daily Love For Jesus

## Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-backend.vercel.app/api`

## Authentication

All API endpoints (except login/register) require JWT authentication.

### Header
```
Authorization: Bearer <jwt_token>
```

### JWT Token Format
```json
{
  "userId": "user-id",
  "email": "user@example.com",
  "iat": 1234567890,
  "exp": 1234571490
}
```

---

## Endpoints

### Authentication

#### POST `/auth/register`
Register new user.

**Request**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**Response** (200)
```json
{
  "userId": "user-123",
  "token": "eyJhbGc...",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### POST `/auth/login`
Login user.

**Request**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response** (200)
```json
{
  "userId": "user-123",
  "token": "eyJhbGc...",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### POST `/auth/logout`
Logout user (revoke token).

**Headers**
```
Authorization: Bearer <token>
```

**Response** (200)
```json
{
  "message": "Logged out successfully"
}
```

---

### Bible

#### GET `/bible/books`
Get all 66 Bible books.

**Response** (200)
```json
{
  "books": [
    {
      "id": 1,
      "name": "Genesis",
      "abbreviation": "Gen",
      "chapters": 50,
      "testament": "Old Testament"
    },
    {
      "id": 2,
      "name": "Exodus",
      "abbreviation": "Exo",
      "chapters": 40,
      "testament": "Old Testament"
    }
  ]
}
```

#### GET `/bible/books/:bookId`
Get specific book.

**Response** (200)
```json
{
  "id": 1,
  "name": "Genesis",
  "abbreviation": "Gen",
  "chapters": 50,
  "testament": "Old Testament"
}
```

#### GET `/bible/books/:bookId/chapters/:chapterNumber`
Get chapter verses.

**Query Parameters**
- `limit` (optional): Max verses to return (default: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response** (200)
```json
{
  "book": "Genesis",
  "chapter": 1,
  "verses": [
    {
      "verseNumber": 1,
      "text": "In the beginning God created the heaven and the earth.",
      "verseId": "GEN001001"
    },
    {
      "verseNumber": 2,
      "text": "And the earth was without form, and void...",
      "verseId": "GEN001002"
    }
  ]
}
```

#### POST `/bible/search`
Search Bible passages.

**Request**
```json
{
  "query": "love",
  "limit": 20,
  "offset": 0
}
```

**Response** (200)
```json
{
  "results": [
    {
      "verseId": "JHN003016",
      "text": "For God so loved the world...",
      "location": "John 3:16",
      "relevance": 0.95
    }
  ],
  "total": 245
}
```

---

### Hymns

#### GET `/hymns`
Get all hymns with pagination.

**Query Parameters**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `search` (optional): Search by title/lyrics

**Response** (200)
```json
{
  "hymns": [
    {
      "id": "hymn-1",
      "title": "Amazing Grace",
      "lyrics": "Amazing grace, how sweet the sound...",
      "author": "John Newton",
      "year": 1779,
      "verses": 4
    }
  ],
  "total": 500,
  "page": 1,
  "limit": 20
}
```

#### GET `/hymns/:id`
Get specific hymn.

**Response** (200)
```json
{
  "id": "hymn-1",
  "title": "Amazing Grace",
  "lyrics": "Amazing grace, how sweet the sound...",
  "author": "John Newton",
  "year": 1779,
  "verses": 4,
  "melody": "New Britain"
}
```

#### GET `/hymns/search`
Search hymns.

**Query Parameters**
- `q`: Search query
- `limit`: Max results

**Response** (200)
```json
{
  "results": [
    {
      "id": "hymn-1",
      "title": "Amazing Grace",
      "matchField": "title",
      "relevance": 0.99
    }
  ]
}
```

---

### Devotionals

#### GET `/devotionals`
Get daily devotionals with pagination.

**Query Parameters**
- `date` (optional): Date in YYYY-MM-DD format (default: today)
- `page` (optional): Page number (default: 1)

**Response** (200)
```json
{
  "devotionals": [
    {
      "id": "dev-2024-01-15",
      "date": "2024-01-15",
      "title": "Finding Peace in Christ",
      "content": "Today's devotional text...",
      "scripture": "Philippians 4:6-7",
      "author": "Author Name",
      "duration": "5 minutes"
    }
  ],
  "total": 1,
  "date": "2024-01-15"
}
```

#### GET `/devotionals/:id`
Get specific devotional.

**Response** (200)
```json
{
  "id": "dev-2024-01-15",
  "date": "2024-01-15",
  "title": "Finding Peace in Christ",
  "content": "Today's devotional text...",
  "scripture": "Philippians 4:6-7",
  "author": "Author Name",
  "duration": "5 minutes",
  "relatedScriptures": ["John 14:27", "Psalm 23:1-6"]
}
```

#### GET `/devotionals/date/:date`
Get devotional for specific date.

**Response** (200)
```json
{
  "id": "dev-2024-01-15",
  "date": "2024-01-15",
  "title": "Finding Peace in Christ",
  "content": "..."
}
```

---

### Favorites

#### POST `/favorites`
Add item to favorites (requires auth).

**Request**
```json
{
  "type": "verse",  // "verse", "hymn", "devotional"
  "itemId": "GEN001001"
}
```

**Response** (201)
```json
{
  "id": "fav-123",
  "userId": "user-123",
  "type": "verse",
  "itemId": "GEN001001",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

#### GET `/favorites`
Get user's favorites (requires auth).

**Query Parameters**
- `type` (optional): Filter by type
- `limit` (optional): Max items
- `offset` (optional): Pagination

**Response** (200)
```json
{
  "favorites": [
    {
      "id": "fav-123",
      "type": "verse",
      "itemId": "GEN001001",
      "item": {
        "text": "In the beginning God created...",
        "location": "Genesis 1:1"
      }
    }
  ],
  "total": 42
}
```

#### DELETE `/favorites/:id`
Remove from favorites (requires auth).

**Response** (200)
```json
{
  "message": "Removed from favorites"
}
```

#### DELETE `/favorites/:type/:itemId`
Remove by type and item ID (requires auth).

**Response** (200)
```json
{
  "message": "Removed from favorites"
}
```

---

### Sync

#### GET `/sync/status`
Get sync status and last update time.

**Response** (200)
```json
{
  "lastSyncTime": "2024-01-15T00:00:00Z",
  "nextSyncTime": "2024-01-22T00:00:00Z",
  "version": "1.2.0",
  "dataVersion": 2024001
}
```

#### POST `/sync/check`
Check if new data available.

**Request**
```json
{
  "currentVersion": 2024001,
  "lastSyncTime": "2024-01-15T00:00:00Z"
}
```

**Response** (200)
```json
{
  "updateAvailable": true,
  "newVersion": 2024002,
  "changesSummary": {
    "bibleVersesAdded": 0,
    "hymnsAdded": 2,
    "devotionalsAdded": 7,
    "favoritesSynced": true
  },
  "downloadUrl": "https://cdn.example.com/updates/2024002.zip",
  "downloadSize": 15000000
}
```

#### POST `/sync/pull`
Pull data changes (for offline-first clients).

**Request**
```json
{
  "since": "2024-01-15T00:00:00Z",
  "dataTypes": ["devotionals", "hymns"]
}
```

**Response** (200)
```json
{
  "devotionals": [...],
  "hymns": [...],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### POST `/sync/push`
Push user changes (favorites, reading progress).

**Request**
```json
{
  "favorites": [{...}],
  "readingProgress": [{...}]
}
```

**Response** (200)
```json
{
  "synced": true,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

### Health

#### GET `/health`
Check API status.

**Response** (200)
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0",
  "database": "connected"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid request",
  "details": "Missing required field: email"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "You don't have permission to access this resource"
}
```

### 404 Not Found
```json
{
  "error": "Not found",
  "resource": "Devotional"
}
```

### 409 Conflict
```json
{
  "error": "Conflict",
  "message": "Item already in favorites"
}
```

### 429 Too Many Requests
```json
{
  "error": "Rate limited",
  "retryAfter": 60
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

---

## Rate Limiting

- **Public endpoints**: 100 requests/minute per IP
- **Authenticated endpoints**: 500 requests/minute per user
- **Search endpoints**: 10 requests/minute per user

**Headers**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

---

## Pagination

All list endpoints support pagination:

**Query Parameters**
- `limit`: Items per page (max: 100, default: 20)
- `offset`: Number of items to skip (default: 0)

**Response**
```json
{
  "items": [...],
  "total": 500,
  "limit": 20,
  "offset": 0,
  "hasMore": true
}
```

---

## Sorting

List endpoints support sorting:

**Query Parameters**
- `sortBy`: Field to sort by
- `order`: "asc" or "desc" (default: "asc")

**Example**
```
GET /devotionals?sortBy=date&order=desc
```

---

## Testing

### Using cURL

```bash
# Get all hymns
curl http://localhost:3000/api/hymns

# Get specific devotional
curl http://localhost:3000/api/devotionals/dev-2024-01-15

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Add to favorites (with auth)
curl -X POST http://localhost:3000/api/favorites \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"type":"hymn","itemId":"hymn-1"}'
```

### Using TypeScript (tRPC)

```typescript
import { trpc } from '@/providers/trpc'

// Get hymns
const hymns = await trpc.hymns.list.query()

// Add favorite
await trpc.favorites.add.mutate({
  type: 'hymn',
  itemId: 'hymn-1'
})

// Search Bible
const results = await trpc.bible.search.query({
  query: 'love'
})
```

---

## WebSocket (Real-time Updates)

Not currently implemented. For future live updates:

```typescript
const ws = new WebSocket('wss://your-api.com/api/ws')

ws.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data)
  
  if (type === 'FAVORITE_ADDED') {
    // Handle favorite
  }
}
```

---

## Changelog

### v1.0.0 (2024-01-15)
- Initial API release
- Authentication endpoints
- Bible, hymns, devotionals CRUD
- Favorites system
- Sync endpoints
