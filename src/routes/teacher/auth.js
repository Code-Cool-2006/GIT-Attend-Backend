import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sql from '../../db/index.js';
import { protect } from '../../middleware/auth.js';

const router = express.Router();

// POST /api/teacher/auth/login
router.post('/login', async (req, res) => {
  try {
    const { employee_id, password } = req.body;

    if (!employee_id || !password) {
      return res.status(400).json({ error: 'employee_id and password required' });
    }

    const [teacher] = await sql`
      SELECT id, employee_id, name, email, department, is_active, temp_password, password
      FROM teachers
      WHERE LOWER(employee_id) = LOWER(${employee_id})
    `;

    if (!teacher) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (teacher.is_active === false) {
      return res.status(403).json({ error: 'Account deactivated. Contact admin.' });
    }

    // Support both plain-text and bcrypt passwords
    let isValid = false;
    if (teacher.password && teacher.password.startsWith('$2')) {
      // bcrypt hash
      isValid = await bcrypt.compare(password, teacher.password);
    } else {
      // plain-text comparison (legacy)
      isValid = teacher.password?.toLowerCase() === password.toLowerCase();
    }

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: teacher.id, email: teacher.email, role: 'teacher' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Update last_login if column exists
    try {
      await sql`UPDATE teachers SET last_login = NOW() WHERE id = ${teacher.id}`;
    } catch {
      // Column might not exist yet, ignore
    }

    res.json({
      token,
      temp_password: teacher.temp_password ?? false,
      teacher: {
        id: teacher.id,
        employee_id: teacher.employee_id,
        name: teacher.name,
        email: teacher.email,
        department: teacher.department,
      },
    });
  } catch (err) {
    console.error('Teacher login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/teacher/auth/change-password
router.put('/change-password', protect, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current and new password required' });
    }

    const [teacher] = await sql`
      SELECT password FROM teachers WHERE id = ${req.user.id}
    `;

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Verify current password
    let isValid = false;
    if (teacher.password && teacher.password.startsWith('$2')) {
      isValid = await bcrypt.compare(current_password, teacher.password);
    } else {
      isValid = teacher.password?.toLowerCase() === current_password.toLowerCase();
    }

    if (!isValid) {
      return res.status(401).json({ error: 'Current password is wrong' });
    }

    const hash = await bcrypt.hash(new_password, 10);
    await sql`
      UPDATE teachers
      SET password = ${hash}, temp_password = false
      WHERE id = ${req.user.id}
    `;

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
