# ⚙️ Backend Setup & Deployment Guide
## Attendance Management System — Shared API

---

## Why a Separate Backend?

| Problem | Solution |
|---|---|
| Cannot expose `DATABASE_URL` in Expo or frontend | Backend keeps it in `.env`, never sent to client |
| Expo `fetch()` to Neon directly is impossible | All DB calls go through your API |
| No auth/role protection on raw DB | Backend middleware validates JWT before every query |
| Admin, Teacher, Student apps need one shared API | One deployed backend serves all 3 apps |

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Runtime | **Node.js** | Universal, works everywhere |
| Framework | **Express.js** | Lightweight, simple, production-proven |
| Database Client | **postgres.js** (`postgres`) | Fast, native Neon support |
| Auth | **jsonwebtoken** | JWT signing/verification |
| Password | **bcryptjs** | Password hashing |
| Validation | **zod** | Request body validation |
| Deployment | **Railway** | Free tier, auto-deploy from GitHub, no cold starts |

---

## Project Structure

```
attendance-backend/
├── src/
│   ├── db/
│   │   ├── index.js          ← Neon DB connection
│   │   └── queries/
│   │       ├── admin.js
│   │       ├── teacher.js
│   │       └── student.js
│   ├── middleware/
│   │   ├── auth.js           ← JWT verification
│   │   └── roles.js          ← Role-based access (admin/teacher/student)
│   ├── routes/
│   │   ├── admin/
│   │   │   ├── divisions.js
│   │   │   ├── students.js
│   │   │   ├── teachers.js
│   │   │   └── subjects.js
│   │   ├── teacher/
│   │   │   ├── auth.js
│   │   │   ├── schedule.js
│   │   │   ├── attendance.js
│   │   │   └── reports.js
│   │   └── student/
│   │       ├── auth.js
│   │       ├── subjects.js
│   │       └── attendance.js
│   └── index.js              ← Entry point
├── .env
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## Step 1: Initialize the Project

```bash
mkdir attendance-backend
cd attendance-backend
npm init -y
```

Install dependencies:

```bash
npm install express postgres jsonwebtoken bcryptjs zod cors dotenv helmet
npm install --save-dev nodemon
```

| Package | Purpose |
|---|---|
| `express` | HTTP server framework |
| `postgres` | PostgreSQL client for Neon |
| `jsonwebtoken` | JWT creation and verification |
| `bcryptjs` | Password hashing |
| `zod` | Request validation |
| `cors` | Allow Expo/frontend to call the API |
| `dotenv` | Load `.env` variables |
| `helmet` | Security headers |
| `nodemon` | Auto-restart on file change (dev only) |

---

## Step 2: Environment Variables

Create `.env` in the root:

```env
# Neon Database
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# JWT
JWT_SECRET=your_super_secret_key_here_make_it_long
JWT_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=development

# CORS - comma separated list of allowed origins
ALLOWED_ORIGINS=http://localhost:8081,https://your-expo-app.com
```

Create `.env.example` (commit this, NOT `.env`):

```env
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=
```

Add to `.gitignore`:

```
node_modules/
.env
```

---

## Step 3: Database Connection

```js
// src/db/index.js
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, {
  ssl: 'require',
  max: 10,              // max connections in pool
  idle_timeout: 20,     // close idle connections after 20s
  connect_timeout: 10,  // fail fast if Neon is unreachable
});

export default sql;
```

---

## Step 4: Entry Point

```js
// src/index.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

// Route imports
import adminTeachersRouter from './routes/admin/teachers.js';
import adminDivisionsRouter from './routes/admin/divisions.js';
import adminStudentsRouter from './routes/admin/students.js';
import adminSubjectsRouter from './routes/admin/subjects.js';
import teacherAuthRouter from './routes/teacher/auth.js';
import teacherScheduleRouter from './routes/teacher/schedule.js';
import teacherAttendanceRouter from './routes/teacher/attendance.js';
import teacherReportsRouter from './routes/teacher/reports.js';
import studentAuthRouter from './routes/student/auth.js';
import studentSubjectsRouter from './routes/student/subjects.js';
import studentAttendanceRouter from './routes/student/attendance.js';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Routes
app.use('/api/admin/teachers', adminTeachersRouter);
app.use('/api/admin/divisions', adminDivisionsRouter);
app.use('/api/admin/students', adminStudentsRouter);
app.use('/api/admin/subjects', adminSubjectsRouter);
app.use('/api/teacher/auth', teacherAuthRouter);
app.use('/api/teacher/schedule', teacherScheduleRouter);
app.use('/api/teacher/attendance', teacherAttendanceRouter);
app.use('/api/teacher/reports', teacherReportsRouter);
app.use('/api/student/auth', studentAuthRouter);
app.use('/api/student/subjects', studentSubjectsRouter);
app.use('/api/student/attendance', studentAttendanceRouter);

// 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

---

## Step 5: Auth Middleware

```js
// src/middleware/auth.js
import jwt from 'jsonwebtoken';

export const protect = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;   // { id, email, role }
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// src/middleware/roles.js
export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};
```

Usage in routes:

