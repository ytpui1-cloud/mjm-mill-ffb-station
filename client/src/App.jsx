import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useAuth } from './context/AuthContext.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Employees from './pages/Employees.jsx';
import Payroll from './pages/Payroll.jsx';
import Reception from './pages/Reception.jsx';
import TeamRoles from './pages/TeamRoles.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Stations from './pages/Stations.jsx';
import PieceRates from './pages/PieceRates.jsx';
import SalaryRules from './pages/SalaryRules.jsx';
import DataEntry from './pages/DataEntry.jsx';
import Approvals from './pages/Approvals.jsx';
import MyEarnings from './pages/MyEarnings.jsx';
import WorkHistory from './pages/WorkHistory.jsx';

const STATION_MANAGE_ROLES = ['assistant_station_head', 'station_head', 'manager'];

export default function App() {
  const { user } = useAuth();

  return (
    <div className="app-shell">
      {user && <Sidebar />}
      <div className={user ? 'app-main' : 'app-main app-content-auth'}>
        <main className="app-content">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/reception" element={<ProtectedRoute><Reception /></ProtectedRoute>} />
            <Route
              path="/data-entry"
              element={
                <ProtectedRoute roles={['operator', 'assistant_station_head', 'station_head', 'manager']}>
                  <DataEntry />
                </ProtectedRoute>
              }
            />
            <Route path="/my-earnings" element={<ProtectedRoute><MyEarnings /></ProtectedRoute>} />
            <Route path="/work-history" element={<ProtectedRoute><WorkHistory /></ProtectedRoute>} />
            <Route
              path="/approvals"
              element={
                <ProtectedRoute roles={STATION_MANAGE_ROLES}>
                  <Approvals />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stations"
              element={
                <ProtectedRoute roles={STATION_MANAGE_ROLES}>
                  <Stations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employees"
              element={
                <ProtectedRoute roles={STATION_MANAGE_ROLES}>
                  <Employees />
                </ProtectedRoute>
              }
            />
            <Route
              path="/piece-rates"
              element={
                <ProtectedRoute roles={STATION_MANAGE_ROLES}>
                  <PieceRates />
                </ProtectedRoute>
              }
            />
            <Route
              path="/salary-rules"
              element={
                <ProtectedRoute roles={['manager']}>
                  <SalaryRules />
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
    </div>
  );
}
