import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { ROLES, ROLE_LABELS } from '../roles.js';

export default function TeamRoles() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [roleChoice, setRoleChoice] = useState({});

  const load = () => api.listUsers().then(setUsers).catch((e) => setError(e.message));

  useEffect(() => { load(); }, []);

  const pending = users.filter((u) => u.account_status === 'pending');
  const approved = users.filter((u) => u.account_status === 'approved');
  const rejected = users.filter((u) => u.account_status === 'rejected');

  const handleApprove = async (u) => {
    const role = roleChoice[u.id] || u.claimed_role;
    try {
      await api.approveUser(u.id, role);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReject = async (u) => {
    if (!confirm(`Reject ${u.name}'s registration?`)) return;
    await api.rejectUser(u.id);
    load();
  };

  const handleRoleChange = async (u, role) => {
    try {
      await api.changeUserRole(u.id, role);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h1 className="page-title">Team &amp; Roles</h1>
      {error && <div className="error-banner">{error}</div>}

      <h2 className="section-title">Pending Registrations ({pending.length})</h2>
      <div className="table-wrap card">
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Claimed Role</th><th>Assign Role</th><th></th></tr>
          </thead>
          <tbody>
            {pending.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{ROLE_LABELS[u.claimed_role]}</td>
                <td>
                  <select
                    value={roleChoice[u.id] || u.claimed_role}
                    onChange={(e) => setRoleChoice({ ...roleChoice, [u.id]: e.target.value })}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <button className="btn-link" onClick={() => handleApprove(u)}>Approve</button>
                  <button className="btn-link danger" onClick={() => handleReject(u)}>Reject</button>
                </td>
              </tr>
            ))}
            {pending.length === 0 && (
              <tr><td colSpan={5} className="empty-row">No pending registrations.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="section-title">Approved Team ({approved.length})</h2>
      <div className="table-wrap card">
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr>
          </thead>
          <tbody>
            {approved.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <select value={u.role} onChange={(e) => handleRoleChange(u, e.target.value)}>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </td>
                <td><span className="badge badge-active">approved</span></td>
              </tr>
            ))}
            {approved.length === 0 && (
              <tr><td colSpan={4} className="empty-row">No approved users yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {rejected.length > 0 && (
        <>
          <h2 className="section-title">Rejected ({rejected.length})</h2>
          <div className="table-wrap card">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Claimed Role</th></tr></thead>
              <tbody>
                {rejected.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{ROLE_LABELS[u.claimed_role]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
