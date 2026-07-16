const BASE = import.meta.env.VITE_API_BASE || '/api';
const TOKEN_KEY = 'mjm_token';

export const authStorage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token) => localStorage.setItem(TOKEN_KEY, token),
  clearToken: () => localStorage.removeItem(TOKEN_KEY)
};

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

async function request(path, options = {}) {
  const token = authStorage.getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...options
  });
  if (res.status === 401) {
    onUnauthorized();
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request('/auth/me'),

  listUsers: () => request('/users'),
  approveUser: (id, role) => request(`/users/${id}/approve`, { method: 'PUT', body: JSON.stringify({ role }) }),
  rejectUser: (id) => request(`/users/${id}/reject`, { method: 'PUT' }),
  changeUserRole: (id, role) => request(`/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),

  getSummary: (period) => request(`/dashboard/summary${period ? `?period=${period}` : ''}`),

  listStations: () => request('/stations'),
  createStation: (data) => request('/stations', { method: 'POST', body: JSON.stringify(data) }),
  updateStation: (id, data) => request(`/stations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  setPieceRate: (stationId, rate_per_unit) => request(`/stations/${stationId}/piece-rate`, { method: 'PUT', body: JSON.stringify({ rate_per_unit }) }),
  deleteStation: (id) => request(`/stations/${id}`, { method: 'DELETE' }),

  getSalaryRules: () => request('/salary-rules'),
  updateSalaryRules: (data) => request('/salary-rules', { method: 'PUT', body: JSON.stringify(data) }),

  listWorkEntries: () => request('/work-entries'),
  listMyWorkEntries: () => request('/work-entries/mine'),
  submitWorkEntry: (data) => request('/work-entries', { method: 'POST', body: JSON.stringify(data) }),
  listStationQueue: () => request('/work-entries/queue/station'),
  listFinalQueue: () => request('/work-entries/queue/final'),
  stationApprove: (id) => request(`/work-entries/${id}/station-approve`, { method: 'PUT' }),
  finalApprove: (id) => request(`/work-entries/${id}/final-approve`, { method: 'PUT' }),
  rejectWorkEntry: (id, reason) => request(`/work-entries/${id}/reject`, { method: 'PUT', body: JSON.stringify({ reason }) }),

  listEmployees: () => request('/employees'),
  createEmployee: (data) => request('/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id, data) => request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEmployee: (id) => request(`/employees/${id}`, { method: 'DELETE' }),

  listPayroll: () => request('/payroll'),
  listMyPayroll: () => request('/payroll/mine'),
  createPayroll: (data) => request('/payroll', { method: 'POST', body: JSON.stringify(data) }),
  setPayrollStatus: (id, status) => request(`/payroll/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  deletePayroll: (id) => request(`/payroll/${id}`, { method: 'DELETE' }),

  listReceptions: () => request('/reception'),
  createReception: (data) => request('/reception', { method: 'POST', body: JSON.stringify(data) }),
  deleteReception: (id) => request(`/reception/${id}`, { method: 'DELETE' })
};
