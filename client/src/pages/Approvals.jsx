import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Approvals() {
  const { user } = useAuth();
  const isManager = user.role === 'manager';

  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');

  const load = () => {
    const fetcher = isManager ? api.listFinalQueue() : api.listStationQueue();
    fetcher.then(setEntries).catch((e) => setError(e.message));
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id) => {
    setError('');
    try {
      await (isManager ? api.finalApprove(id) : api.stationApprove(id));
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Reason for rejection (optional):') || '';
    try {
      await api.rejectWorkEntry(id, reason);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h1 className="page-title">Approvals</h1>
      <p className="muted" style={{ marginBottom: '1rem' }}>
        {isManager ? 'Entries approved by station heads, awaiting your final sign-off.' : 'Entries submitted at your station, awaiting review.'}
      </p>
      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        {entries.map((e) => (
          <div className="approval-row" key={e.id}>
            <span className="approval-avatar">{e.employee_name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}</span>
            <div className="approval-info">
              <div className="approval-name">{e.employee_name}</div>
              <div className="approval-meta">{e.position || 'Employee'} · {e.station_name} · {new Date(e.entry_date).toLocaleDateString()} · {e.quantity} {e.unit_label}</div>
            </div>
            <div className="approval-amount">RM {Number(e.amount).toFixed(2)}</div>
            <div className="approval-actions">
              <button className="icon-btn approve" onClick={() => handleApprove(e.id)} title="Approve">✓</button>
              <button className="icon-btn reject" onClick={() => handleReject(e.id)} title="Reject">✕</button>
            </div>
          </div>
        ))}
        {entries.length === 0 && <div className="empty-row">Nothing pending review.</div>}
      </div>
    </div>
  );
}
