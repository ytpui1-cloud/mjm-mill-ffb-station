import { Router } from 'express';
import { db } from '../db.js';

export const router = Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM ffb_receptions ORDER BY delivery_date DESC, id DESC').all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM ffb_receptions WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Reception record not found' });
  res.json(row);
});

router.post('/', (req, res) => {
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
    const result = db.prepare(`
      INSERT INTO ffb_receptions
        (ticket_no, delivery_date, supplier_name, vehicle_no, driver_name, gross_weight_kg, tare_weight_kg,
         net_weight_kg, grade, unripe_percent, rate_per_kg, deduction_amount, amount_payable, received_by, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      ticket_no, delivery_date, supplier_name, vehicle_no ?? null, driver_name ?? null,
      gross_weight_kg ?? 0, tare_weight_kg ?? 0, netWeight, grade ?? null, unripe_percent ?? 0,
      rate_per_kg ?? 0, deduction_amount ?? 0, amountPayable, received_by ?? null, remarks ?? null
    );
    const row = db.prepare('SELECT * FROM ffb_receptions WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(row);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM ffb_receptions WHERE id = ?').run(req.params.id);
  res.status(204).end();
});
