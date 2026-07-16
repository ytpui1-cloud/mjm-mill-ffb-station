import { Router } from 'express';
import { pool } from '../db.js';
import { requireRole } from '../middleware/auth.js';

export const router = Router();

router.get('/', requireRole('manager'), async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM salary_rules WHERE id = 1');
  res.json(rows[0]);
});

router.put('/', requireRole('manager'), async (req, res) => {
  const { overtime_multiplier, standard_deduction_percent } = req.body;
  const { rows } = await pool.query(
    `UPDATE salary_rules SET
       overtime_multiplier = COALESCE($1, overtime_multiplier),
       standard_deduction_percent = COALESCE($2, standard_deduction_percent),
       updated_at = now()
     WHERE id = 1 RETURNING *`,
    [overtime_multiplier ?? null, standard_deduction_percent ?? null]
  );
  res.json(rows[0]);
});
