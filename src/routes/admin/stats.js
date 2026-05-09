import express from 'express';
import sql from '../../db/index.js';

const router = express.Router();

// GET /api/admin/stats
router.get('/', async (req, res) => {
  try {
    const [[studentCount], [teacherCount], [divisionCount], [activeYear]] = await Promise.all([
      sql`SELECT COUNT(*)::int AS value FROM students`,
      sql`SELECT COUNT(*)::int AS value FROM teachers`,
      sql`SELECT COUNT(*)::int AS value FROM divisions`,
      sql`SELECT id, year FROM academic_years WHERE is_active = true LIMIT 1`,
    ]);

    // Fetch recent activities
    const [recentStudents, recentTeachers, recentSubjects] = await Promise.all([
      sql`SELECT name, created_at FROM students ORDER BY created_at DESC LIMIT 5`,
      sql`SELECT name, created_at FROM teachers ORDER BY created_at DESC LIMIT 5`,
      sql`SELECT name, created_at FROM subjects ORDER BY created_at DESC LIMIT 5`,
    ]);

    const activities = [
      ...recentStudents.map(s => ({ title: `New Student: ${s.name}`, time: new Date(s.created_at), type: 'student' })),
      ...recentTeachers.map(t => ({ title: `New Teacher: ${t.name}`, time: new Date(t.created_at), type: 'teacher' })),
      ...recentSubjects.map(sub => ({ title: `New Subject: ${sub.name}`, time: new Date(sub.created_at), type: 'subject' })),
    ]
      .sort((a, b) => b.time.getTime() - a.time.getTime())
      .slice(0, 5)
      .map(act => {
        const diff = Date.now() - act.time.getTime();
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(mins / 60);
        const days = Math.floor(hours / 24);

        let timeStr = 'Just now';
        if (days > 0) timeStr = `${days}d ago`;
        else if (hours > 0) timeStr = `${hours}h ago`;
        else if (mins > 0) timeStr = `${mins}m ago`;

        return { title: act.title, time: timeStr, type: act.type };
      });

    res.json({
      students: studentCount?.value ?? 0,
      teachers: teacherCount?.value ?? 0,
      divisions: divisionCount?.value ?? 0,
      activeYear: activeYear?.year || 'None Set',
      activeYearId: activeYear?.id || null,
      attendanceToday: '94%', // Placeholder
      activities: activities.length > 0
        ? activities
        : [{ title: 'System Initialized', time: 'Just now', type: 'system' }],
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
