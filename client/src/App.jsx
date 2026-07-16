import { Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useAuth } from './context/AuthContext.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Employees from './pages/Employees.jsx';
import Payroll from './pages/Payroll.jsx';
import Reception from './pages/Reception.jsx';
import TeamRoles from './pages/TeamRoles.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

export default function App() {
  const { user } = useAuth();

  return (
    <div className="app-shell">
      {user && <NavBar />}
      <main className={user ? 'app-content' : 'app-content-auth'}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/reception" element={<ProtectedRoute><Reception /></ProtectedRoute>} />
          <Route
            path="/employees"
            element={
              <ProtectedRoute roles={['assistant_station_head', 'station_head', 'manager']}>
                <Employees />
              </ProtectedRoute>
            }
          />
          <Route path="/payroll" element={<ProtectedRoute><Payroll /></ProtectedRoute>} />
          <Route
            path="/team"
            element={
              <ProtectedRoute roles={['manager']}>
                <TeamRoles />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
