import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getSummary().then(setSummary).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="card error-card">Failed to load dashboard: {error}</div>;
  if (!summary) return <div className="card">Loading dashboard…</div>;

  const cards = [
    { label: 'Active Employees', value: summary.activeEmployees, tone: 'green' },
    { label: 'Pending Payroll Records', value: summary.pendingPayrollRecords, tone: 'pink' },
    { label: "Today's Deliveries", value: summary.todayDeliveries, tone: 'green' },
    { label: "Today's Net Weight (kg)", value: summary.todayNetWeightKg.toLocaleString(), tone: 'pink' },
    { label: 'This Month Net Pay (RM)', value: summary.thisMonthNetPay.toLocaleString(undefined, { maximumFractionDigits: 2 }), tone: 'green' }
  ];

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <div className="card-grid">
        {cards.map((c) => (
          <div key={c.label} className={`stat-card stat-${c.tone}`}>
            <div className="stat-value">{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
