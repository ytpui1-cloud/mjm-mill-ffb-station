import { Router } from 'express';
import { pool } from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { ROLES } from '../roles.js';
import { createLinkedEmployee } from '../linkEmployee.js';

export const router = Router();

const PUBLIC_FIELDS = 'id, name, phone, claimed_role, role, account_status, employee_id, created_at';

router.use(authenticate, requireRole('manager'));

router.get('/', async (req, res) => {
  const { rows } = await pool.query(`SELECT ${PUBLIC_FIELDS} FROM users ORDER BY account_status, created_at DESC`);
  res.json(rows);
});

router.put('/:id/approve', async (req, res) => {
  const { role } = req.body;
  const finalRole = role || req.body.claimed_role;
  if (!ROLES.includes(finalRole)) {
    return res.status(400).json({ error: 'A valid role is required to approve' });
  }

  const { rows: userRows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  const user = userRows[0];
  if (!user) return res.status(404).json({ error: 'User not found' });

  const employeeId = await createLinkedEmployee({ name: user.name, phone: user.phone, role: finalRole });

  const { rows } = await pool.query(
    `UPDATE users SET account_status = 'approved', role = $1, employee_id = $2 WHERE id = $3
     RETURNING ${PUBLIC_FIELDS}`,
    [finalRole, employeeId, req.params.id]
  );
  res.json(rows[0]);
});

router.put('/:id/reject', async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE users SET account_status = 'rejected' WHERE id = $1 RETURNING ${PUBLIC_FIELDS}`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

router.put('/:id/role', async (req, res) => {
  const { role } = req.body;
  if (!ROLES.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  const { rows } = await pool.query(
    `UPDATE users SET role = $1 WHERE id = $2 AND account_status = 'approved' RETURNING ${PUBLIC_FIELDS}`,
    [role, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Approved user not found' });
  res.json(rows[0]);
});
