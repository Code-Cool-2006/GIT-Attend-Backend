import express from 'express';
import sql from '../../db/index.js';

const router = express.Router();

// POST /api/teacher/attendance — submit a new attendance session
router.post('/', async (req, res) => {
  try {
    const { teacher_id, schedule_id, session_date, records } = req.body;

    if (!teacher_id || !schedule_id || !session_date || !Array.isArray(records)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create or get the session
    const [session] = await sql`
      INSERT INTO attendance_sessions (schedule_id, teacher_id, session_date)
      VALUES (${schedule_id}, ${teacher_id}, ${session_date}::date)
      ON CONFLICT (schedule_id, session_date) DO UPDATE
        SET updated_at = now()
      RETURNING id
    `;
    const session_id = session.id;

    // Upsert attendance records
    for (const rec of records) {
      await sql`
        INSERT INTO attendance (student_id, schedule_id, session_id, date, status, remarks)
        VALUES (
          ${rec.student_id}, ${schedule_id}, ${session_id},
          ${session_date}::timestamp, ${rec.status}, ${rec.remarks ?? null}
        )
        ON CONFLICT DO NOTHING
      `;
    }

    // Update existing records
    for (const rec of records) {
      await sql`
        UPDATE attendance
        SET status = ${rec.status}, remarks = ${rec.remarks ?? null}
        WHERE student_id = ${rec.student_id}
          AND session_id = ${session_id}
      `;
    }

    res.json({ session_id });
  } catch (err) {
    console.error('Submit attendance error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/teacher/attendance/history/:classId
router.get('/history/:classId', async (req, res) => {
  try {
    const { classId: schedule_id } = req.params;

    const sessions = await sql`
      SELECT
        asess.id,
        asess.session_date::text,
        asess.marked_at,
        asess.updated_at,
        asess.schedule_id,
        s.name as subject_name,
        d.name as division_name,
        COUNT(a.id)::int as total,
        SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END)::int as present_count,
        SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END)::int as absent_count,
        SUM(CASE WHEN a.status = 'Leave' THEN 1 ELSE 0 END)::int as leave_count
      FROM attendance_sessions asess
      JOIN class_schedules cs ON cs.id = asess.schedule_id
      JOIN subjects s ON s.id = cs.subject_id
      JOIN divisions d ON d.id = s.division_id
      LEFT JOIN attendance a ON a.session_id = asess.id
      WHERE asess.schedule_id = ${schedule_id}
      GROUP BY asess.id, s.name, d.name
      ORDER BY asess.session_date DESC
    `;

    res.json({ sessions });
  } catch (err) {
    console.error('Attendance history error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/teacher/attendance/:sessionId — session summary + records
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId: session_id } = req.params;

    const [session] = await sql`
      SELECT
        asess.id, asess.session_date::text, asess.marked_at, asess.updated_at,
        asess.schedule_id, s.name as subject_name, d.name as division_name
      FROM attendance_sessions asess
      JOIN class_schedules cs ON cs.id = asess.schedule_id
      JOIN subjects s ON s.id = cs.subject_id
      JOIN divisions d ON d.id = s.division_id
      WHERE asess.id = ${session_id}
    `;

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const records = await sql`
      SELECT st.id, st.roll_number, st.name, st.email,
             a.status, a.remarks
      FROM attendance a
      JOIN students st ON st.id = a.student_id
      WHERE a.session_id = ${session_id}
      ORDER BY st.roll_number
    `;

    const present = records.filter(r => r.status === 'Present').length;
    const absent = records.filter(r => r.status === 'Absent').length;
    const leave = records.filter(r => r.status === 'Leave').length;

    res.json({
      session: {
        ...session,
        present_count: present,
        absent_count: absent,
        leave_count: leave,
        total: records.length,
        records,
      },
    });
  } catch (err) {
    console.error('Session detail error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/teacher/attendance/:sessionId — edit existing session records (24h window)
router.put('/:sessionId', async (req, res) => {
  try {
    const { sessionId: session_id } = req.params;
    const { records } = req.body;

    // Check 24h edit window
    const [sessionRow] = await sql`
      SELECT marked_at FROM attendance_sessions WHERE id = ${session_id}
    `;
    if (!sessionRow) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const markedAt = new Date(sessionRow.marked_at);
    const hoursDiff = (Date.now() - markedAt.getTime()) / 1000 / 3600;
    if (hoursDiff > 24) {
      return res.status(403).json({ error: 'Edit window (24h) has passed' });
    }

    for (const rec of records) {
      await sql`
        UPDATE attendance
        SET status = ${rec.status}, remarks = ${rec.remarks ?? null}
        WHERE student_id = ${rec.student_id} AND session_id = ${session_id}
      `;
    }

    await sql`
      UPDATE attendance_sessions SET updated_at = now() WHERE id = ${session_id}
    `;

    res.json({ ok: true });
  } catch (err) {
    console.error('Edit attendance error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/teacher/attendance/:sessionId/detail — detailed session view
router.get('/:sessionId/detail', async (req, res) => {
  try {
    const { sessionId: session_id } = req.params;

    const [session] = await sql`
      SELECT
        asess.id, asess.session_date::text, asess.marked_at, asess.updated_at,
        asess.schedule_id, s.name as subject_name, d.name as division_name
      FROM attendance_sessions asess
      JOIN class_schedules cs ON cs.id = asess.schedule_id
      JOIN subjects s ON s.id = cs.subject_id
      JOIN divisions d ON d.id = s.division_id
      WHERE asess.id = ${session_id}
    `;

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const records = await sql`
      SELECT st.id, st.roll_number, st.name, st.email,
             a.status, a.remarks
      FROM attendance a
      JOIN students st ON st.id = a.student_id
      WHERE a.session_id = ${session_id}
      ORDER BY st.roll_number
    `;

    const present = records.filter(r => r.status === 'Present').length;
    const absent = records.filter(r => r.status === 'Absent').length;
    const leave = records.filter(r => r.status === 'Leave').length;

    res.json({
      session: {
        ...session,
        present_count: present,
        absent_count: absent,
        leave_count: leave,
        total: records.length,
        records,
      },
    });
  } catch (err) {
    console.error('Session detail error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
