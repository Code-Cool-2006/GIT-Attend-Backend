import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Route imports — Admin
import adminAuthRouter from './routes/admin/auth.js';
import adminTeachersRouter from './routes/admin/teachers.js';
import adminDivisionsRouter from './routes/admin/divisions.js';
import adminStudentsRouter from './routes/admin/students.js';
import adminSubjectsRouter from './routes/admin/subjects.js';
import adminSchedulesRouter from './routes/admin/schedules.js';
import adminStatsRouter from './routes/admin/stats.js';
import adminReportsRouter from './routes/admin/reports.js';

// Route imports — Teacher
import teacherAuthRouter from './routes/teacher/auth.js';
import teacherScheduleRouter from './routes/teacher/schedule.js';
import teacherAttendanceRouter from './routes/teacher/attendance.js';
import teacherClassesRouter from './routes/teacher/classes.js';
import teacherReportsRouter from './routes/teacher/reports.js';
import teacherAnalyticsRouter from './routes/teacher/analytics.js';
import teacherProfileRouter from './routes/teacher/profile.js';

// Route imports — Student
import studentAuthRouter from './routes/student/auth.js';
import studentSubjectsRouter from './routes/student/subjects.js';
import studentAttendanceRouter from './routes/student/attendance.js';

const app = express();

// ── Middleware ──────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
app.use(express.json());

// ── Health Check ───────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── Admin Routes ───────────────────────────────────────────
app.use('/api/admin/auth', adminAuthRouter);
app.use('/api/admin/teachers', adminTeachersRouter);
app.use('/api/admin/divisions', adminDivisionsRouter);
app.use('/api/admin/students', adminStudentsRouter);
app.use('/api/admin/subjects', adminSubjectsRouter);
app.use('/api/admin/schedules', adminSchedulesRouter);
app.use('/api/admin/stats', adminStatsRouter);
app.use('/api/admin/reports', adminReportsRouter);

// ── Teacher Routes ─────────────────────────────────────────
app.use('/api/teacher/auth', teacherAuthRouter);
app.use('/api/teacher/schedule', teacherScheduleRouter);
app.use('/api/teacher/attendance', teacherAttendanceRouter);
app.use('/api/teacher/classes', teacherClassesRouter);
app.use('/api/teacher/reports', teacherReportsRouter);
app.use('/api/teacher/analytics', teacherAnalyticsRouter);
app.use('/api/teacher/profile', teacherProfileRouter);

// ── Student Routes ─────────────────────────────────────────
app.use('/api/student/auth', studentAuthRouter);
app.use('/api/student/subjects', studentSubjectsRouter);
app.use('/api/student/attendance', studentAttendanceRouter);

// ── 404 Handler ────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Global Error Handler ───────────────────────────────────
app.use((err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Log the full error server-side for debugging
  console.error('❌ Global Error:', err);

  const response = {
    error: 'Internal server error',
    path: req.path
  };

  // Only expose details in development
  if (!isProduction) {
    response.message = err.message;
    response.detail = err.detail || null;
    response.stack = err.stack;
  }

  res.status(500).json(response);
});

// ── Start Server ───────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Attendance Backend running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   ENV: ${process.env.NODE_ENV || 'development'}\n`);
});
