import express from 'express';
import sql from '../../db/index.js';

const router = express.Router();

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// GET /api/teacher/schedule/today?teacher_id=
router.get('/today', async (req, res) => {
  try {
    const { teacher_id } = req.query;
    if (!teacher_id) return res.status(400).json({ error: 'teacher_id required' });

    const todayName = DAYS[new Date().getDay()];
    const todayDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const rows = await sql`
      SELECT
        cs.id as schedule_id,
        s.id as subject_id,
        s.name as subject_name,
        s.code as subject_code,
        d.name as division_name,
        cs.day_of_week,
        cs.start_time,
        cs.end_time,
        cs.room,
        asess.id as session_id,
        CASE WHEN asess.id IS NOT NULL THEN true ELSE false END as already_marked
      FROM class_schedules cs
      JOIN subjects s ON cs.subject_id = s.id
      JOIN divisions d ON s.division_id = d.id
      LEFT JOIN attendance_sessions asess
        ON asess.schedule_id = cs.id AND asess.session_date = ${todayDate}::date
      WHERE s.teacher_id = ${teacher_id}
        AND cs.day_of_week = ${todayName}
      ORDER BY cs.start_time
    `;

    res.json({ classes: rows, today: todayDate, day: todayName });
  } catch (err) {
    console.error('Schedule today error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
