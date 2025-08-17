# מפרט פרויקט - מערכת ניהול משימות משותפת

## PRD סיכום

### מטרות הפרויקט

- **לוח משימות משותף בזמן אמת** - עריכה פתוחה לכולם
- **אימות מאובטח** - סיסמה, OAuth Google, שכחתי סיסמה
- **כוכב אישי** - מועדפים לכל משתמש
- **ייצוא "המשימות שלי"** - לקובץ CSV/JSON
- **פריסה מלאה בענן** + CI/CD אוטומטי

### Non-Goals

- הרשאות מתקדמות (תפקידים/ACL מורכב)
- שיתופי פעולה מתקדמים (תגובות/קבצים מצורפים/צ'ט)
- התראות Push לנייד

## מבנה UI/UX

### 1. מסך לוגין

- **כניסה**: שם משתמש/אימייל + סיסמה
- **יצירת משתמש**: Sign-up עם ולידציה
- **Google OAuth**: הזדהות עם Google
- **שכחתי סיסמה**: איפוס דרך אימייל

### 2. Header קבוע (בכל המסכים)

- **לוגו** - קישור לדף הבית
- **שם משתמש** - בלחיצה: תפריט התנתקות
- **חיפוש** - קבוע, מחפש בהקשר המסך הנוכחי
- **כפתור יצירת משימה** - "+ משימה חדשה"

### 3. דף הבית

- **הצגת כל המשימות** - Shared Board
- **פגינציה/Infinite Scroll** - לטעינה יעילה
- **מיון ברירת מחדל**: `updatedAt desc`

### 4. תפריט ניווט

- **המשימות שלי** - CreatedBy=אני או Assignees מכיל אותי
- **סומנו בכוכב** - משימות המסומנות אצלי (אישי)

### 5. תפריט המבורגר (מובייל)

- שם משתמש
- דף הבית
- המשימות שלי
- סומנו בכוכב
- התנתקות

### 6. כרטיס משימה - מצב תצוגה

**שדות תצוגה:**

- כותרת
- תיאור
- "נוצר ע"י" (שם משתמש)
- תאריך/שעת יצירה
- "נערך לאחרונה ע"י" (שם משתמש)
- כוכב (אישי)

**פעולות בהובר (או ⋯ במובייל):**

- מחיקה (עם Undo 10s)
- היסטוריה (צפייה בגרסאות)
- שכפול (יצירת עותק)

### 7. Modal עריכת משימה

**שדות עריכה:**

- כותרת (עריכה)
- תיאור (עריכה)
- "נוצר ע"י" (תצוגה בלבד)
- תאריך/שעת יצירה (תצוגה בלבד)
- "נערך לאחרונה ע"י" (תצוגה בלבד)
- כוכב (אישי)
- "הוסף את עצמי למשימה" (כפתור)

**פעולות:**

- שמירת שינויים
- איקס לסגירה
- אייקונים: היסטוריה, שכפול, מחיקה

## API Specifications

### Auth Endpoints

```typescript
// Signup
POST /auth/signup
Body: { email: string, name: string, password: string }
Response: 201 { id: string, email: string, name: string }

// Login
POST /auth/login
Body: { email: string, password: string }
Response: 200 { id: string, email: string, name: string }

// Logout
POST /auth/logout
Response: 204

// Get current user
GET /auth/me
Response: 200 { id: string, email: string, name: string }

// Google OAuth
GET /auth/google → 302 (redirect)
GET /auth/google/callback → 302 (sets session cookie)

// Forgot password
POST /auth/forgot
Body: { email: string }
Response: 204 (always)

// Reset password
POST /auth/reset
Body: { token: string, newPassword: string }
Response: 204
```

### Tasks Endpoints

```typescript
// Get tasks (context-aware)
GET /tasks?query=&page=1&limit=20&sort=updatedAt:desc
Response: 200 {
  items: Task[],
  page: number,
  total: number,
  hasMore: boolean
}

// Create task
POST /tasks
Body: { title: string, description?: string }
Response: 201 Task

// Get single task
GET /tasks/:id
Response: 200 Task + ETag

// Update task (with optimistic concurrency)
PATCH /tasks/:id
Headers: { "If-Match": "<version or ETag>" }
Body: { title?: string, description?: string, assignees?: string[] }
Response: 200 Task | 409 Conflict

// Delete task (soft delete with undo)
DELETE /tasks/:id
Response: 202 { undoToken: string }

// Duplicate task
POST /tasks/:id/duplicate
Response: 201 Task

// Assign self to task
PUT /tasks/:id/assign/me
Response: 204
```

### Stars Endpoints (Personal)

```typescript
// Add star
PUT /tasks/:id/star
Response: 204

// Remove star
DELETE /tasks/:id/star
Response: 204

// Get starred tasks
GET /me/starred
Response: 200 Task[]
```

### Export Endpoints

```typescript
// Export my tasks
GET /me/tasks/export?format=csv|json
Response: 200 (attachment; stream)
```

### Task Object Structure

```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  createdBy: { id: string; name: string };
  createdAt: string; // ISO 8601
  updatedBy?: { id: string; name: string };
  updatedAt: string; // ISO 8601
  assignees: { id: string; name: string }[];
  version: number;
  isStarred: boolean; // for current user
}
```

## WebSockets Events

### Channels

- `board:all` - גלובלי לכל המשימות
- `user:<id>` - אישי למשתמש ספציפי

### Events

```typescript
// Task events (board:all)
'task.created': { task: Task }
'task.updated': { taskId: string, patch: object } | { task: Task }
'task.deleted': { taskId: string }
'task.duplicated': { sourceTaskId: string, newTask: Task }
'task.assigned': { taskId: string, assigneeId: string }

// Star events (user:<id>)
'star.added': { taskId: string }
'star.removed': { taskId: string }
```

### Reliability

- `eventId` ייחודי + `emittedAt` בכל אירוע
- לקוח שומר `lastEventId`
- Reconnect → `/sync?since=updatedAt` להשלמות

## Database Schema (MongoDB + Prisma)

```prisma
model User {
  id           String   @id @default(auto()) @map("_id") @db.ObjectId
  email        String   @unique
  name         String
  passwordHash String?
  provider     String   // "credentials" | "google"
  createdAt    DateTime @default(now())
}

model Task {
  id          String    @id @default(auto()) @map("_id") @db.ObjectId
  title       String
  description String?
  createdBy   String    @db.ObjectId
  createdAt   DateTime  @default(now())
  updatedBy   String?   @db.ObjectId
  updatedAt   DateTime  @updatedAt
  assignees   String[]  @db.ObjectId
  version     Int       @default(1)
}

model TaskStar {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  taskId    String   @db.ObjectId
  userId    String   @db.ObjectId
  createdAt DateTime @default(now())

  @@unique([taskId, userId])
}

model TaskAudit {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  taskId    String   @db.ObjectId
  at        DateTime @default(now())
  by        String   @db.ObjectId
  diff      Json     // JSON-Patch או before/after
}
```

## Validation & Constraints

### Task Validation

- **title**: חובה, 1–120 תווים, Unicode, טרימינג רווחים
- **description**: עד 5,000 תווים, טקסט נטול HTML
- **assignees**: עד 20 לכל משימה
- **version**: מחייב If-Match בעדכון

### Search & Pagination

- **Search**: Case-insensitive ב-title, description + חיפוש לפי יוצר/משויך
- **Paging**: limit=20 (ברירת מחדל), מקסימום 100
- **Sorting**: updatedAt desc ברירת מחדל; גם createdAt, title

## Security Requirements

### Authentication

- **Session Cookies**: HttpOnly, Secure, SameSite=Lax/Strict
- **Passwords**: Argon2id + Salt + Pepper
- **OAuth Google**: OIDC עם אימות אימייל
- **CSRF**: Tokens בטפסי credentials

### Rate Limiting

- **Auth**: 10/min/IP, 5/min/user
- **Write (tasks)**: 60/min/user
- **Read**: 300/min/user

### Security Headers

```http
Content-Security-Policy: default-src 'self'; img-src 'self' data: https:; script-src 'self'; connect-src 'self' https://api.example.com wss://api.example.com; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
```

## Performance Requirements

### SLOs

- **TTFB**: ≤ 600ms (דף הבית)
- **WebSocket Latency**: ≤ 500ms (p95)
- **Error Rate**: < 0.5% (5xx חודשי)
- **TTI**: ≤ 3s (p95 במובייל)

### Optimization

- **Virtualization**: רשימות גדולות → React-Window
- **Database**: אינדקסים מתאימים, הימנעות מ-$regex לא-מאנדקס
- **Network**: GZIP/Brotli, Cache-Control, WebSocket deltas

## Accessibility (WCAG 2.2 AA)

### Requirements

- **Keyboard Navigation**: תמיכה מלאה במקלדת
- **Screen Readers**: ARIA labels, announcements
- **Focus Management**: Focus trap במודאלים
- **Color Contrast**: 4.5:1 minimum
- **RTL Support**: כיווניות מלאה, מיקומי אייקונים

### Mobile Support

- **Touch Targets**: ≥ 44px
- **Hamburger Menu**: ניווט מובייל
- **Responsive Design**: Breakpoints: sm, md, lg

## Error Handling

### HTTP Status Codes

- **400**: Bad Request (validation errors)
- **401**: Unauthorized (לא מחובר)
- **403**: Forbidden (הרשאות)
- **404**: Not Found
- **409**: Conflict (version conflict)
- **429**: Too Many Requests (rate limit)
- **5xx**: Server Error

### Error Response Format

```json
{
  "error": {
    "code": 409,
    "message": "Version conflict",
    "requestId": "req-123",
    "field": "title" // optional
  }
}
```

## Time & Localization

### Timezone

- **Storage**: UTC
- **Display**: Asia/Jerusalem
- **Format**: DD/MM/YYYY HH:mm
- **Tooltip**: ISO format

### RTL Support

- **Direction**: right-to-left
- **Icon Positioning**: מותאם ל-RTL
- **Date Format**: מקומי

## Export Formats

### CSV Format

```csv
id,title,description,createdByName,createdAt,updatedByName,updatedAt,isStarred,isMine,isAssignedToMe
64f...,"לתעדף פיצ'ר A","","דוד","2025-08-16 09:10","שרה","2025-08-16 10:22",true,true,false
```

### JSON Format

```json
[
  {
    "id": "64f...",
    "title": "לתעדף פיצ'ר A",
    "description": "",
    "createdByName": "דוד",
    "createdAt": "2025-08-16 09:10",
    "updatedByName": "שרה",
    "updatedAt": "2025-08-16 10:22",
    "isStarred": true,
    "isMine": true,
    "isAssignedToMe": false
  }
]
```

## Development Workflow

### Branch Strategy

- `main` - מוגן, PRs חובה
- `feature/*` - תכונות חדשות
- `fix/*` - תיקוני באגים
- `hotfix/*` - תיקונים דחופים

### Testing Strategy

- **Unit**: Jest/Vitest - ולידציה, Utils, Reducers
- **Integration**: Supertest - REST API, DB
- **E2E**: Playwright - תרחישי משתמש
- **Load**: k6 - עמידות בעומס

### CI/CD Pipeline

1. **Install** → **Typecheck** → **Lint** → **Test** → **Build**
2. **Deploy Preview** (לכל PR)
3. **Deploy Production** (על merge ל-main)

---

**גרסה:** 1.0  
**תאריך:** 16.08.2025  
**אזור זמן:** Asia/Jerusalem (UTC+03)
