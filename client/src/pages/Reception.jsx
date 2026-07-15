import { useEffect, useState } from 'react';
import { api } from '../api.js';

const emptyForm = {
  ticket_no: '', delivery_date: '', supplier_name: '', vehicle_no: '', driver_name: '',
  gross_weight_kg: '', tare_weight_kg: '', grade: 'Grade A', unripe_percent: '',
  rate_per_kg: '', deduction_amount: '', received_by: '', remarks: ''
};

export default function Reception() {
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = () => api.listReceptions().then(setRecords).catch((e) => setError(e.message));

  useEffect(() => { load(); }, []);

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const netWeight = (Number(form.gross_weight_kg) || 0) - (Number(form.tare_weight_kg) || 0);
  const grossAmount = netWeight * (Number(form.rate_per_kg) || 0);
  const amountPayable = grossAmount - (Number(form.deduction_amount) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.createReception({
        ...form,
        gross_weight_kg: Number(form.gross_weight_kg) || 0,
        tare_weight_kg: Number(form.tare_weight_kg) || 0,
        unripe_percent: Number(form.unripe_percent) || 0,
        rate_per_kg: Number(form.rate_per_kg) || 0,
        deduction_amount: Number(form.deduction_amount) || 0
      });
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this delivery record?')) return;
    await api.deleteReception(id);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">FFB Reception Station</h1>
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ Log Delivery'}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showForm && (
        <form className="card form-grid" onSubmit={handleSubmit}>
          <label>Ticket No
            <input required value={form.ticket_no} onChange={handleChange('ticket_no')} placeholder="TK-0001" />
          </label>
          <label>Delivery Date
            <input type="date" required value={form.delivery_date} onChange={handleChange('delivery_date')} />
          </label>
          <label>Supplier Name
            <input required value={form.supplier_name} onChange={handleChange('supplier_name')} />
          </label>
          <label>Vehicle No
            <input value={form.vehicle_no} onChange={handleChange('vehicle_no')} />
          </label>
          <label>Driver Name
            <input value={form.driver_name} onChange={handleChange('driver_name')} />
          </label>
          <label>Grade
            <select value={form.grade} onChange={handleChange('grade')}>
              <option>Grade A</option>
              <option>Grade B</option>
              <option>Grade C</option>
              <option>Rejected</option>
            </select>
          </label>
          <label>Gross Weight (kg)
            <input type="number" step="0.1" required value={form.gross_weight_kg} onChange={handleChange('gross_weight_kg')} />
          </label>
          <label>Tare Weight (kg)
            <input type="number" step="0.1" required value={form.tare_weight_kg} onChange={handleChange('tare_weight_kg')} />
          </label>
          <label>Unripe %
            <input type="number" step="0.1" value={form.unripe_percent} onChange={handleChange('unripe_percent')} />
          </label>
          <label>Rate per kg (RM)
            <input type="number" step="0.01" required value={form.rate_per_kg} onChange={handleChange('rate_per_kg')} />
          </label>
          <label>Deduction Amount (RM)
            <input type="number" step="0.01" value={form.deduction_amount} onChange={handleChange('deduction_amount')} />
          </label>
          <label>Received By
            <input value={form.received_by} onChange={handleChange('received_by')} placeholder="Station operator" />
          </label>
          <label className="form-span-2">Remarks
            <input value={form.remarks} onChange={handleChange('remarks')} />
          </label>

          <div className="calc-preview">
            <span>Net Weight: <strong>{netWeight.toFixed(1)} kg</strong></span>
            <span>Amount Payable: <strong>RM {amountPayable.toFixed(2)}</strong></span>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">Save Delivery</button>
          </div>
        </form>
      )}

      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>Ticket</th><th>Date</th><th>Supplier</th><th>Grade</th><th>Net Wt (kg)</th><th>Amount (RM)</th><th></th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td>{r.ticket_no}</td>
                <td>{r.delivery_date}</td>
                <td>{r.supplier_name}</td>
                <td>{r.grade}</td>
                <td>{Number(r.net_weight_kg).toFixed(1)}</td>
                <td className="strong">{Number(r.amount_payable).toFixed(2)}</td>
                <td><button className="btn-link danger" onClick={() => handleDelete(r.id)}>Delete</button></td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr><td colSpan={7} className="empty-row">No deliveries logged yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
