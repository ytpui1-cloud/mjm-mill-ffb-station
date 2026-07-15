const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getSummary: () => request('/dashboard/summary'),

  listEmployees: () => request('/employees'),
  createEmployee: (data) => request('/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id, data) => request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEmployee: (id) => request(`/employees/${id}`, { method: 'DELETE' }),

  listPayroll: () => request('/payroll'),
  createPayroll: (data) => request('/payroll', { method: 'POST', body: JSON.stringify(data) }),
  setPayrollStatus: (id, status) => request(`/payroll/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  deletePayroll: (id) => request(`/payroll/${id}`, { method: 'DELETE' }),

  listReceptions: () => request('/reception'),
  createReception: (data) => request('/reception', { method: 'POST', body: JSON.stringify(data) }),
  deleteReception: (id) => request(`/reception/${id}`, { method: 'DELETE' })
};
