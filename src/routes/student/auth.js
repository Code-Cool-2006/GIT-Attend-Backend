import express from 'express';

const router = express.Router();

// POST /api/student/auth/login
router.post('/login', async (req, res) => {
  res.status(501).json({ message: 'Student login coming soon' });
});

// POST /api/student/auth/register
router.post('/register', async (req, res) => {
  res.status(501).json({ message: 'Student registration coming soon' });
});

export default router;
