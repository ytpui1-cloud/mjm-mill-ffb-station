import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

const emptyForm = {
  employee_no: '', name: '', position: '', department: '', phone: '',
  ic_no: '', join_date: '', salary_type: 'monthly', base_rate: '', status: 'active'
};

export default function Employees() {
  const { user } = useAuth();
  const canManage = ['station_head', 'manager'].includes(user.role);

  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = () => api.listEmployees().then(setEmployees).catch((e) => setError(e.message));

  useEffect(() => { load(); }, []);

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.createEmployee({ ...form, base_rate: Number(form.base_rate) || 0 });
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this employee?')) return;
    await api.deleteEmployee(id);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Employees</h1>
        {canManage && (
          <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : '+ Add Employee'}
          </button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showForm && canManage && (
        <form className="card form-grid" onSubmit={handleSubmit}>
          <label>Employee No
            <input required value={form.employee_no} onChange={handleChange('employee_no')} placeholder="EMP-001" />
          </label>
          <label>Name
            <input required value={form.name} onChange={handleChange('name')} placeholder="Full name" />
          </label>
          <label>Position
            <input value={form.position} onChange={handleChange('position')} placeholder="e.g. Weighbridge Operator" />
          </label>
          <label>Department
            <input value={form.department} onChange={handleChange('department')} placeholder="e.g. FFB Reception" />
          </label>
          <label>Phone
            <input value={form.phone} onChange={handleChange('phone')} />
          </label>
          <label>IC No
            <input value={form.ic_no} onChange={handleChange('ic_no')} />
          </label>
          <label>Join Date
            <input type="date" value={form.join_date} onChange={handleChange('join_date')} />
          </label>
          <label>Salary Type
            <select value={form.salary_type} onChange={handleChange('salary_type')}>
              <option value="monthly">Monthly</option>
              <option value="daily">Daily</option>
              <option value="hourly">Hourly</option>
            </select>
          </label>
          <label>Base Rate (RM)
            <input type="number" step="0.01" required value={form.base_rate} onChange={handleChange('base_rate')} />
          </label>
          <label>Status
            <select value={form.status} onChange={handleChange('status')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <div className="form-actions">
            <button type="submit" className="btn-primary">Save Employee</button>
          </div>
        </form>
      )}

      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>No</th><th>Name</th><th>Position</th><th>Department</th><th>Salary Type</th><th>Base Rate</th><th>Status</th>{canManage && <th></th>}
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id}>
                <td>{emp.employee_no}</td>
                <td>{emp.name}</td>
                <td>{emp.position}</td>
                <td>{emp.department}</td>
                <td className="capitalize">{emp.salary_type}</td>
                <td>RM {Number(emp.base_rate).toFixed(2)}</td>
                <td><span className={`badge badge-${emp.status}`}>{emp.status}</span></td>
                {canManage && <td><button className="btn-link" onClick={() => handleDelete(emp.id)}>Remove</button></td>}
              </tr>
            ))}
            {employees.length === 0 && (
              <tr><td colSpan={canManage ? 8 : 7} className="empty-row">No employees yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