```js
import { protect } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/roles.js';

// Only admins
router.get('/', protect, requireRole('admin'), handler);

// Only teachers
router.post('/attendance', protect, requireRole('teacher'), handler);

// Only students
router.get('/my-attendance', protect, requireRole('student'), handler);
```

---

## Step 6: Teacher Login Route (Example)

```js
// src/routes/teacher/auth.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sql from '../../db/index.js';
import { protect } from '../../middleware/auth.js';

const router = express.Router();

// POST /api/teacher/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });

  try {
    const [teacher] = await sql`
      SELECT * FROM teachers WHERE email = ${email}
    `;

    if (!teacher)
      return res.status(401).json({ error: 'Invalid credentials' });

    if (!teacher.is_active)
      return res.status(403).json({ error: 'Account deactivated. Contact admin.' });

    const isValid = await bcrypt.compare(password, teacher.password_hash);
    if (!isValid)
      return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: teacher.id, email: teacher.email, role: 'teacher' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    await sql`UPDATE teachers SET last_login = NOW() WHERE id = ${teacher.id}`;

    res.json({
      token,
      temp_password: teacher.temp_password,
      teacher: { id: teacher.id, name: teacher.name, email: teacher.email }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/teacher/auth/change-password
router.put('/change-password', protect, async (req, res) => {
  const { current_password, new_password } = req.body;

  try {
    const [teacher] = await sql`
      SELECT * FROM teachers WHERE id = ${req.user.id}
    `;

    const isValid = await bcrypt.compare(current_password, teacher.password_hash);
    if (!isValid)
      return res.status(401).json({ error: 'Current password is wrong' });

    const hash = await bcrypt.hash(new_password, 10);
    await sql`
      UPDATE teachers
      SET password_hash = ${hash}, temp_password = false, updated_at = NOW()
      WHERE id = ${req.user.id}
    `;

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
```

---

## Step 7: package.json Scripts

```json
{
  "type": "module",
  "scripts": {
    "dev": "nodemon src/index.js",
    "start": "node src/index.js"
  }
}
```

---

## Step 8: Deploy to Railway

Railway is the easiest deployment for a Node.js + Neon setup. Free tier included.

### 8.1 Push to GitHub

```bash
git init
git add .
git commit -m "initial backend setup"
git remote add origin https://github.com/yourname/attendance-backend.git
git push -u origin main
```

### 8.2 Deploy on Railway

1. Go to [railway.app](https://railway.app) → **New Project**
2. Select **Deploy from GitHub repo**
3. Choose `attendance-backend`
4. Railway auto-detects Node.js

### 8.3 Add Environment Variables on Railway

In your Railway project → **Variables** tab, add:

```
DATABASE_URL        → your Neon connection string
JWT_SECRET          → your secret key
JWT_EXPIRES_IN      → 7d
NODE_ENV            → production
ALLOWED_ORIGINS     → * (or your Expo app URL)
```

### 8.4 Set Start Command

Railway auto-runs `npm start` which runs `node src/index.js`. No extra config needed.

### 8.5 Get Your Public URL

Railway gives you a URL like:
```
https://attendance-backend-production.up.railway.app
```

This is your base API URL. Use it in all your Expo apps:

```js
const API_BASE = 'https://attendance-backend-production.up.railway.app';
```

---

## Step 9: Test Before Connecting to Expo

Use the health check to confirm it's live:

```bash
curl https://attendance-backend-production.up.railway.app/health
# Response: { "status": "ok" }
```

Test login:

```bash
curl -X POST https://your-url.railway.app/api/teacher/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@college.edu","password":"Welcome@123"}'
```

---

## How Expo Apps Call the Backend

```js
// In your Expo app — create a single config file
// config/api.js
export const API_BASE = 'https://attendance-backend-production.up.railway.app';
export const API_HEADERS = async () => {
  const token = await SecureStore.getItemAsync('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// Usage anywhere in the app
const res = await fetch(`${API_BASE}/api/teacher/schedule/today`, {
  headers: await API_HEADERS(),
});
```

---

## Architecture Summary

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Admin App     │     │  Teacher App    │     │  Student App    │
│  (Next.js/Web)  │     │   (Expo)        │     │   (Expo)        │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                        │
         └───────────────────────┼────────────────────────┘
                                 │  HTTPS (JWT in header)
                                 ▼
                  ┌──────────────────────────┐
                  │    Express.js Backend    │
                  │     (Railway)            │
                  │                          │
                  │  /api/admin/*            │
                  │  /api/teacher/*          │
                  │  /api/student/*          │
                  └──────────────┬───────────┘
                                 │  postgres.js (SSL)
                                 ▼
                  ┌──────────────────────────┐
                  │      Neon PostgreSQL      │
                  │      (Serverless DB)      │
                  └──────────────────────────┘
```

---

## Checklist Before Going Live

- [ ] `.env` is in `.gitignore` — never committed
- [ ] All environment variables set in Railway dashboard
- [ ] `JWT_SECRET` is a long random string (min 32 chars)
- [ ] `NODE_ENV=production` set in Railway
- [ ] Health check endpoint returns `200 OK`
- [ ] Login endpoint tested with curl
- [ ] CORS `ALLOWED_ORIGINS` locked to your actual app URLs
- [ ] `temp_password` flow tested (forced reset on first login)
- [ ] All DB tables created in Neon before first request