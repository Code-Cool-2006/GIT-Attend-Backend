import express from 'express';
import sql from '../../db/index.js';

const router = express.Router();

// POST /api/admin/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const [admin] = await sql`
      SELECT id, name, email
      FROM admins
      WHERE email = ${email} AND password = ${password}
      LIMIT 1
    `;

    if (!admin) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Return success without JWT for now (admin app doesn't use JWT yet)
    res.json({
      success: true,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
      },
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
