import express from 'express';
import sql from '../../db/index.js';

const router = express.Router();

// GET /api/admin/subjects?divisionId=
router.get('/', async (req, res) => {
  try {
    const { divisionId } = req.query;

    const subjects = divisionId
      ? await sql`
          SELECT s.id, s.name, s.code, s.division_id, d.name AS division_name,
                 s.teacher_id, t.name AS teacher_name, s.created_at
          FROM subjects s
          LEFT JOIN divisions d ON s.division_id = d.id
          LEFT JOIN teachers t ON s.teacher_id = t.id
          WHERE s.division_id = ${divisionId}
          ORDER BY s.created_at DESC
        `
      : await sql`
          SELECT s.id, s.name, s.code, s.division_id, d.name AS division_name,
                 s.teacher_id, t.name AS teacher_name, s.created_at
          FROM subjects s
          LEFT JOIN divisions d ON s.division_id = d.id
          LEFT JOIN teachers t ON s.teacher_id = t.id
          ORDER BY s.created_at DESC
        `;

    res.json(subjects);
  } catch (err) {
    console.error('Subjects GET error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// POST /api/admin/subjects
router.post('/', async (req, res) => {
  try {
    const { name, code, divisionId, teacherId } = req.body;

    if (!name || !code || !divisionId) {
      return res.status(400).json({ error: 'Name, Code, and Division are required' });
    }

    const [newSubject] = await sql`
      INSERT INTO subjects (name, code, division_id, teacher_id)
      VALUES (${name}, ${code}, ${divisionId}, ${teacherId || null})
      RETURNING *
    `;

    res.json(newSubject);
  } catch (err) {
    console.error('Subjects POST error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// PUT /api/admin/subjects
router.put('/', async (req, res) => {
  try {
    const { id, name, code, divisionId, teacherId } = req.body;

    if (!id || !name || !code || !divisionId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [updatedSubject] = await sql`
      UPDATE subjects
      SET name = ${name}, code = ${code},
          division_id = ${divisionId}, teacher_id = ${teacherId || null}
      WHERE id = ${id}
      RETURNING *
    `;

    res.json(updatedSubject);
  } catch (err) {
    console.error('Subjects PUT error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// DELETE /api/admin/subjects?id=
router.delete('/', async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'ID is required' });
    }

    await sql`DELETE FROM subjects WHERE id = ${id}`;
    res.json({ success: true });
  } catch (err) {
    console.error('Subjects DELETE error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
