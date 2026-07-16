import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function SalaryRules() {
  const [rules, setRules] = useState(null);
  const [form, setForm] = useState({ overtime_multiplier: '', standard_deduction_percent: '' });
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getSalaryRules().then((r) => {
      setRules(r);
      setForm({ overtime_multiplier: r.overtime_multiplier, standard_deduction_percent: r.standard_deduction_percent });
    }).catch((e) => setError(e.message));
  }, []);

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    try {
      const updated = await api.updateSalaryRules({
        overtime_multiplier: Number(form.overtime_multiplier),
        standard_deduction_percent: Number(form.standard_deduction_percent)
      });
      setRules(updated);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    }
  };

  if (!rules) return <div className="card">Loading…</div>;

  return (
    <div>
      <h1 className="page-title">Salary Rules</h1>
      <p className="muted" style={{ marginBottom: '1rem' }}>These global rules apply to overtime and deductions on salaried (monthly/daily/hourly) Payroll records.</p>
      {error && <div className="error-banner">{error}</div>}
      {saved && <div className="calc-preview">Salary rules updated.</div>}

      <form className="card form-grid" onSubmit={handleSubmit}>
        <label>Overtime Multiplier
          <input type="number" step="0.1" value={form.overtime_multiplier} onChange={handleChange('overtime_multiplier')} />
        </label>
        <label>Standard Deduction (%)
          <input type="number" step="0.1" value={form.standard_deduction_percent} onChange={handleChange('standard_deduction_percent')} />
        </label>
        <div className="form-actions">
          <button type="submit" className="btn-primary">Save Rules</button>
        </div>
      </form>
    </div>
  );
}
