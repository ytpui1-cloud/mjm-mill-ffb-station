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

  getSummary: () => request('/dashboard/summary'),

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
