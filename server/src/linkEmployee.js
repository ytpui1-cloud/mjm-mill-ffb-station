import { pool } from './db.js';
import { ROLE_LABELS } from './roles.js';

export async function createLinkedEmployee({ name, phone, role }) {
  const { rows } = await pool.query(
    `INSERT INTO employees (employee_no, name, phone, position, status)
     VALUES ('PENDING', $1, $2, $3, 'active')
     RETURNING id`,
    [name, phone ?? null, ROLE_LABELS[role] ?? role]
  );
  const employeeId = rows[0].id;
  await pool.query('UPDATE employees SET employee_no = $1 WHERE id = $2', [
    `EMP-${String(employeeId).padStart(4, '0')}`,
    employeeId
  ]);
  return employeeId;
}
