import express from 'express';
import sql from '../../db/index.js';

const router = express.Router();

// GET /api/admin/students
router.get('/', async (req, res) => {
  try {
    const students = await sql`
      SELECT
        st.id, st.name, st.roll_number, st.email, st.phone,
        st.department, st.semester, st.created_at,
        d.id AS division_id,
        d.name AS division_name
      FROM students st
      LEFT JOIN division_students ds ON st.id = ds.student_id
      LEFT JOIN divisions d ON ds.division_id = d.id
      ORDER BY st.created_at DESC
    `;
    res.json(students);
  } catch (err) {
    console.error('Students GET error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// POST /api/admin/students
router.post('/', async (req, res) => {
  try {
    const { name, rollNumber, email, phone, department, semester, divisionId } = req.body;

    if (!name || !rollNumber) {
      return res.status(400).json({ error: 'Name and Roll Number are required' });
    }

    const [student] = await sql`
      INSERT INTO students (name, roll_number, email, phone, department, semester)
      VALUES (
        ${name},
        ${rollNumber},
        ${email && email.trim() !== '' ? email : null},
        ${phone && phone.trim() !== '' ? phone : null},
        ${department || null},
        ${semester ? parseInt(semester) : null}
      )
      RETURNING *
    `;

    if (divisionId && divisionId !== '') {
      await sql`
        INSERT INTO division_students (student_id, division_id)
        VALUES (${student.id}, ${divisionId})
      `;
    }

    res.json(student);
  } catch (err) {
    console.error('Students POST error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// PUT /api/admin/students
router.put('/', async (req, res) => {
  try {
    const { id, name, rollNumber, email, phone, department, semester, divisionId } = req.body;

    if (!id || !name || !rollNumber) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const updates = {
      name,
      roll_number: rollNumber,
    };

    if (email !== undefined) updates.email = email && email.trim() !== '' ? email : null;
    if (phone !== undefined) updates.phone = phone && phone.trim() !== '' ? phone : null;
    if (department !== undefined) updates.department = department;
    if (semester !== undefined) updates.semester = semester ? parseInt(semester) : null;

    const [student] = await sql`
      UPDATE students
      SET name = ${updates.name},
          roll_number = ${updates.roll_number},
          email = ${updates.email !== undefined ? updates.email : sql`email`},
          phone = ${updates.phone !== undefined ? updates.phone : sql`phone`},
          department = ${updates.department !== undefined ? updates.department : sql`department`},
          semester = ${updates.semester !== undefined ? updates.semester : sql`semester`}
      WHERE id = ${id}
      RETURNING *
    `;

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Clear existing divisions
    await sql`DELETE FROM division_students WHERE student_id = ${id}`;

    // Re-assign if valid
    if (divisionId && divisionId !== '' && divisionId !== 'null' && divisionId !== 'Unassigned') {
      const [div] = await sql`SELECT id FROM divisions WHERE id = ${divisionId} LIMIT 1`;
      if (!div) {
        return res.status(400).json({ error: 'Selected division does not exist' });
      }
      await sql`
        INSERT INTO division_students (student_id, division_id)
        VALUES (${id}, ${divisionId})
      `;
    }

    res.json(student);
  } catch (err) {
    console.error('Students PUT error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// DELETE /api/admin/students?id=
router.delete('/', async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'ID is required' });
    }

    await sql`DELETE FROM division_students WHERE student_id = ${id}`;
    await sql`DELETE FROM students WHERE id = ${id}`;
    res.json({ success: true });
  } catch (err) {
    console.error('Students DELETE error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
