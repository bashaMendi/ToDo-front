# מדריך התקנה והגדרה - מערכת ניהול משימות משותפת

## דרישות מקדימות

### תוכנות נדרשות

- **Node.js 20+** - [הורדה](https://nodejs.org/)
- **npm או yarn** - מגיע עם Node.js
- **Git** - [הורדה](https://git-scm.com/)
- **VS Code** (מומלץ) - [הורדה](https://code.visualstudio.com/)

### חשבונות ענן (חינמיים)

- **MongoDB Atlas** - [הרשמה](https://www.mongodb.com/atlas)
- **Redis Cloud** - [הרשמה](https://redis.com/try-free/)
- **Vercel** - [הרשמה](https://vercel.com/)
- **Render/Fly.io/Railway** - [הרשמה](https://render.com/)

## התקנה מקומית

### 1. Clone הפרויקט

```bash
# Clone הפרויקט
git clone <repository-url>
cd to-do-list-front

# או אם אתה מתחיל מאפס
npx create-next-app@latest to-do-list-front --typescript --tailwind --app --src-dir --import-alias "@/*"
cd to-do-list-front
```

### 2. התקנת תלויות

```bash
# התקנת כל התלויות
npm install

# או עם yarn
yarn install
```

### 3. הגדרת משתני סביבה

צור קובץ `.env.local` בתיקיית הפרויקט:

```env
# Frontend Environment Variables
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_TIMEZONE=Asia/Jerusalem

# Backend Environment Variables (אם מריץ Backend מקומי)
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/shared-tasks?retryWrites=true&w=majority"
REDIS_URL="redis://username:password@redis-host:port"
SESSION_SECRET="your-super-secret-session-key-64-chars-long"
PEPPER="your-pepper-key-32-chars-long"

# Google OAuth (אופציונלי לפיתוח)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Email Configuration (אופציונלי)
MAIL_HOST=smtp.sendgrid.net
MAIL_USER=apikey
MAIL_PASS=your-sendgrid-api-key

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### 4. הגדרת מסד נתונים (MongoDB Atlas)

#### יצירת Cluster

1. היכנס ל-[MongoDB Atlas](https://cloud.mongodb.com/)
2. צור חשבון חדש או התחבר
3. צור Cluster חדש (בחר M0 - Free Tier)
4. בחר Cloud Provider ו-Region הקרובים אליך

#### הגדרת Network Access

1. לך ל-Network Access
2. הוסף IP Address: `0.0.0.0/0` (לפיתוח) או IP הספציפי שלך
3. או השתמש ב-Allow Access from Anywhere

#### יצירת Database User

1. לך ל-Database Access
2. צור Database User חדש
3. בחר Password Authentication
4. תן הרשאות Read and write to any database
5. שמור את שם המשתמש והסיסמה

#### קבלת Connection String

1. לך ל-Databases
2. לחץ על Connect
3. בחר Connect your application
4. העתק את ה-Connection String
5. החלף `<password>` עם הסיסמה שיצרת

### 5. הגדרת Redis

#### Redis Cloud

1. היכנס ל-[Redis Cloud](https://redis.com/try-free/)
2. צור חשבון חדש
3. צור Database חדש (בחר Free Tier - 30MB)
4. העתק את ה-Connection String

#### Redis מקומי (אופציונלי)

```bash
# התקנת Redis על macOS
brew install redis
brew services start redis

# התקנת Redis על Ubuntu
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server

# בדיקה שהרדיס עובד
redis-cli ping
# צריך לקבל: PONG
```

### 6. הרצת הפרויקט

```bash
# הרצת הפרויקט בפיתוח
npm run dev

# או עם yarn
yarn dev
```

הפרויקט יהיה זמין ב: http://localhost:3000

## הגדרת Backend (אופציונלי לפיתוח)

### 1. יצירת Backend Repository

```bash
# צור תיקייה חדשה ל-Backend
mkdir shared-tasks-backend
cd shared-tasks-backend

# אתחל פרויקט Node.js
npm init -y

# התקן תלויות
npm install fastify @fastify/cookie @fastify/cors socket.io prisma @prisma/client argon2 zod pino
npm install -D typescript @types/node ts-node nodemon
```

### 2. הגדרת TypeScript

צור קובץ `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 3. הגדרת Prisma

```bash
# אתחל Prisma
npx prisma init

# הגדר את DATABASE_URL ב-.env
# צור את ה-Schema (ראה ARCHITECTURE.md)
# דחוף את ה-Schema למסד הנתונים
npx prisma db push

# צור את ה-Client
npx prisma generate
```

### 4. הרצת Backend

```bash
# הרצה בפיתוח
npm run dev

# או הרצה רגילה
npm start
```

## הגדרת Google OAuth

### 1. יצירת Google Cloud Project

1. היכנס ל-[Google Cloud Console](https://console.cloud.google.com/)
2. צור פרויקט חדש
3. אתחל את Google+ API

### 2. יצירת OAuth 2.0 Credentials

1. לך ל-APIs & Services > Credentials
2. צור OAuth 2.0 Client ID
3. בחר Web application
4. הוסף Authorized redirect URIs:
   - `http://localhost:3001/auth/google/callback` (פיתוח)
   - `https://api.example.com/auth/google/callback` (ייצור)

### 3. העתקת Credentials

העתק את Client ID ו-Client Secret לקובץ `.env.local`

## הגדרת Email (SendGrid)

### 1. יצירת חשבון SendGrid

1. היכנס ל-[SendGrid](https://sendgrid.com/)
2. צור חשבון חינמי
3. אמת את הדומיין שלך

### 2. יצירת API Key

1. לך ל-Settings > API Keys
2. צור API Key חדש
3. בחר Full Access או Mail Send בלבד
4. העתק את ה-API Key

### 3. הגדרת משתני סביבה

הוסף את ה-API Key לקובץ `.env.local`:

```env
MAIL_HOST=smtp.sendgrid.net
MAIL_USER=apikey
MAIL_PASS=your-sendgrid-api-key
```

## פריסה לענן

### Frontend - Vercel

#### 1. חיבור Repository

1. היכנס ל-[Vercel](https://vercel.com/)
2. לחץ על "New Project"
3. בחר את ה-Repository שלך
4. Vercel יזהה אוטומטית שזה פרויקט Next.js

#### 2. הגדרת משתני סביבה

ב-Vercel Dashboard:

1. לך ל-Project Settings > Environment Variables
2. הוסף את המשתנים הבאים:
   ```
   NEXT_PUBLIC_API_BASE_URL=https://api.example.com
   NEXT_PUBLIC_WS_URL=wss://api.example.com
   NEXT_PUBLIC_TIMEZONE=Asia/Jerusalem
   ```

#### 3. Deploy

Vercel יבצע Deploy אוטומטי על כל push ל-main branch

### Backend - Render

#### 1. חיבור Repository

1. היכנס ל-[Render](https://render.com/)
2. לחץ על "New Web Service"
3. בחר את ה-Repository של ה-Backend
4. בחר Node.js כסביבה

#### 2. הגדרת Build & Start Commands

```
Build Command: npm ci && npm run build
Start Command: npm start
```

#### 3. הגדרת משתני סביבה

הוסף את כל המשתנים מ-.env.local:

- `DATABASE_URL`
- `REDIS_URL`
- `SESSION_SECRET`
- `PEPPER`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `MAIL_HOST`
- `MAIL_USER`
- `MAIL_PASS`
- `ALLOWED_ORIGINS`

#### 4. הגדרת Health Check

```
Health Check Path: /health
```

## בדיקות ואיכות

### התקנת כלי בדיקה

```bash
# התקנת כלי בדיקה
npm install -D jest @testing-library/react @testing-library/jest-dom @types/jest
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install -D prettier eslint-config-prettier eslint-plugin-prettier
npm install -D playwright
```

### הגדרת Jest

צור קובץ `jest.config.js`:

```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

module.exports = createJestConfig(customJestConfig);
```

### הגדרת ESLint

צור קובץ `.eslintrc.json`:

```json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn"
  }
}
```

### הרצת בדיקות

```bash
# בדיקות יחידה
npm test

# בדיקות E2E
npm run test:e2e

# בדיקות עומס
npm run test:load

# Linting
npm run lint

# Type checking
npm run typecheck
```

## פתרון בעיות נפוצות

### בעיות חיבור למסד נתונים

```bash
# בדיקת חיבור MongoDB
npx prisma db pull

# איפוס מסד נתונים
npx prisma db push --force-reset

# צפייה בנתונים
npx prisma studio
```

### בעיות Redis

```bash
# בדיקת חיבור Redis
redis-cli -u "redis://username:password@host:port" ping

# ניקוי Cache
redis-cli -u "redis://username:password@host:port" FLUSHALL
```

### בעיות WebSocket

```bash
# בדיקת חיבור WebSocket
# פתח Developer Tools > Network > WS
# בדוק שהחיבור מצליח
```

### בעיות Build

```bash
# ניקוי Cache
rm -rf .next
rm -rf node_modules
npm install

# Rebuild
npm run build
```

## כלי פיתוח מומלצים

### VS Code Extensions

- **ES7+ React/Redux/React-Native snippets**
- **Tailwind CSS IntelliSense**
- **Prisma**
- **TypeScript Importer**
- **Auto Rename Tag**
- **Bracket Pair Colorizer**
- **GitLens**

### כלי פיתוח נוספים

- **Postman/Insomnia** - לבדיקת API
- **MongoDB Compass** - לניהול מסד נתונים
- **Redis Desktop Manager** - לניהול Redis
- **ngrok** - לחשיפת localhost

## משאבים נוספים

### תיעוד רשמי

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Socket.io Documentation](https://socket.io/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### מדריכים

- [MongoDB Atlas Setup](https://docs.atlas.mongodb.com/getting-started/)
- [Redis Cloud Setup](https://docs.redis.com/latest/rc/)
- [Vercel Deployment](https://vercel.com/docs)
- [Render Deployment](https://render.com/docs)

---

**גרסה:** 1.0  
**תאריך:** 16.08.2025  
**אזור זמן:** Asia/Jerusalem (UTC+03)
