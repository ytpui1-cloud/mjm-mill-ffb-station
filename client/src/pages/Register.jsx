import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { ROLES, ROLE_LABELS } from '../roles.js';

const emptyForm = { name: '', phone: '', password: '', claimed_role: '' };

export default function Register() {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await api.register(form);
      setBootstrapped(Boolean(result.bootstrapped));
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted && bootstrapped) {
    return (
      <div className="auth-page">
        <div className="card auth-card">
          <h1 className="page-title">Welcome, Manager!</h1>
          <p>You're the first account on this system, so you've been automatically approved as <strong>Manager</strong>. You can log in right away.</p>
          <p className="auth-switch"><Link to="/login">Go to Login</Link></p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="auth-page">
        <div className="card auth-card">
          <h1 className="page-title">Registration Submitted</h1>
          <p>Your account request has been sent for approval. A Manager will review it and assign your role before you can log in.</p>
          <p className="auth-switch"><Link to="/login">Back to Login</Link></p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <h1 className="page-title">Register</h1>
        {error && <div className="error-banner">{error}</div>}
        <label>Full Name
          <input required value={form.name} onChange={handleChange('name')} />
        </label>
        <label>Mobile Phone Number
          <input type="tel" required value={form.phone} onChange={handleChange('phone')} placeholder="e.g. 013-8062770" />
        </label>
        <label>Password
          <input type="password" required minLength={8} value={form.password} onChange={handleChange('password')} />
        </label>
        <label>Role
          <select required value={form.claimed_role} onChange={handleChange('claimed_role')}>
            <option value="">Select your role</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Register'}
        </button>
        <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
      </form>
    </div>
  );
}
