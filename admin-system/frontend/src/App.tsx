import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute, { RoleRoute } from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Employees = lazy(() => import('./pages/Employees'));
const EmployeeDetail = lazy(() => import('./pages/EmployeeDetail'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Payroll = lazy(() => import('./pages/Payroll'));
const Training = lazy(() => import('./pages/Training'));
const Scheduling = lazy(() => import('./pages/Scheduling'));
const Requests = lazy(() => import('./pages/Requests'));
const Settings = lazy(() => import('./pages/Settings'));
const Departments = lazy(() => import('./pages/Departments'));
const Devices = lazy(() => import('./pages/Devices'));
const KioskMonitor = lazy(() => import('./pages/KioskMonitor'));
const Assets = lazy(() => import('./pages/Assets'));
const Contracts = lazy(() => import('./pages/Contracts'));
const ContractTemplates = lazy(() => import('./pages/ContractTemplates'));
const Chatbot = lazy(() => import('./pages/Chatbot'));
const MyPortal = lazy(() => import('./pages/MyPortal'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));

const MANAGEMENT_ROLES = ['Admin', 'HR', 'Manager'];

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-outline font-medium">
      Loading...
    </div>
  );
}

function HomeRedirect() {
  const { user } = useAuth();
  const isEmployeeOnly = user?.roles?.includes('Employee')
    && !user.roles.some((role) => ['Admin', 'HR', 'Manager'].includes(role));

  return <Navigate to={isEmployeeOnly ? '/me' : '/dashboard'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<HomeRedirect />} />
            <Route path="me" element={<MyPortal />} />
            <Route path="dashboard" element={<RoleRoute roles={MANAGEMENT_ROLES}><Dashboard /></RoleRoute>} />
            <Route path="employees" element={<RoleRoute roles={MANAGEMENT_ROLES}><Employees /></RoleRoute>} />
            <Route path="employees/:id" element={<RoleRoute roles={MANAGEMENT_ROLES}><EmployeeDetail /></RoleRoute>} />
            <Route path="attendance" element={<RoleRoute roles={MANAGEMENT_ROLES}><Attendance /></RoleRoute>} />
            <Route path="payroll" element={<RoleRoute roles={MANAGEMENT_ROLES}><Payroll /></RoleRoute>} />
            <Route path="training" element={<RoleRoute roles={MANAGEMENT_ROLES}><Training /></RoleRoute>} />
            <Route path="scheduling" element={<RoleRoute roles={MANAGEMENT_ROLES}><Scheduling /></RoleRoute>} />
            <Route path="requests" element={<RoleRoute roles={MANAGEMENT_ROLES}><Requests /></RoleRoute>} />
            <Route path="departments" element={<RoleRoute roles={MANAGEMENT_ROLES}><Departments /></RoleRoute>} />
            <Route path="devices" element={<RoleRoute roles={MANAGEMENT_ROLES}><Devices /></RoleRoute>} />
            <Route path="devices/:id/kiosk" element={<RoleRoute roles={MANAGEMENT_ROLES}><KioskMonitor /></RoleRoute>} />
            <Route path="assets" element={<RoleRoute roles={MANAGEMENT_ROLES}><Assets /></RoleRoute>} />
            <Route path="contracts" element={<RoleRoute roles={MANAGEMENT_ROLES}><Contracts /></RoleRoute>} />
            <Route path="contract-templates" element={<RoleRoute roles={MANAGEMENT_ROLES}><ContractTemplates /></RoleRoute>} />
            <Route path="chatbot" element={<RoleRoute roles={MANAGEMENT_ROLES}><Chatbot /></RoleRoute>} />
            <Route path="settings" element={<RoleRoute roles={MANAGEMENT_ROLES}><Settings /></RoleRoute>} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
