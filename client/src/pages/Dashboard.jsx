import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: 'year', label: 'This year' }
];

function TrendBadge({ value, goodDirection }) {
  if (value === 0 || value == null) return <span className="stat-trend neutral">–</span>;
  const isUp = value > 0;
  const isGood = goodDirection === 'up' ? isUp : !isUp;
  return (
    <span className={`stat-trend ${isGood ? 'good' : 'bad'}`}>
      {isUp ? '▲' : '▼'} {Math.abs(value)}%
    </span>
  );
}

function TrendChart({ data }) {
  const width = 640;
  const height = 200;
  const padding = 30;
  const values = data.map((d) => d.cost);
  const max = Math.max(...values, 1);
  const min = 0;
  const stepX = (width - padding * 2) / (data.length - 1 || 1);
  const scaleY = (v) => height - padding - ((v - min) / (max - min)) * (height - padding * 2);
  const points = data.map((d, i) => [padding + i * stepX, scaleY(d.cost)]);
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1][0]} ${height - padding} L ${points[0][0]} ${height - padding} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height + 24}`} width="100%" style={{ overflow: 'visible' }}>
      <path d={areaPath} fill="var(--green)" opacity="0.18" />
      <path d={linePath} fill="none" stroke="var(--green)" strokeWidth="2" />
      {points.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill="var(--green)" />
      ))}
      {data.map((d, i) => (
        i % Math.ceil(data.length / 12) === 0 && (
          <text key={i} x={padding + i * stepX} y={height + 16} fontSize="10" fill="var(--muted)" textAnchor="middle">
            {d.month.slice(5)}
          </text>
        )
      ))}
    </svg>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getSummary(period).then(setData).catch((e) => setError(e.message));
  }, [period]);

  const handleApprove = async (id) => {
    await api.finalApprove(id);
    api.getSummary(period).then(setData);
  };
  const handleReject = async (id) => {
    const reason = prompt('Reason for rejection (optional):') || '';
    await api.rejectWorkEntry(id, reason);
    api.getSummary(period).then(setData);
  };

  if (error) return <div className="card error-card">Failed to load dashboard: {error}</div>;
  if (!data) return <div className="card">Loading dashboard…</div>;

  const now = new Date();
  const monthYear = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="dash-header">
        <h1 className="dash-title">Performance dashboard</h1>
        <div className="period-pills">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              className={`period-pill${period === p.key ? ' active' : ''}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <p className="dash-subtitle">{monthYear} · All stations</p>

      <div className="stat-grid-v2">
        <div className="stat-card-v2">
          <div className="stat-card-v2-head">
            <span>Payroll cost MTD</span>
            <TrendBadge value={data.stats.payrollCostTrendPct} goodDirection="down" />
          </div>
          <div className="stat-card-v2-value">RM {data.stats.payrollCostMTD.toLocaleString()}</div>
          <div className="stat-card-v2-sub">{data.workforceSummary.activeEmployees} workers</div>
        </div>

        <div className="stat-card-v2">
          <div className="stat-card-v2-head"><span>Pending final approval</span></div>
          <div className="stat-card-v2-value">{data.stats.pendingFinalApproval}</div>
          <div className="stat-card-v2-sub">oldest: {data.stats.oldestPendingDays} day{data.stats.oldestPendingDays === 1 ? '' : 's'}</div>
        </div>

        <div className="stat-card-v2">
          <div className="stat-card-v2-head">
            <span>Rejection rate</span>
            <TrendBadge value={data.stats.rejectionRateTrendPct} goodDirection="down" />
          </div>
          <div className="stat-card-v2-value">{data.stats.rejectionRatePct}%</div>
          <div className="stat-card-v2-sub">{data.stats.rejectionCountThisWeek} this week</div>
        </div>

        <div className="stat-card-v2">
          <div className="stat-card-v2-head">
            <span>Compliance</span>
            <TrendBadge value={data.stats.complianceTrendPct} goodDirection="up" />
          </div>
          <div className="stat-card-v2-value">{data.stats.compliancePct}%</div>
          <div className="stat-card-v2-sub">target: {data.stats.complianceTarget}%</div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="chart-card">
          <div className="chart-card-head">
            <h3>Payroll cost trend</h3>
            <span className="chart-note">Last 12 months</span>
          </div>
          <TrendChart data={data.payrollTrend} />
        </div>

        <div className="card">
          <div className="chart-card-head">
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Station performance</h3>
          </div>
          <div className="table-wrap">
            <table className="station-table">
              <thead>
                <tr><th>Station</th><th>Workers</th><th>Output</th><th>Approval %</th></tr>
              </thead>
              <tbody>
                {data.stationPerformance.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.workerCount}</td>
                    <td>{s.output.toLocaleString()} {s.unitLabel}</td>
                    <td>
                      {s.approvalPct == null ? (
                        <span className="muted">—</span>
                      ) : (
                        <div className="meter-row">
                          <div className="meter">
                            <div
                              className={`meter-fill${s.approvalPct < 80 ? ' bad' : s.approvalPct < 90 ? ' warn' : ''}`}
                              style={{ width: `${s.approvalPct}%` }}
                            />
                          </div>
                          <span className="meter-pct">{s.approvalPct}%</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="card">
          <div className="chart-card-head">
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Exception flags</h3>
          </div>
          <div className="flag-list">
            {data.exceptionFlags.map((f, i) => (
              <div key={i} className={`flag-item flag-${f.type}`}>
                <strong>{f.title}</strong>
                {f.message}
              </div>
            ))}
            {data.exceptionFlags.length === 0 && <div className="empty-row">No exceptions detected.</div>}
          </div>
        </div>

        <div className="card">
          <div className="chart-card-head">
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Pending final approval</h3>
            <span className="rank-badge">{data.pendingFinalApprovalList.length}</span>
          </div>
          {data.pendingFinalApprovalList.map((e) => (
            <div className="approval-row" key={e.id}>
              <span className="approval-avatar">{e.employeeName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}</span>
              <div className="approval-info">
                <div className="approval-name">{e.employeeName}</div>
                <div className="approval-meta">{e.position || 'Employee'} · {e.stationName} · {new Date(e.entryDate).toLocaleDateString()}</div>
              </div>
              <div className="approval-amount">RM {e.amount.toFixed(2)}</div>
              {user.role === 'manager' ? (
                <div className="approval-actions">
                  <button className="icon-btn approve" onClick={() => handleApprove(e.id)} title="Approve">✓</button>
                  <button className="icon-btn reject" onClick={() => handleReject(e.id)} title="Reject">✕</button>
                </div>
              ) : (
                <span className={`badge ${e.badge === 'Self-submitted' ? 'badge-pending' : 'badge-active'}`}>{e.badge}</span>
              )}
            </div>
          ))}
          {data.pendingFinalApprovalList.length === 0 && <div className="empty-row">Nothing pending.</div>}
        </div>
      </div>

      <div className="card">
        <div className="chart-card-head">
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Workforce summary</h3>
        </div>
        <div className="workforce-summary">
          <div>
            <div className="workforce-item-label">Active today</div>
            <div className="workforce-item-value">{data.workforceSummary.activeToday} / {data.workforceSummary.activeEmployees}</div>
          </div>
          <div>
            <div className="workforce-item-label">Submitted today</div>
            <div className="workforce-item-value">{data.workforceSummary.submittedToday}</div>
          </div>
          <div>
            <div className="workforce-item-label">Stations full coverage</div>
            <div className="workforce-item-value">{data.workforceSummary.stationsFullCoverage}</div>
          </div>
          <div>
            <div className="workforce-item-label">Avg days worked / worker</div>
            <div className="workforce-item-value">{data.workforceSummary.avgDaysWorkedPerWorker}</div>
          </div>
          <div>
            <div className="workforce-item-label">Top earner</div>
            <div className="workforce-item-value">
              {data.workforceSummary.topEarner ? `${data.workforceSummary.topEarner.name.split(' ')[0]} — RM ${data.workforceSummary.topEarner.earnings.toLocaleString()}` : '—'}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="chart-card-head">
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Top earners — this period</h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Rank</th><th>Worker</th><th>Role</th><th>Days</th><th>Earnings</th><th>vs. avg</th></tr>
            </thead>
            <tbody>
              {data.topEarners.map((e) => (
                <tr key={e.rank}>
                  <td><span className="rank-badge">{e.rank}</span></td>
                  <td>{e.name}</td>
                  <td>{e.position || '—'}</td>
                  <td>{e.days}</td>
                  <td>RM {e.earnings.toLocaleString()}</td>
                  <td style={{ color: e.vsAvgPct >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {e.vsAvgPct >= 0 ? '+' : ''}{e.vsAvgPct}%
                  </td>
                </tr>
              ))}
              {data.topEarners.length === 0 && (
                <tr><td colSpan={6} className="empty-row">No approved earnings yet this period.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
