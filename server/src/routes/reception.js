import { Router } from 'express';
import { pool } from '../db.js';

export const router = Router();

router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM ffb_receptions ORDER BY delivery_date DESC, id DESC');
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM ffb_receptions WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Reception record not found' });
  res.json(rows[0]);
});

router.post('/', async (req, res) => {
  const {
    ticket_no, delivery_date, supplier_name, vehicle_no, driver_name,
    gross_weight_kg, tare_weight_kg, grade, unripe_percent, rate_per_kg,
    deduction_amount, received_by, remarks
  } = req.body;

  if (!ticket_no || !delivery_date || !supplier_name) {
    return res.status(400).json({ error: 'ticket_no, delivery_date and supplier_name are required' });
  }

  const netWeight = (gross_weight_kg ?? 0) - (tare_weight_kg ?? 0);
  const grossAmount = netWeight * (rate_per_kg ?? 0);
  const amountPayable = grossAmount - (deduction_amount ?? 0);

  try {
    const { rows } = await pool.query(
      `INSERT INTO ffb_receptions
         (ticket_no, delivery_date, supplier_name, vehicle_no, driver_name, gross_weight_kg, tare_weight_kg,
          net_weight_kg, grade, unripe_percent, rate_per_kg, deduction_amount, amount_payable, received_by, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [ticket_no, delivery_date, supplier_name, vehicle_no ?? null, driver_name ?? null,
       gross_weight_kg ?? 0, tare_weight_kg ?? 0, netWeight, grade ?? null, unripe_percent ?? 0,
       rate_per_kg ?? 0, deduction_amount ?? 0, amountPayable, received_by ?? null, remarks ?? null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM ffb_receptions WHERE id = $1', [req.params.id]);
  res.status(204).end();
});
