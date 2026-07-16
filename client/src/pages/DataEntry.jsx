import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

const emptyForm = { employee_id: '', entry_date: '', quantity: '', notes: '' };

export default function DataEntry() {
  const { user } = useAuth();
  const isSelfService = user.role === 'operator';

  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isSelfService) {
      api.listEmployees().then((all) => {
        const scoped = user.role === 'manager' ? all : all.filter((e) => e.station_id === user.station_id);
        setEmployees(scoped);
      }).catch((e) => setError(e.message));
    }
  }, [isSelfService, user.role, user.station_id]);

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const selectedEmployee = employees.find((e) => e.id === Number(form.employee_id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    try {
      const payload = { entry_date: form.entry_date, quantity: Number(form.quantity), notes: form.notes };
      if (!isSelfService) {
        payload.employee_id = Number(form.employee_id);
        payload.station_id = selectedEmployee?.station_id;
      }
      await api.submitWorkEntry(payload);
      setForm(emptyForm);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const unitLabel = isSelfService ? user.unit_label : selectedEmployee?.unit_label;

  return (
    <div>
      <h1 className="page-title">Data Entry</h1>
      {isSelfService && (
        <p className="muted" style={{ marginBottom: '1rem' }}>
          Logging output for <strong>{user.station_name || 'your station'}</strong>.
        </p>
      )}
      {error && <div className="error-banner">{error}</div>}
      {success && <div className="calc-preview">Entry submitted for review.</div>}

      <form className="card form-grid" onSubmit={handleSubmit}>
        {!isSelfService && (
          <label>Employee
            <select required value={form.employee_id} onChange={handleChange('employee_id')}>
              <option value="">Select employee</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name} ({e.employee_no}) — {e.station_name || 'No station'}</option>
              ))}
            </select>
          </label>
        )}
        <label>Date
          <input type="date" required value={form.entry_date} onChange={handleChange('entry_date')} />
        </label>
        <label>Quantity {unitLabel ? `(${unitLabel})` : ''}
          <input type="number" step="0.01" required value={form.quantity} onChange={handleChange('quantity')} />
        </label>
        <label className="form-span-2">Notes
          <input value={form.notes} onChange={handleChange('notes')} />
        </label>
        <div className="form-actions">
          <button type="submit" className="btn-primary">Submit Entry</button>
        </div>
      </form>
    </div>
  );
}
