import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function PieceRates() {
  const { user } = useAuth();
  const canManage = user.role === 'manager';

  const [stations, setStations] = useState([]);
  const [rates, setRates] = useState({});
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(null);

  const load = () => api.listStations().then((data) => {
    setStations(data);
    setRates(Object.fromEntries(data.map((s) => [s.id, s.rate_per_unit])));
  }).catch((e) => setError(e.message));

  useEffect(() => { load(); }, []);

  const handleSave = async (stationId) => {
    setError('');
    setSaved(null);
    try {
      await api.setPieceRate(stationId, Number(rates[stationId]) || 0);
      setSaved(stationId);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h1 className="page-title">Piece Rates</h1>
      <p className="muted" style={{ marginBottom: '1rem' }}>RM paid per unit of output at each station. Changes only apply to entries submitted after saving.</p>
      {error && <div className="error-banner">{error}</div>}

      <div className="table-wrap card">
        <table>
          <thead>
            <tr><th>Station</th><th>Unit</th><th>Rate (RM per unit)</th>{canManage && <th></th>}</tr>
          </thead>
          <tbody>
            {stations.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.unit_label}</td>
                <td>
                  {canManage ? (
                    <input
                      type="number"
                      step="0.01"
                      value={rates[s.id] ?? ''}
                      onChange={(e) => setRates({ ...rates, [s.id]: e.target.value })}
                      style={{ width: '100px', padding: '0.4rem', border: '1px solid var(--border)', borderRadius: '6px' }}
                    />
                  ) : (
                    `RM ${Number(s.rate_per_unit).toFixed(2)}`
                  )}
                </td>
                {canManage && (
                  <td>
                    <button className="btn-link" onClick={() => handleSave(s.id)}>Save</button>
                    {saved === s.id && <span className="muted">Saved</span>}
                  </td>
                )}
              </tr>
            ))}
            {stations.length === 0 && (
              <tr><td colSpan={canManage ? 4 : 3} className="empty-row">No stations yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
