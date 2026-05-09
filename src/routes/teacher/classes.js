import express from 'express';
import sql from '../../db/index.js';

const router = express.Router();

// GET /api/teacher/classes?teacher_id=
router.get('/', async (req, res) => {
  try {
    const { teacher_id } = req.query;
    if (!teacher_id) return res.status(400).json({ error: 'teacher_id required' });

    // Get all subjects + their division info + student count
    const subjectRows = await sql`
      SELECT
        s.id as subject_id, s.name as subject_name, s.code as subject_code,
        d.id as division_id, d.name as division_name, d.semester,
        COUNT(DISTINCT ds.student_id)::int as student_count
      FROM subjects s
      JOIN divisions d ON s.division_id = d.id
      LEFT JOIN division_students ds ON ds.division_id = d.id
      WHERE s.teacher_id = ${teacher_id}
      GROUP BY s.id, s.name, s.code, d.id, d.name, d.semester
      ORDER BY s.name, d.name
    `;

    // Get all schedules for these subjects
    const subjectIds = subjectRows.map(r => r.subject_id);
    const scheduleRows = subjectIds.length > 0
      ? await sql`
          SELECT id, subject_id, day_of_week, start_time, end_time, room
          FROM class_schedules
          WHERE subject_id = ANY(${subjectIds}::uuid[])
          ORDER BY day_of_week, start_time
        `
      : [];

    // Group schedules by subject_id
    const scheduleMap = {};
    for (const sc of scheduleRows) {
      if (!scheduleMap[sc.subject_id]) scheduleMap[sc.subject_id] = [];
      scheduleMap[sc.subject_id].push(sc);
    }

    const classes = subjectRows.map(s => ({
      ...s,
      schedules: scheduleMap[s.subject_id] ?? [],
    }));

    res.json({ classes });
  } catch (err) {
    console.error('Teacher classes error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/teacher/classes/:classId/students
router.get('/:classId/students', async (req, res) => {
  try {
    const { classId: schedule_id } = req.params;

    const rows = await sql`
      SELECT st.id, st.roll_number, st.name, st.email, st.phone
      FROM class_schedules cs
      JOIN subjects s ON cs.subject_id = s.id
      JOIN division_students ds ON ds.division_id = s.division_id
      JOIN students st ON st.id = ds.student_id
      WHERE cs.id = ${schedule_id}
      ORDER BY st.roll_number
    `;

    res.json({ students: rows });
  } catch (err) {
    console.error('Class students error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
