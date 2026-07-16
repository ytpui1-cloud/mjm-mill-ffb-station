import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

const emptyForm = { name: '', unit_label: '', monthly_budget: '' };

export default function Stations() {
  const { user } = useAuth();
  const canManage = user.role === 'manager';

  const [stations, setStations] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = () => api.listStations().then(setStations).catch((e) => setError(e.message));

  useEffect(() => { load(); }, []);

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.createStation({ ...form, monthly_budget: form.monthly_budget ? Number(form.monthly_budget) : null });
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this station? Its work entries will also be removed.')) return;
    await api.deleteStation(id);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Stations</h1>
        {canManage && (
          <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : '+ Add Station'}
          </button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showForm && canManage && (
        <form className="card form-grid" onSubmit={handleSubmit}>
          <label>Station Name
            <input required value={form.name} onChange={handleChange('name')} placeholder="e.g. Boiler" />
          </label>
          <label>Unit Label
            <input required value={form.unit_label} onChange={handleChange('unit_label')} placeholder="e.g. tonnes, cages, kg" />
          </label>
          <label>Monthly Budget (RM, optional)
            <input type="number" step="0.01" value={form.monthly_budget} onChange={handleChange('monthly_budget')} />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn-primary">Save Station</button>
          </div>
        </form>
      )}

      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>Station</th><th>Unit</th><th>Workers</th><th>Piece Rate</th><th>Monthly Budget</th>{canManage && <th></th>}
            </tr>
          </thead>
          <tbody>
            {stations.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.unit_label}</td>
                <td>{s.worker_count}</td>
                <td>RM {Number(s.rate_per_unit).toFixed(2)} / {s.unit_label}</td>
                <td>{s.monthly_budget ? `RM ${Number(s.monthly_budget).toFixed(2)}` : '—'}</td>
                {canManage && <td><button className="btn-link danger" onClick={() => handleDelete(s.id)}>Delete</button></td>}
              </tr>
            ))}
            {stations.length === 0 && (
              <tr><td colSpan={canManage ? 6 : 5} className="empty-row">No stations yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
