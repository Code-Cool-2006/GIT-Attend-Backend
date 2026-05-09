import express from 'express';
import sql from '../../db/index.js';

const router = express.Router();

// GET /api/admin/teachers
router.get('/', async (req, res) => {
  try {
    const teachers = await sql`
      SELECT id, employee_id, name, email, department, is_active, temp_password, created_at
      FROM teachers
      ORDER BY created_at DESC
    `;
    res.json(teachers);
  } catch (err) {
    console.error('Teachers GET error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// POST /api/admin/teachers
router.post('/', async (req, res) => {
  try {
    const { name, employeeId, email, department } = req.body;

    if (!name || !employeeId) {
      return res.status(400).json({ error: 'Name and Employee ID are required' });
    }

    const [newTeacher] = await sql`
      INSERT INTO teachers (name, employee_id, email, department)
      VALUES (${name}, ${employeeId}, ${email && email.trim() !== '' ? email : null}, ${department || null})
      RETURNING *
    `;

    res.json(newTeacher);
  } catch (err) {
    console.error('Teachers POST error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// PUT /api/admin/teachers
router.put('/', async (req, res) => {
  try {
    const { id, name, employeeId, email, department } = req.body;

    if (!id || !name || !employeeId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [updatedTeacher] = await sql`
      UPDATE teachers
      SET name = ${name},
          employee_id = ${employeeId},
          email = ${email && email.trim() !== '' ? email : null},
          department = ${department || null}
      WHERE id = ${id}
      RETURNING *
    `;

    res.json(updatedTeacher);
  } catch (err) {
    console.error('Teachers PUT error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// DELETE /api/admin/teachers?id=
router.delete('/', async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'ID is required' });
    }

    await sql`DELETE FROM teachers WHERE id = ${id}`;
    res.json({ success: true });
  } catch (err) {
    console.error('Teachers DELETE error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
