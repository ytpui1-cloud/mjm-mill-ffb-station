import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { signToken, authenticate } from '../middleware/auth.js';
import { ROLES } from '../roles.js';
import { createLinkedEmployee } from '../linkEmployee.js';

export const router = Router();

const normalizePhone = (phone) => phone.replace(/[\s-]/g, '');

router.post('/register', async (req, res) => {
  const { name, password, claimed_role } = req.body;
  const phone = req.body.phone ? normalizePhone(req.body.phone) : '';
  if (!name || !phone || !password || !claimed_role) {
    return res.status(400).json({ error: 'name, phone, password and claimed_role are required' });
  }
  if (!ROLES.includes(claimed_role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    // Bootstrap: the very first account on a fresh system becomes an
    // approved Manager immediately, since no Manager would exist yet to approve it.
    const { rows: countRows } = await pool.query('SELECT COUNT(*) AS c FROM users');
    const isFirstUser = Number(countRows[0].c) === 0;

    if (isFirstUser) {
      const employeeId = await createLinkedEmployee({ name, phone, role: 'manager' });
      const { rows } = await pool.query(
        `INSERT INTO users (name, phone, password_hash, claimed_role, role, account_status, employee_id)
         VALUES ($1, $2, $3, $4, 'manager', 'approved', $5)
         RETURNING id, name, phone, claimed_role, role, account_status, created_at`,
        [name, phone, passwordHash, claimed_role, employeeId]
      );
      return res.status(201).json({ ...rows[0], bootstrapped: true });
    }

    const { rows } = await pool.query(
      `INSERT INTO users (name, phone, password_hash, claimed_role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, phone, claimed_role, role, account_status, created_at`,
      [name, phone, passwordHash, claimed_role]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with this phone number already exists' });
    }
    res.status(400).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { password } = req.body;
  const phone = req.body.phone ? normalizePhone(req.body.phone) : '';
  if (!phone || !password) {
    return res.status(400).json({ error: 'phone and password are required' });
  }
  const { rows } = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid phone number or password' });
  }
  if (user.account_status === 'pending') {
    return res.status(403).json({ error: 'Your account is still awaiting approval' });
  }
  if (user.account_status === 'rejected') {
    return res.status(403).json({ error: 'Your registration was not approved' });
  }

  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, name: user.name, phone: user.phone, role: user.role, employee_id: user.employee_id }
  });
});

router.get('/me', authenticate, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.phone, u.role, u.account_status, u.employee_id, s.id AS station_id, s.name AS station_name, s.unit_label
     FROM users u
     LEFT JOIN employees e ON e.id = u.employee_id
     LEFT JOIN stations s ON s.id = e.station_id
     WHERE u.id = $1`,
    [req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});
