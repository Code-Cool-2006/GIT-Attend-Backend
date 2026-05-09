import express from 'express';
import sql from '../../db/index.js';

const router = express.Router();

// GET /api/teacher/profile?teacher_id=
router.get('/', async (req, res) => {
  try {
    const { teacher_id } = req.query;
    if (!teacher_id) return res.status(400).json({ error: 'teacher_id required' });

    const [teacherRows, subjectRows] = await Promise.all([
      sql`
        SELECT id, employee_id, name, email, department, is_active, temp_password
        FROM teachers WHERE id = ${teacher_id}
      `,
      sql`
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
      `,
    ]);

    if (teacherRows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    res.json({ teacher: teacherRows[0], subjects: subjectRows });
  } catch (err) {
    console.error('Teacher profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
