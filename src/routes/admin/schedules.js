import express from 'express';
import sql from '../../db/index.js';

const router = express.Router();

// GET /api/admin/schedules?subjectId=
router.get('/', async (req, res) => {
  try {
    const { subjectId } = req.query;

    const schedules = subjectId
      ? await sql`
          SELECT cs.id, cs.subject_id, s.name AS subject_name,
                 d.name AS division_name, cs.day_of_week,
                 cs.start_time, cs.end_time, cs.room, cs.created_at
          FROM class_schedules cs
          LEFT JOIN subjects s ON cs.subject_id = s.id
          LEFT JOIN divisions d ON s.division_id = d.id
          WHERE cs.subject_id = ${subjectId}
          ORDER BY cs.created_at DESC
        `
      : await sql`
          SELECT cs.id, cs.subject_id, s.name AS subject_name,
                 d.name AS division_name, cs.day_of_week,
                 cs.start_time, cs.end_time, cs.room, cs.created_at
          FROM class_schedules cs
          LEFT JOIN subjects s ON cs.subject_id = s.id
          LEFT JOIN divisions d ON s.division_id = d.id
          ORDER BY cs.created_at DESC
        `;

    res.json(schedules);
  } catch (err) {
    console.error('Schedules GET error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// POST /api/admin/schedules
router.post('/', async (req, res) => {
  try {
    const { subjectId, dayOfWeek, startTime, endTime, room } = req.body;

    if (!subjectId || !dayOfWeek || !startTime || !endTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [newSchedule] = await sql`
      INSERT INTO class_schedules (subject_id, day_of_week, start_time, end_time, room)
      VALUES (${subjectId}, ${dayOfWeek}, ${startTime}, ${endTime}, ${room || null})
      RETURNING *
    `;

    res.json(newSchedule);
  } catch (err) {
    console.error('Schedules POST error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// PUT /api/admin/schedules
router.put('/', async (req, res) => {
  try {
    const { id, subjectId, dayOfWeek, startTime, endTime, room } = req.body;

    if (!id || !subjectId || !dayOfWeek || !startTime || !endTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [updatedSchedule] = await sql`
      UPDATE class_schedules
      SET subject_id = ${subjectId}, day_of_week = ${dayOfWeek},
          start_time = ${startTime}, end_time = ${endTime}, room = ${room || null}
      WHERE id = ${id}
      RETURNING *
    `;

    res.json(updatedSchedule);
  } catch (err) {
    console.error('Schedules PUT error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// DELETE /api/admin/schedules?id=
router.delete('/', async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'ID is required' });
    }

    await sql`DELETE FROM class_schedules WHERE id = ${id}`;
    res.json({ success: true });
  } catch (err) {
    console.error('Schedules DELETE error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
