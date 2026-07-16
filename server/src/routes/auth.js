import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { signToken, authenticate } from '../middleware/auth.js';
import { ROLES } from '../roles.js';
import { createLinkedEmployee } from '../linkEmployee.js';

export const router = Router();

router.post('/register', async (req, res) => {
  const { name, email, password, phone, claimed_role } = req.body;
  if (!name || !email || !password || !claimed_role) {
    return res.status(400).json({ error: 'name, email, password and claimed_role are required' });
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
        `INSERT INTO users (name, email, password_hash, phone, claimed_role, role, account_status, employee_id)
         VALUES ($1, $2, $3, $4, $5, 'manager', 'approved', $6)
         RETURNING id, name, email, phone, claimed_role, role, account_status, created_at`,
        [name, email.toLowerCase(), passwordHash, phone ?? null, claimed_role, employeeId]
      );
      return res.status(201).json({ ...rows[0], bootstrapped: true });
    }

    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, phone, claimed_role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, phone, claimed_role, role, account_status, created_at`,
      [name, email.toLowerCase(), passwordHash, phone ?? null, claimed_role]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    res.status(400).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
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
    user: { id: user.id, name: user.name, email: user.email, role: user.role, employee_id: user.employee_id }
  });
});

router.get('/me', authenticate, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, email, phone, role, account_status, employee_id FROM users WHERE id = $1',
    [req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});
