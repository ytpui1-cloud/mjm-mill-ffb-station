import { Router } from 'express';
import { pool } from '../db.js';

export const router = Router();

const DAY_MS = 24 * 60 * 60 * 1000;
const COMPLIANCE_TARGET = 98;
const COMPLIANCE_SLA_DAYS = 2;

function periodStartDate(period) {
  const now = new Date();
  if (period === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'week') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day = (d.getDay() + 6) % 7; // Monday = 0
    d.setDate(d.getDate() - day);
    return d;
  }
  if (period === 'year') return new Date(now.getFullYear(), 0, 1);
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function monthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

router.get('/summary', async (req, res) => {
  const period = ['today', 'week', 'month', 'year'].includes(req.query.period) ? req.query.period : 'month';
  const periodStart = periodStartDate(period);
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [stationsRes, entriesPeriodRes, entriesYearRes, payrollYearRes, pendingFinalRes, employeesRes] = await Promise.all([
    pool.query(`
      SELECT s.id, s.name, s.unit_label, s.monthly_budget, s.sort_order, COALESCE(pr.rate_per_unit, 0) AS rate_per_unit
      FROM stations s LEFT JOIN piece_rates pr ON pr.station_id = s.id
      ORDER BY s.sort_order
    `),
    pool.query(`
      SELECT w.*, e.name AS employee_name, e.position
      FROM work_entries w JOIN employees e ON e.id = w.employee_id
      WHERE w.entry_date >= $1
    `, [periodStart]),
    pool.query(`
      SELECT entry_date, amount, station_id, status, created_at, station_approved_at, final_approved_at
      FROM work_entries WHERE entry_date >= $1
    `, [twelveMonthsAgo]),
    pool.query(`
      SELECT period_start, net_pay FROM payroll_records WHERE period_start >= $1
    `, [twelveMonthsAgo]),
    pool.query(`
      SELECT w.*, e.name AS employee_name, e.position, s.name AS station_name, s.unit_label
      FROM work_entries w
      JOIN employees e ON e.id = w.employee_id
      JOIN stations s ON s.id = w.station_id
      WHERE w.status = 'station_approved'
      ORDER BY w.station_approved_at
    `),
    pool.query(`SELECT id, name, station_id, status FROM employees`)
  ]);

  const stations = stationsRes.rows;
  const entriesPeriod = entriesPeriodRes.rows;
  const entriesYear = entriesYearRes.rows;
  const payrollYear = payrollYearRes.rows;
  const pendingFinal = pendingFinalRes.rows;
  const employees = employeesRes.rows;

  // --- Payroll cost MTD + trend vs last month ---
  const sumApprovedInMonth = (start) => {
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const workAmt = entriesYear
      .filter((e) => e.status === 'final_approved' && new Date(e.entry_date) >= start && new Date(e.entry_date) < end)
      .reduce((s, e) => s + Number(e.amount), 0);
    const payrollAmt = payrollYear
      .filter((p) => new Date(p.period_start) >= start && new Date(p.period_start) < end)
      .reduce((s, p) => s + Number(p.net_pay), 0);
    return workAmt + payrollAmt;
  };
  const payrollCostMTD = sumApprovedInMonth(currentMonthStart);
  const payrollCostLastMonth = sumApprovedInMonth(lastMonthStart);
  const payrollCostTrendPct = payrollCostLastMonth > 0
    ? ((payrollCostMTD - payrollCostLastMonth) / payrollCostLastMonth) * 100
    : 0;

  // --- Payroll cost trend, last 12 months ---
  const payrollTrend = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    payrollTrend.push({ month: monthKey(start), cost: Math.round(sumApprovedInMonth(start)) });
  }

  // --- Pending final approval ---
  const pendingFinalApproval = pendingFinal.length;
  const oldestPendingDays = pendingFinal.length
    ? Math.floor((now - new Date(pendingFinal[0].station_approved_at)) / DAY_MS)
    : 0;

  // --- Rejection rate (selected period) + trend vs prior period of same length ---
  const computeRejectionRate = (rows) => {
    const decided = rows.filter((e) => e.status === 'final_approved' || e.status === 'rejected');
    const rejected = decided.filter((e) => e.status === 'rejected');
    return decided.length ? (rejected.length / decided.length) * 100 : 0;
  };
  const rejectionRatePct = computeRejectionRate(entriesPeriod);
  const priorPeriodStart = new Date(periodStart.getTime() - (now - periodStart));
  const priorEntries = entriesYear.filter((e) => new Date(e.entry_date) >= priorPeriodStart && new Date(e.entry_date) < periodStart);
  const rejectionRateTrendPct = rejectionRatePct - computeRejectionRate(priorEntries);
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
  const rejectionCountThisWeek = entriesYear.filter((e) => e.status === 'rejected' && new Date(e.entry_date) >= weekAgo).length;

  // --- Compliance: % of entries approved within SLA at each review stage, for a given month ---
  const computeCompliance = (monthStart) => {
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
    const decided = entriesYear.filter((e) =>
      e.status === 'final_approved' && new Date(e.entry_date) >= monthStart && new Date(e.entry_date) < monthEnd
    );
    if (!decided.length) return null;
    const compliant = decided.filter((e) => {
      const created = new Date(e.created_at);
      const stationApproved = e.station_approved_at ? new Date(e.station_approved_at) : null;
      const finalApproved = e.final_approved_at ? new Date(e.final_approved_at) : null;
      const stationOk = !stationApproved || (stationApproved - created) / DAY_MS <= COMPLIANCE_SLA_DAYS;
      const finalOk = !finalApproved || !stationApproved || (finalApproved - stationApproved) / DAY_MS <= COMPLIANCE_SLA_DAYS;
      return stationOk && finalOk;
    });
    return (compliant.length / decided.length) * 100;
  };
  const compliancePctRaw = computeCompliance(currentMonthStart);
  const compliancePct = compliancePctRaw ?? 100;
  const lastMonthCompliance = computeCompliance(lastMonthStart);
  const complianceTrendPct = compliancePctRaw != null && lastMonthCompliance != null
    ? Math.round((compliancePctRaw - lastMonthCompliance) * 10) / 10
    : 0;

  // --- Station performance ---
  const stationPerformance = stations.map((s) => {
    const stationEntriesPeriod = entriesPeriod.filter((e) => e.station_id === s.id);
    const decided = stationEntriesPeriod.filter((e) => e.status === 'final_approved' || e.status === 'rejected');
    const approvedCount = stationEntriesPeriod.filter((e) => e.status === 'final_approved').length;
    const output = stationEntriesPeriod
      .filter((e) => e.status === 'final_approved')
      .reduce((sum, e) => sum + Number(e.quantity), 0);
    const workerCount = employees.filter((e) => e.station_id === s.id && e.status === 'active').length;
    return {
      id: s.id,
      name: s.name,
      unitLabel: s.unit_label,
      workerCount,
      output: Math.round(output * 10) / 10,
      approvalPct: decided.length ? Math.round((approvedCount / decided.length) * 100) : null
    };
  });

  // --- Exception flags ---
  const exceptionFlags = [];

  // Unusually high entry
  for (const s of stations) {
    const stationEntries = entriesPeriod.filter((e) => e.station_id === s.id && e.status !== 'rejected');
    if (stationEntries.length < 3) continue;
    const avgQty = stationEntries.reduce((sum, e) => sum + Number(e.quantity), 0) / stationEntries.length;
    const outlier = stationEntries.find((e) => Number(e.quantity) > avgQty * 1.5);
    if (outlier && avgQty > 0) {
      const pctAbove = Math.round(((Number(outlier.quantity) - avgQty) / avgQty) * 100);
      exceptionFlags.push({
        type: 'unusually_high_entry',
        title: 'Unusually high entry',
        message: `${outlier.employee_name} logged ${outlier.quantity} ${s.unit_label} at ${s.name} — ${pctAbove}% above station avg. Verify before approval.`
      });
    }
  }

  // Aging approvals (pending station or final review for more than 3 days)
  const agingByStation = {};
  for (const e of entriesPeriod) {
    if (e.status === 'submitted' && (now - new Date(e.created_at)) / DAY_MS > 3) {
      agingByStation[e.station_id] = (agingByStation[e.station_id] || 0) + 1;
    }
  }
  for (const e of pendingFinal) {
    if ((now - new Date(e.station_approved_at)) / DAY_MS > 3) {
      agingByStation[e.station_id] = (agingByStation[e.station_id] || 0) + 1;
    }
  }
  for (const [stationId, count] of Object.entries(agingByStation)) {
    const station = stations.find((s) => s.id === Number(stationId));
    if (station) {
      exceptionFlags.push({
        type: 'aging_approvals',
        title: 'Aging approvals',
        message: `${count} record${count > 1 ? 's' : ''} at ${station.name} pending review > 3 days.`
      });
    }
  }

  // Rejection spike (this week vs prior week, per station)
  const twoWeeksAgo = new Date(now.getTime() - 14 * DAY_MS);
  for (const s of stations) {
    const thisWeekRejected = entriesYear.filter((e) => e.station_id === s.id && e.status === 'rejected' && new Date(e.created_at) >= weekAgo).length;
    const lastWeekRejected = entriesYear.filter((e) => e.station_id === s.id && e.status === 'rejected' && new Date(e.created_at) >= twoWeeksAgo && new Date(e.created_at) < weekAgo).length;
    if (thisWeekRejected >= 2 && thisWeekRejected > lastWeekRejected * 2) {
      exceptionFlags.push({
        type: 'rejection_spike',
        title: 'Rejection spike',
        message: `${s.name}: ${thisWeekRejected} rejections this week (vs ${lastWeekRejected} last week). May indicate a training gap.`
      });
    }
  }

  // Payroll variance vs station budget
  for (const s of stations) {
    if (!s.monthly_budget) continue;
    const mtdCost = entriesYear
      .filter((e) => e.station_id === s.id && e.status === 'final_approved' && new Date(e.entry_date) >= currentMonthStart)
      .reduce((sum, e) => sum + Number(e.amount), 0);
    const budget = Number(s.monthly_budget);
    if (mtdCost > budget * 1.1) {
      const pctOver = Math.round(((mtdCost - budget) / budget) * 100);
      exceptionFlags.push({
        type: 'payroll_variance',
        title: 'Payroll variance',
        message: `${s.name} station MTD cost ${pctOver}% above budget.`
      });
    }
  }

  // --- Pending final approval list ---
  const pendingFinalApprovalList = pendingFinal.map((e) => ({
    id: e.id,
    employeeName: e.employee_name,
    position: e.position,
    stationName: e.station_name,
    entryDate: e.entry_date,
    amount: Number(e.amount),
    badge: e.self_submitted ? 'Self-submitted' : 'Station approved'
  }));

  // --- Top earners (selected period) ---
  const earningsByEmployee = {};
  for (const e of entriesPeriod) {
    if (e.status !== 'final_approved') continue;
    if (!earningsByEmployee[e.employee_id]) {
      earningsByEmployee[e.employee_id] = { employeeId: e.employee_id, name: e.employee_name, position: e.position, earnings: 0, days: new Set() };
    }
    earningsByEmployee[e.employee_id].earnings += Number(e.amount);
    earningsByEmployee[e.employee_id].days.add(e.entry_date.toISOString ? e.entry_date.toISOString() : String(e.entry_date));
  }
  const earnersList = Object.values(earningsByEmployee).map((x) => ({ ...x, days: x.days.size }));
  const avgEarnings = earnersList.length ? earnersList.reduce((s, x) => s + x.earnings, 0) / earnersList.length : 0;
  const topEarners = earnersList
    .sort((a, b) => b.earnings - a.earnings)
    .slice(0, 5)
    .map((x, i) => ({
      rank: i + 1,
      name: x.name,
      position: x.position,
      days: x.days,
      earnings: Math.round(x.earnings * 100) / 100,
      vsAvgPct: avgEarnings > 0 ? Math.round(((x.earnings - avgEarnings) / avgEarnings) * 100) : 0
    }));

  // --- Workforce summary ---
  const activeEmployees = employees.filter((e) => e.status === 'active').length;
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const submittedToday = entriesYear.filter((e) => new Date(e.created_at) >= todayStart).length;
  const activeToday = new Set(entriesYear.filter((e) => new Date(e.created_at) >= todayStart).map((e) => e.employee_id)).size;
  const stationsWithCoverage = stationPerformance.filter((s) => s.workerCount > 0).length;
  const avgDaysWorkedPerWorker = earnersList.length
    ? Math.round((earnersList.reduce((s, x) => s + x.days, 0) / earnersList.length) * 10) / 10
    : 0;

  res.json({
    period,
    stats: {
      payrollCostMTD: Math.round(payrollCostMTD),
      payrollCostTrendPct: Math.round(payrollCostTrendPct * 10) / 10,
      pendingFinalApproval,
      oldestPendingDays,
      rejectionRatePct: Math.round(rejectionRatePct * 10) / 10,
      rejectionRateTrendPct: Math.round(rejectionRateTrendPct * 10) / 10,
      rejectionCountThisWeek,
      compliancePct: Math.round(compliancePct),
      complianceTrendPct,
      complianceTarget: COMPLIANCE_TARGET
    },
    payrollTrend,
    stationPerformance,
    exceptionFlags: exceptionFlags.slice(0, 6),
    pendingFinalApprovalList,
    workforceSummary: {
      activeEmployees,
      activeToday,
      submittedToday,
      stationsFullCoverage: `${stationsWithCoverage}/${stations.length}`,
      avgDaysWorkedPerWorker,
      topEarner: topEarners[0] || null
    },
    topEarners
  });
});
