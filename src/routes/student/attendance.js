import express from 'express';

const router = express.Router();

// GET /api/student/attendance
router.get('/', async (req, res) => {
  res.status(501).json({ message: 'Student attendance coming soon' });
});

export default router;
