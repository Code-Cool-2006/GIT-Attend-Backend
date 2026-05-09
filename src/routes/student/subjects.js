import express from 'express';

const router = express.Router();

// GET /api/student/subjects
router.get('/', async (req, res) => {
  res.status(501).json({ message: 'Student subjects coming soon' });
});

export default router;
