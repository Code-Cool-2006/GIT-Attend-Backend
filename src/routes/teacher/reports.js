import express from 'express';
import sql from '../../db/index.js';

const router = express.Router();

// GET /api/teacher/reports/shortage?teacher_id=&subject_id=&division_id=
router.get('/shortage', async (req, res) => {
  try {
    const { teacher_id, subject_id, division_id } = req.query;

    if (!teacher_id) return res.status(400).json({ error: 'teacher_id required' });

    const rows = await sql`
      WITH session_counts AS (
        SELECT
          cs.subject_id,
          COUNT(DISTINCT asess.id)::int as classes_held
        FROM attendance_sessions asess
        JOIN class_schedules cs ON cs.id = asess.schedule_id
        GROUP BY cs.subject_id
      ),
      student_attendance AS (
        SELECT
          a.student_id,
          cs.subject_id,
          COUNT(CASE WHEN a.status = 'Present' THEN 1 END)::int as attended
        FROM attendance a
        JOIN attendance_sessions asess ON asess.id = a.session_id
        JOIN class_schedules cs ON cs.id = asess.schedule_id
        GROUP BY a.student_id, cs.subject_id
      )
      SELECT
        st.id as student_id,
        st.name as student_name,
        st.roll_number,
        d.name as division_name,
        sub.name as subject_name,
        sub.code as subject_code,
        COALESCE(sc.classes_held, 0) as classes_held,
        COALESCE(sa.attended, 0) as attended,
        CASE
          WHEN COALESCE(sc.classes_held, 0) = 0 THEN 0
          ELSE ROUND((COALESCE(sa.attended, 0)::numeric / sc.classes_held) * 100, 1)
        END as percentage,
        CASE
          WHEN COALESCE(sc.classes_held, 0) = 0 THEN 0
          ELSE GREATEST(0,
            CEIL((0.75 * sc.classes_held - COALESCE(sa.attended, 0)) / 0.25)
          )
        END as classes_needed
      FROM subjects sub
      JOIN divisions d ON sub.division_id = d.id
      JOIN division_students ds ON ds.division_id = d.id
      JOIN students st ON st.id = ds.student_id
      LEFT JOIN session_counts sc ON sc.subject_id = sub.id
      LEFT JOIN student_attendance sa ON sa.student_id = st.id AND sa.subject_id = sub.id
      WHERE sub.teacher_id = ${teacher_id}
      ORDER BY percentage ASC, st.name
    `;

    const students = rows.map(r => ({
      ...r,
      status: Number(r.percentage) < 65 ? 'critical' : 'warning',
    }));

    res.json({ students });
  } catch (err) {
    console.error('Shortage report error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
