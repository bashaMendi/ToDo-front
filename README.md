# מערכת ניהול משימות משותפת (Shared Tasks Board)

## סקירה כללית

מערכת ניהול משימות משותפת (Shared Board) שבה **כל המשתמשים רואים את כל המשימות** ויכולים **לערוך כל משימה**. המערכת תומכת בעדכון **בזמן אמת** (WebSockets), באימות מאובטח (Login/Sign‑up/, **כוכב אישי** לסימון מועדפים, וייצוא **המשימות האישיות** לקובץ.

## תכונות עיקריות

### 🔐 אימות ואבטחה

- כניסה עם שם משתמש וסיסמה
- יצירת משתמש חדש (Sign-up)
- סשן מאובטח עם Cookie HttpOnly
- Protected Routes עם AuthProvider

### 📋 ניהול משימות

- **לוח משימות משותף** - כל המשתמשים רואים ועורכים את כל המשימות
- **עדכון בזמן אמת** - WebSockets לעדכונים מיידיים
- **כוכב אישי** - סימון מועדפים אישי לכל משתמש
- **שכפול משימות** - יצירת עותק של משימה קיימת

### 🎯 ניווט 

- **דף הבית** - הצגת כל המשימות
- **המשימות שלי** - משימות שיצרתי או שאני משויך אליהן
- **סומנו בכוכב** - משימות שסימנתי בכוכב

### 📤 ייצוא נתונים

- ייצוא "המשימות שלי" לקובץ CSV
- ייצוא "המשימות שלי" לקובץ JSON
- שם קובץ כולל תאריך

### 📱 תמיכה במובייל

- תצוגה מותאמת למסכים קטנים
- נגישות מלאה (WCAG 2.2 AA)
- תמיכה ב-RTL

## מחסנית טכנולוגית

### Frontend

- **Next.js 15.4.6** (App Router)
- **React 19.1.0** (Latest)
- **TypeScript 5** (strict mode)
- **Tailwind CSS 4** (עיצוב)
- **Zustand 4.4.7** (ניהול state)
- **Socket.io Client 4.8.1** (WebSockets)
- **React Hook Form 7.62.0** (טפסים)
- **Zod 4.0.17** (ולידציה)
- **TanStack Query 5.85.3** (Server State Management)
- **Headless UI 2.2.7** (Accessible Components)
- **Lucide React 0.539.0** (Icons)
- **Date-fns 4.1.0** (Date Manipulation)

### Development Tools

- **ESLint 9.33.0** (Code Linting)
- **Prettier 3.6.2** (Code Formatting)
- **TypeScript ESLint** (TypeScript Linting)
- **Accessibility ESLint** (A11y Rules)

### Deployment

- **Netlify** (Static Site Hosting)


## מבנה הפרויקט

```
to-do-list-front/
├── app/                    # Next.js App Router
│   ├── favicon.ico
│   ├── globals.css        # Global Styles
│   ├── layout.tsx         # Root Layout
│   ├── page.tsx           # Home Page
│   ├── login/             # Login Page
│   ├── mine/              # My Tasks Page
│   └── starred/           # Starred Tasks Page
├── src/
│   ├── components/        # React Components
│   │   ├── auth/          # Authentication Components
│   │   ├── debug/         # Debug Components
│   │   ├── layout/        # Layout Components
│   │   ├── lazy/          # Lazy Loading
│   │   ├── providers/     # Context Providers
│   │   ├── tasks/         # Task Management Components
│   │   └── ui/            # Reusable UI Components
│   ├── contexts/          # React Contexts
│   ├── hooks/             # Custom Hooks
│   ├── lib/               # Utility Libraries
│   ├── store/             # Zustand Store
│   └── types/             # TypeScript Types
├── public/                # Static Assets
├── package.json           # Dependencies & Scripts
├── next.config.ts         # Next.js Configuration
├── netlify.toml           # Netlify Deployment Config
└── README.md              # Project Documentation
```

## דרישות מערכת

### פיתוח מקומי

- **Node.js 18+** (מומלץ 20+)
- **npm** או **yarn**
- **Git**

### פריסה

- **Netlify** (מומלץ) או **Vercel**
- **Backend API** (נפרד)
- **MongoDB Atlas** (Database)

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
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_TIMEZONE=Asia/Jerusalem

# Backend URLs (Production)
# NEXT_PUBLIC_API_BASE_URL=https://your-backend-api.com
# NEXT_PUBLIC_WS_URL=wss://your-backend-api.com
```

### 4. הרצת הפרויקט

```bash
# Development
npm run dev

# Production Build
npm run build
npm start
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

## מבנה המסכים

### 1. מסך לוגין (`/login`)

- כניסה עם שם משתמש וסיסמה
- יצירת משתמש חדש (Sign-up)
- הזדהות Google OAuth
- "שכחתי סיסמה" (איפוס דרך אימייל)

### 2. מסך הבית (`/`)

**Header קבוע:**
- לוגו
- כפתור התנתקות
- כפתור יצירת משימה חדשה

**תוכן:**
- הצגת כל המשימות הקיימות
- פגינציה או Infinite Scroll

### 3. תפריט ניווט

- **המשימות שלי** (`/mine`) - משימות שיצרתי או שאני משויך אליהן
- **סומנו בכוכב** (`/starred`) - משימות שסימנתי בכוכב (אישי)

## מבנה כרטיס משימה

### מצב הצגה

- כותרת
- תיאור
- המשתמש שיצר
- שעה ותאריך יצירה
- נערך לאחרונה ע"י
- כוכב (אישי)

**בהובר (או ⋯ במובייל):**
- אייקונים: מחיקה, שכפול

### מצב עריכה (Modal/Popup)

- כותרת (עריכה)
- תיאור (עריכה)
- כפתור שמירת שינויים
- איקס לסגירה
- אייקונים: שכפול, עריכה, מחיקה


## פריסה

### Netlify

1. **חיבור Repository:**
   - היכנס ל-Netlify
   - בחר "New site from Git"
   - חבר את GitHub repository

2. **הגדרות Build:**
   ```toml
   [build]
     command = "npm run build"
     publish = "out"
   ```

3. **משתני סביבה:**
   - הוסף את כל משתני הסביבה ב-Netlify Dashboard
   - `NEXT_PUBLIC_API_BASE_URL`
   - `NEXT_PUBLIC_WS_URL`
   - `NEXT_PUBLIC_TIMEZONE`

4. **Deploy:**
   - כל push ל-main יגרום ל-deploy אוטומטי
   - או deploy ידני דרך Netlify Dashboard


## אבטחה

### Frontend Security

- **Content Security Policy (CSP)** - מוגדר ב-netlify.toml
- **X-Frame-Options** - מניעת Clickjacking
- **X-XSS-Protection** - הגנה מפני XSS
- **X-Content-Type-Options** - מניעת MIME sniffing
- **Referrer-Policy** - בקרת referrer headers

### Authentication

- **Protected Routes** - כל הדפים מוגנים חוץ מלוגין
- **Session Management** - ניהול סשן מאובטח
- **Token Validation** - ולידציה של tokens
- **Auto Logout** - התנתקות אוטומטית בפג תוקף

## ביצועים

### Optimization

- **Static Export** - בנייה סטטית ל-Netlify
- **Code Splitting** - חלוקת קוד אוטומטית
- **Lazy Loading** - טעינה עצלה של קומפוננטים
- **Image Optimization** - אופטימיזציה של תמונות
- **Bundle Analysis** - ניתוח גודל bundle

### Performance Targets

- **TTFB**: ≤ 600ms
- **WebSocket Latency**: ≤ 500ms (p95)
- **Error Rate**: < 0.5% (5xx)
- **TTI**: ≤ 3s (p95 במובייל)

## פיתוח

### Code Quality

- **ESLint** - בדיקת איכות קוד
- **Prettier** - עיצוב קוד אחיד
- **TypeScript** - טיפוסים חזקים
- **Accessibility** - נגישות מלאה

### Testing

```bash
# בדיקות יחידה (לעתיד)
npm test

# בדיקות E2E (לעתיד)
npm run test:e2e

# בדיקות עומס (לעתיד)
npm run test:load
```

## שינויים אחרונים

### גרסה 0.1.0 (נוכחית)

- ✅ Next.js 15.4.6 עם App Router
- ✅ React 19.1.0
- ✅ TypeScript 5 עם strict mode
- ✅ Tailwind CSS 4
- ✅ Zustand לניהול state
- ✅ TanStack Query לניהול server state
- ✅ Socket.io Client לעדכונים בזמן אמת
- ✅ React Hook Form עם Zod validation
- ✅ Headless UI לקומפוננטים נגישים
- ✅ Netlify deployment עם static export
- ✅ ESLint + Prettier + TypeScript checks
- ✅ RTL support
- ✅ Mobile responsive design
- ✅ Accessibility (WCAG 2.2 AA)

---

**גרסה:** 0.1.0  
**תאריך:** 2025  
**אזור זמן:** Asia/Jerusalem (UTC+03)  
**Node.js:** 18+  
**Next.js:** 15.4.6
