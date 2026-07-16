import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function WorkHistory() {
  const { user } = useAuth();
  const showEmployeeColumn = ['assistant_station_head', 'station_head', 'manager'].includes(user.role);

  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listWorkEntries().then(setEntries).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h1 className="page-title">Work History</h1>
      {error && <div className="error-banner">{error}</div>}

      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              {showEmployeeColumn && <th>Employee</th>}
              <th>Station</th><th>Quantity</th><th>Amount</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td>{new Date(e.entry_date).toLocaleDateString()}</td>
                {showEmployeeColumn && <td>{e.employee_name}</td>}
                <td>{e.station_name}</td>
                <td>{e.quantity} {e.unit_label}</td>
                <td>RM {Number(e.amount).toFixed(2)}</td>
                <td><span className={`badge badge-${e.status}`}>{e.status.replace('_', ' ')}</span></td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr><td colSpan={showEmployeeColumn ? 6 : 5} className="empty-row">No work entries yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
