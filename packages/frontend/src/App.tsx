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
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-outline-variant/20 rounded-lg" />
          <div className="h-4 w-72 bg-outline-variant/15 rounded-md" />
        </div>
        <div className="h-10 w-32 bg-outline-variant/20 rounded-xl" />
      </div>

      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 rounded-2xl border border-outline-variant/20 bg-surface/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 bg-outline-variant/20 rounded" />
              <div className="h-8 w-8 bg-outline-variant/20 rounded-xl" />
            </div>
            <div className="h-6 w-28 bg-outline-variant/30 rounded" />
          </div>
        ))}
      </div>

      {/* Table / Content area skeleton */}
      <div className="rounded-2xl border border-outline-variant/20 bg-surface/30 p-6 space-y-4">
        <div className="flex justify-between items-center pb-4 border-b border-outline-variant/15">
          <div className="h-5 w-36 bg-outline-variant/25 rounded" />
          <div className="h-9 w-44 bg-outline-variant/20 rounded-lg" />
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-outline-variant/20 rounded-full" />
                <div className="space-y-1.5">
                  <div className="h-4 w-32 bg-outline-variant/25 rounded" />
                  <div className="h-3 w-24 bg-outline-variant/15 rounded" />
                </div>
              </div>
              <div className="h-4 w-20 bg-outline-variant/20 rounded" />
              <div className="h-6 w-16 bg-outline-variant/20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
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
