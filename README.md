# מערכת ניהול משימות משותפת (Shared Tasks Board)

## סקירה כללית

מערכת ניהול משימות משותפת (Shared Board) שבה **כל המשתמשים רואים את כל המשימות** ויכולים **לערוך כל משימה**. המערכת תומכת בעדכון **בזמן אמת** (WebSockets), באימות מאובטח (Login/Sign‑up/Google OAuth/שכחתי סיסמה), **כוכב אישי** לסימון מועדפים, וייצוא **המשימות האישיות** לקובץ.

## תכונות עיקריות

### 🔐 אימות ואבטחה

- כניסה עם שם משתמש וסיסמה
- יצירת משתמש חדש (Sign-up)
- הזדהות Google OAuth
- שכחתי סיסמה (איפוס דרך אימייל)
- סשן מאובטח עם Cookie HttpOnly

### 📋 ניהול משימות

- **לוח משימות משותף** - כל המשתמשים רואים ועורכים את כל המשימות
- **עדכון בזמן אמת** - WebSockets לעדכונים מיידיים
- **כוכב אישי** - סימון מועדפים אישי לכל משתמש
- **היסטוריית שינויים** - מעקב מלא אחר כל עדכון
- **שכפול משימות** - יצירת עותק של משימה קיימת

### 🎯 ניווט וסינון

- **דף הבית** - הצגת כל המשימות
- **המשימות שלי** - משימות שיצרתי או שאני משויך אליהן
- **סומנו בכוכב** - משימות שסימנתי בכוכב
- **חיפוש מתקדם** - חיפוש בכותרת, תיאור, יוצר ומשויך

### 📤 ייצוא נתונים

- ייצוא "המשימות שלי" לקובץ CSV
- ייצוא "המשימות שלי" לקובץ JSON
- שם קובץ כולל תאריך

### 📱 תמיכה במובייל

- תפריט המבורגר במובייל
- תצוגה מותאמת למסכים קטנים
- נגישות מלאה (WCAG 2.2 AA)
- תמיכה ב-RTL

## מחסנית טכנולוגית

### Frontend

- **Next.js 14+** (App Router)
- **TypeScript** (strict mode)
- **Tailwind CSS** (עיצוב)
- **Zustand** (ניהול state)
- **Socket.io Client** (WebSockets)
- **React Hook Form** (טפסים)
- **Zod** (ולידציה)

### Backend

- **Node.js 20+**
- **Fastify/Express** (API)
- **Socket.io** (WebSockets)
- **Prisma** (ORM ל-MongoDB)
- **Argon2** (הצפנת סיסמאות)
- **Pino** (לוגים)

### Database & Cache

- **MongoDB Atlas** (מסד נתונים ראשי)
- **Redis** (סשנים + WebSocket adapter)

### Deployment

- **Vercel** (Frontend)
- **Render/Fly.io/Railway** (Backend)
- **GitHub Actions** (CI/CD)

## מבנה המסכים

### 1. מסך לוגין

- כניסה עם שם משתמש וסיסמה
- יצירת משתמש חדש (Sign-up)
- הזדהות Google OAuth
- "שכחתי סיסמה" (איפוס דרך אימייל)

### 2. מסך הבית (דף ראשי)

**Header קבוע:**

- לוגו
- שם משתמש (בלחיצה → התנתקות)
- חיפוש (הקשרי לכל מסך)
- כפתור יצירת משימה חדשה

**תוכן:**

- הצגת כל המשימות הקיימות
- פגינציה או Infinite Scroll

### 3. תפריט ניווט

- **המשימות שלי** - משימות שיצרתי או שאני משויך אליהן
- **סומנו בכוכב** - משימות שסימנתי בכוכב (אישי)

### 4. תפריט המבורגר (מובייל)

- שם משתמש
- דף הבית
- המשימות שלי
- סומנו בכוכב
- התנתקות

## מבנה כרטיס משימה

### מצב הצגה

- כותרת
- תיאור
- המשתמש שיצר
- שעה ותאריך יצירה
- נערך לאחרונה ע"י
- כוכב (אישי)

**בהובר (או ⋯ במובייל):**

- אייקונים: מחיקה, היסטוריה, שכפול

