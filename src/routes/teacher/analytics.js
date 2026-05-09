import express from 'express';
import sql from '../../db/index.js';

const router = express.Router();

// GET /api/teacher/analytics/:classId?teacher_id=
router.get('/:classId', async (req, res) => {
  try {
    const { classId: schedule_id } = req.params;

    // Get all sessions for this schedule, compute per-session data
    const sessions = await sql`
      SELECT
        asess.session_date,
        COUNT(a.id)::int as total,
        SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END)::int as present
      FROM attendance_sessions asess
      LEFT JOIN attendance a ON a.session_id = asess.id
      WHERE asess.schedule_id = ${schedule_id}
      GROUP BY asess.session_date
      ORDER BY asess.session_date
    `;

    // Build per-session data
    const sessionData = sessions.map(s => ({
      date: s.session_date,
      present: s.present ?? 0,
      total: s.total ?? 0,
      pct: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0,
    }));

    // Aggregate by ISO week
    const weekMap = {};
    for (const s of sessionData) {
      const d = new Date(s.date);
      const week = getISOWeek(d);
      if (!weekMap[week]) weekMap[week] = { present: 0, total: 0 };
      weekMap[week].present += s.present;
      weekMap[week].total += s.total;
    }

    const weekly = Object.entries(weekMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8) // last 8 weeks
      .map(([week, { present, total }]) => ({
        week,
        present,
        total,
        pct: total > 0 ? Math.round((present / total) * 100) : 0,
      }));

    res.json({ weekly, sessions: sessionData.slice(-20) });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: err.message });
  }
});

function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    1 +
    Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export default router;
