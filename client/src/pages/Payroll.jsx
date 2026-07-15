import { useEffect, useState } from 'react';
import { api } from '../api.js';

const emptyForm = {
  employee_id: '', period_start: '', period_end: '', days_worked: '',
  hours_worked: '', overtime_hours: '', deductions: '', notes: ''
};

export default function Payroll() {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    api.listPayroll().then(setRecords).catch((e) => setError(e.message));
    api.listEmployees().then(setEmployees).catch((e) => setError(e.message));
  };

  useEffect(() => { load(); }, []);

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.createPayroll({
        ...form,
        employee_id: Number(form.employee_id),
        days_worked: Number(form.days_worked) || 0,
        hours_worked: Number(form.hours_worked) || 0,
        overtime_hours: Number(form.overtime_hours) || 0,
        deductions: Number(form.deductions) || 0
      });
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const markPaid = async (id) => {
    await api.setPayrollStatus(id, 'paid');
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this payroll record?')) return;
    await api.deletePayroll(id);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Payroll</h1>
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ New Payroll Record'}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showForm && (
        <form className="card form-grid" onSubmit={handleSubmit}>
          <label>Employee
            <select required value={form.employee_id} onChange={handleChange('employee_id')}>
              <option value="">Select employee</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name} ({e.employee_no})</option>
              ))}
            </select>
          </label>
          <label>Period Start
            <input type="date" required value={form.period_start} onChange={handleChange('period_start')} />
          </label>
          <label>Period End
            <input type="date" required value={form.period_end} onChange={handleChange('period_end')} />
          </label>
          <label>Days Worked
            <input type="number" step="0.5" value={form.days_worked} onChange={handleChange('days_worked')} />
          </label>
          <label>Hours Worked
            <input type="number" step="0.5" value={form.hours_worked} onChange={handleChange('hours_worked')} />
          </label>
          <label>Overtime Hours
            <input type="number" step="0.5" value={form.overtime_hours} onChange={handleChange('overtime_hours')} />
          </label>
          <label>Deductions (RM)
            <input type="number" step="0.01" value={form.deductions} onChange={handleChange('deductions')} />
          </label>
          <label className="form-span-2">Notes
            <input value={form.notes} onChange={handleChange('notes')} />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn-primary">Calculate &amp; Save</button>
          </div>
        </form>
      )}

      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>Employee</th><th>Period</th><th>Gross</th><th>Deductions</th><th>Net Pay</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td>{r.employee_name} <span className="muted">({r.employee_no})</span></td>
                <td>{r.period_start} → {r.period_end}</td>
                <td>RM {Number(r.gross_pay).toFixed(2)}</td>
                <td>RM {Number(r.deductions).toFixed(2)}</td>
                <td className="strong">RM {Number(r.net_pay).toFixed(2)}</td>
                <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                <td>
                  {r.status === 'pending' && (
                    <button className="btn-link" onClick={() => markPaid(r.id)}>Mark Paid</button>
                  )}
                  <button className="btn-link danger" onClick={() => handleDelete(r.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr><td colSpan={7} className="empty-row">No payroll records yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
