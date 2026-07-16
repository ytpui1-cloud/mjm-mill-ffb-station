import { Router } from 'express';
import { pool } from '../db.js';
import { requireRole } from '../middleware/auth.js';

export const router = Router();

const CAN_SUBMIT = requireRole('operator', 'assistant_station_head', 'station_head', 'manager');
const CAN_REVIEW_STATION = requireRole('assistant_station_head', 'station_head');
const CAN_FINAL_APPROVE = requireRole('manager');

const ENTRY_SELECT = `
  SELECT w.*, e.name AS employee_name, e.employee_no, s.name AS station_name, s.unit_label
  FROM work_entries w
  JOIN employees e ON e.id = w.employee_id
  JOIN stations s ON s.id = w.station_id
`;

async function getRequesterStationId(req) {
  if (!req.user.employee_id) return null;
  const { rows } = await pool.query('SELECT station_id FROM employees WHERE id = $1', [req.user.employee_id]);
  return rows[0]?.station_id ?? null;
}

router.post('/', CAN_SUBMIT, async (req, res) => {
  const { entry_date, quantity, notes } = req.body;
  let { employee_id, station_id } = req.body;

  const isSelfService = ['operator'].includes(req.user.role);
  if (isSelfService) {
    employee_id = req.user.employee_id;
    station_id = await getRequesterStationId(req);
  }
  if (!employee_id || !station_id || !entry_date || quantity == null) {
    return res.status(400).json({ error: 'employee_id, station_id, entry_date and quantity are required' });
  }

  if (['assistant_station_head', 'station_head'].includes(req.user.role)) {
    const ownStationId = await getRequesterStationId(req);
    if (Number(station_id) !== Number(ownStationId)) {
      return res.status(403).json({ error: 'You can only submit entries for your own station' });
    }
  }

  const { rows: rateRows } = await pool.query('SELECT rate_per_unit FROM piece_rates WHERE station_id = $1', [station_id]);
  if (!rateRows[0]) return res.status(400).json({ error: 'Unknown station_id' });
  const ratePerUnit = Number(rateRows[0].rate_per_unit);
  const amount = Number(quantity) * ratePerUnit;

  // A station head/assistant logging their own work has no independent peer to review it,
  // so it skips straight to "station_approved" (flagged as self-submitted for the manager).
  const isSelfSubmission = ['assistant_station_head', 'station_head'].includes(req.user.role)
    && Number(employee_id) === Number(req.user.employee_id);
  const initialStatus = isSelfSubmission ? 'station_approved' : 'submitted';

  try {
    const { rows } = await pool.query(
      `INSERT INTO work_entries
         (employee_id, station_id, entry_date, quantity, rate_per_unit, amount, submitted_by, notes, status, self_submitted, station_approved_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CASE WHEN $10 THEN now() ELSE NULL END)
       RETURNING id`,
      [employee_id, station_id, entry_date, quantity, ratePerUnit, amount, req.user.id, notes ?? null, initialStatus, isSelfSubmission]
    );
    const { rows: full } = await pool.query(`${ENTRY_SELECT} WHERE w.id = $1`, [rows[0].id]);
    res.status(201).json(full[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  if (req.user.role === 'manager') {
    const { rows } = await pool.query(`${ENTRY_SELECT} ORDER BY w.entry_date DESC, w.id DESC`);
    return res.json(rows);
  }
  if (['assistant_station_head', 'station_head'].includes(req.user.role)) {
    const ownStationId = await getRequesterStationId(req);
    const { rows } = await pool.query(
      `${ENTRY_SELECT} WHERE w.station_id = $1 ORDER BY w.entry_date DESC, w.id DESC`,
      [ownStationId]
    );
    return res.json(rows);
  }
  const { rows } = await pool.query(
    `${ENTRY_SELECT} WHERE w.employee_id = $1 ORDER BY w.entry_date DESC, w.id DESC`,
    [req.user.employee_id]
  );
  res.json(rows);
});

router.get('/mine', async (req, res) => {
  if (!req.user.employee_id) return res.json([]);
  const { rows } = await pool.query(
    `${ENTRY_SELECT} WHERE w.employee_id = $1 ORDER BY w.entry_date DESC, w.id DESC`,
    [req.user.employee_id]
  );
  res.json(rows);
});

router.get('/queue/station', CAN_REVIEW_STATION, async (req, res) => {
  const ownStationId = await getRequesterStationId(req);
  const { rows } = await pool.query(
    `${ENTRY_SELECT} WHERE w.station_id = $1 AND w.status = 'submitted' ORDER BY w.entry_date`,
    [ownStationId]
  );
  res.json(rows);
});

router.get('/queue/final', CAN_FINAL_APPROVE, async (req, res) => {
  const { rows } = await pool.query(
    `${ENTRY_SELECT} WHERE w.status = 'station_approved' ORDER BY w.entry_date`
  );
  res.json(rows);
});

router.put('/:id/station-approve', CAN_REVIEW_STATION, async (req, res) => {
  const ownStationId = await getRequesterStationId(req);
  const { rows } = await pool.query(
    `UPDATE work_entries SET status = 'station_approved', station_approved_by = $1, station_approved_at = now()
     WHERE id = $2 AND station_id = $3 AND status = 'submitted'
     RETURNING id`,
    [req.user.id, req.params.id, ownStationId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Entry not found or not eligible for station approval' });
  const { rows: full } = await pool.query(`${ENTRY_SELECT} WHERE w.id = $1`, [req.params.id]);
  res.json(full[0]);
});

router.put('/:id/final-approve', CAN_FINAL_APPROVE, async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE work_entries SET status = 'final_approved', final_approved_by = $1, final_approved_at = now()
     WHERE id = $2 AND status = 'station_approved'
     RETURNING id`,
    [req.user.id, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Entry not found or not eligible for final approval' });
  const { rows: full } = await pool.query(`${ENTRY_SELECT} WHERE w.id = $1`, [req.params.id]);
  res.json(full[0]);
});

router.put('/:id/reject', async (req, res) => {
  const { reason } = req.body;
  const { rows: existing } = await pool.query('SELECT * FROM work_entries WHERE id = $1', [req.params.id]);
  const entry = existing[0];
  if (!entry) return res.status(404).json({ error: 'Entry not found' });

  const isStationReviewer = ['assistant_station_head', 'station_head'].includes(req.user.role);
  const isManager = req.user.role === 'manager';
  let allowed = false;
  if (isStationReviewer && entry.status === 'submitted') {
    const ownStationId = await getRequesterStationId(req);
    allowed = Number(entry.station_id) === Number(ownStationId);
  } else if (isManager && entry.status === 'station_approved') {
    allowed = true;
  }
  if (!allowed) return res.status(403).json({ error: 'You cannot reject this entry at its current stage' });

  const { rows } = await pool.query(
    `UPDATE work_entries SET status = 'rejected', rejection_reason = $1 WHERE id = $2 RETURNING id`,
    [reason ?? null, req.params.id]
  );
  const { rows: full } = await pool.query(`${ENTRY_SELECT} WHERE w.id = $1`, [rows[0].id]);
  res.json(full[0]);
});

router.delete('/:id', requireRole('manager'), async (req, res) => {
  await pool.query('DELETE FROM work_entries WHERE id = $1', [req.params.id]);
  res.status(204).end();
});
