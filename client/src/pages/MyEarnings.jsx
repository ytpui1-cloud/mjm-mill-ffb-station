import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function MyEarnings() {
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listMyWorkEntries().then(setEntries).catch((e) => setError(e.message));
  }, []);

  const now = new Date();
  const monthEntries = entries.filter((e) => {
    const d = new Date(e.entry_date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const approved = monthEntries.filter((e) => e.status === 'final_approved');
  const pending = monthEntries.filter((e) => e.status === 'submitted' || e.status === 'station_approved');
  const totalApproved = approved.reduce((s, e) => s + Number(e.amount), 0);
  const totalPending = pending.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div>
      <h1 className="page-title">My Earnings</h1>
      {error && <div className="error-banner">{error}</div>}

      <div className="card-grid" style={{ marginBottom: '1.25rem' }}>
        <div className="stat-card">
          <div className="stat-value">RM {totalApproved.toFixed(2)}</div>
          <div className="stat-label">Approved this month</div>
        </div>
        <div className="stat-card stat-pink">
          <div className="stat-value">RM {totalPending.toFixed(2)}</div>
          <div className="stat-label">Pending approval this month</div>
        </div>
      </div>

      <div className="table-wrap card">
        <table>
          <thead>
            <tr><th>Date</th><th>Station</th><th>Quantity</th><th>Amount</th><th>Status</th></tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td>{new Date(e.entry_date).toLocaleDateString()}</td>
                <td>{e.station_name}</td>
                <td>{e.quantity} {e.unit_label}</td>
                <td>RM {Number(e.amount).toFixed(2)}</td>
                <td><span className={`badge badge-${e.status}`}>{e.status.replace('_', ' ')}</span></td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr><td colSpan={5} className="empty-row">No entries yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
