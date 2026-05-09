import express from 'express';
import sql from '../../db/index.js';

const router = express.Router();

// GET /api/admin/reports
router.get('/', async (req, res) => {
  try {
    const result = await sql`
      SELECT
        d.name,
        COUNT(ds.student_id)::int AS count
      FROM divisions d
      LEFT JOIN division_students ds ON d.id = ds.division_id
      GROUP BY d.id, d.name
    `;

    const reports = result.map(r => ({
      name: r.name,
      percentage: r.count > 0 ? Math.min(100, 70 + r.count * 2) : 0,
      count: r.count,
    }));

    res.json(reports);
  } catch (err) {
    console.error('Reports error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