### מצב עריכה (Modal/Popup)

- כותרת (עריכה)
- תיאור (עריכה)
- המשתמש שיצר (תצוגה בלבד)
- שעה ותאריך יצירה (תצוגה בלבד)
- נערך לאחרונה ע"י (תצוגה בלבד)
- כוכב (אישי)
- כפתור "הוסף את עצמך למשימה"
- כפתור שמירת שינויים
- איקס לסגירה
- אייקונים: היסטוריית שינויים, שכפול, מחיקה

**ניווט:** לחיצה על כרטיס המשימה → פתיחת מצב עריכה

## דרישות מערכת

### פיתוח מקומי

- Node.js 20+
- npm או yarn
- MongoDB Atlas (חינמי)
- Redis (Cloud או מקומי)

### פריסה

- Vercel (Frontend)
- Render/Fly.io/Railway (Backend)
- MongoDB Atlas (Database)
- Redis Cloud (Cache)

## התקנה והרצה

### 1. Clone הפרויקט

```bash
git clone <repository-url>
cd to-do-list-front
```

### 2. התקנת תלויות

```bash
npm install
```

### 3. הגדרת משתני סביבה

צור קובץ `.env.local`:

```env
# Frontend
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_TIMEZONE=Asia/Jerusalem

# Backend (אם מריץ מקומי)
DATABASE_URL="mongodb+srv://..."
REDIS_URL="redis://..."
SESSION_SECRET="your-secret-key"
PEPPER="your-pepper-key"
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
MAIL_HOST=smtp.sendgrid.net
MAIL_USER=apikey
MAIL_PASS=...
ALLOWED_ORIGINS=http://localhost:3000
```

### 4. הרצת הפרויקט

```bash
npm run dev
```

הפרויקט יהיה זמין ב: http://localhost:3000

### 5. Scripts זמינים

```bash
# Development
npm run dev          # הרצת שרת פיתוח
npm run build        # בניית הפרויקט
npm run start        # הרצת שרת ייצור

# Code Quality
npm run lint         # בדיקת ESLint
npm run lint:fix     # תיקון אוטומטי של ESLint
npm run format       # עיצוב קוד עם Prettier
npm run format:check # בדיקת עיצוב קוד
npm run type-check   # בדיקת TypeScript
npm run check-all    # כל הבדיקות יחד
```

## בדיקות

```bash
# בדיקות יחידה
npm test

# בדיקות E2E
npm run test:e2e

# בדיקות עומס
npm run test:load
```

## פריסה

### Frontend (Vercel)

1. חיבור repository ל-Vercel
2. הגדרת משתני סביבה
3. Deploy אוטומטי על push ל-main

### Backend (Render/Fly/Railway)

1. חיבור repository
2. הגדרת משתני סביבה
3. הגדרת Build Command: `npm run build`
4. הגדרת Start Command: `npm start`

## אבטחה

- **Session Cookies**: HttpOnly, Secure, SameSite=Lax
- **סיסמאות**: Argon2id + Salt + Pepper
- **CSRF Protection**: Tokens בטפסי credentials
- **Rate Limiting**: הגבלת בקשות לפי IP ומשתמש
- **Input Validation**: Zod validation בכל הקלט
- **CSP**: Content Security Policy קשוח

## ביצועים

- **TTFB**: ≤ 600ms
- **WebSocket Latency**: ≤ 500ms (p95)
- **Error Rate**: < 0.5% (5xx)
- **TTI**: ≤ 3s (p95 במובייל)

## תרומה לפרויקט

1. Fork הפרויקט
2. צור branch חדש: `git checkout -b feature/amazing-feature`
3. Commit השינויים: `git commit -m 'Add amazing feature'`
4. Push ל-branch: `git push origin feature/amazing-feature`
5. פתח Pull Request

## רישיון

MIT License - ראה קובץ [LICENSE](LICENSE) לפרטים.

## תמיכה

לשאלות ותמיכה:

- פתח Issue ב-GitHub
- צור Discussion ב-GitHub
- פנה לצוות הפיתוח

---

**גרסה:** 1.1  
**תאריך:** 16.08.2025  
**אזור זמן:** Asia/Jerusalem (UTC+03)
