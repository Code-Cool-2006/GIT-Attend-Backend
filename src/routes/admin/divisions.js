import express from 'express';
import sql from '../../db/index.js';

const router = express.Router();

// GET /api/admin/divisions
router.get('/', async (req, res) => {
  try {
    const divisions = await sql`
      SELECT
        d.id, d.name, d.department, d.semester,
        d.academic_year_id, d.max_capacity, d.created_at,
        COUNT(DISTINCT ds.student_id)::int AS students,
        COUNT(DISTINCT s.id)::int AS subjects
      FROM divisions d
      LEFT JOIN division_students ds ON d.id = ds.division_id
      LEFT JOIN subjects s ON d.id = s.division_id
      GROUP BY d.id
      ORDER BY d.created_at DESC
    `;
    res.json(divisions);
  } catch (err) {
    console.error('Divisions GET error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// POST /api/admin/divisions
router.post('/', async (req, res) => {
  try {
    const { name, department, semester, academicYearId, maxCapacity } = req.body;

    if (!name || !department || !semester || !academicYearId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [newDivision] = await sql`
      INSERT INTO divisions (name, department, semester, academic_year_id, max_capacity)
      VALUES (${name}, ${department}, ${parseInt(semester)}, ${academicYearId}, ${maxCapacity ? parseInt(maxCapacity) : null})
      RETURNING *
    `;

    res.json(newDivision);
  } catch (err) {
    console.error('Divisions POST error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// PUT /api/admin/divisions
router.put('/', async (req, res) => {
  try {
    const { id, name, department, semester, maxCapacity } = req.body;

    if (!id || !name || !department || !semester) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [updatedDivision] = await sql`
      UPDATE divisions
      SET name = ${name},
          department = ${department},
          semester = ${parseInt(semester)},
          max_capacity = ${maxCapacity ? parseInt(maxCapacity) : null}
      WHERE id = ${id}
      RETURNING *
    `;

    res.json(updatedDivision);
  } catch (err) {
    console.error('Divisions PUT error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// DELETE /api/admin/divisions?id=
router.delete('/', async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'ID is required' });
    }

    await sql`DELETE FROM divisions WHERE id = ${id}`;
    res.json({ success: true });
  } catch (err) {
    console.error('Divisions DELETE error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
