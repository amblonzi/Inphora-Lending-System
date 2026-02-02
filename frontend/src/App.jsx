import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { GlobalErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { OrganizationProvider } from './context/OrganizationContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Clients from './pages/Clients';
import Dashboard from './pages/Dashboard';
import Loans from './pages/Loans';
import LoanApplication from './pages/LoanApplication';
import Expenses from './pages/Expenses';
import Settings from './pages/Settings';
import PublicRegister from './pages/PublicRegister';
import Branches from './pages/Branches';
import CustomerGroups from './pages/CustomerGroups';
import Reports from './pages/Reports';
import MpesaManagement from './pages/MpesaManagement';
import AuditLogs from './pages/AuditLogs';
import Users from './pages/Users';
import LoanProducts from './pages/LoanProducts';
import InstallPrompt from './components/InstallPrompt';


const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-[#efeff4] dark:bg-[#0a0a0f] transition-colors duration-500 gap-6">
        <div className="w-16 h-16 border-4 border-tytaj-500/10 border-t-tytaj-500 rounded-full animate-spin shadow-lg shadow-tytaj-500/20"></div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-[0.4em] opacity-80">Loading Session</span>
          <span className="text-[8px] font-black text-tytaj-500 uppercase tracking-widest opacity-60">Inphora System</span>
        </div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user?.role !== 'admin') return <Navigate to="/" />;
  return children;
};

function App() {
  return (
    <GlobalErrorBoundary>
      <ThemeProvider>
        <OrganizationProvider>
          <AuthProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<PublicRegister />} />

                <Route path="/" element={
                  <PrivateRoute>
                    <Layout />
                  </PrivateRoute>
                }>
                  <Route index element={<Dashboard />} />
                  <Route path="clients" element={<Clients />} />
                  <Route path="loans" element={<Loans />} />
                  <Route path="loans/new" element={<LoanApplication />} />
                  <Route path="expenses" element={<Expenses />} />
                  <Route path="/branches" element={<Branches />} />
                  <Route path="/customer-groups" element={<CustomerGroups />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/mpesa" element={
                    <AdminRoute>
                      <MpesaManagement />
                    </AdminRoute>
                  } />
                  <Route path="/audit-logs" element={
                    <AdminRoute>
                      <AuditLogs />
                    </AdminRoute>
                  } />
                  <Route path="/users" element={
                    <AdminRoute>
                      <Users />
                    </AdminRoute>
                  } />
                  <Route path="settings" element={<Settings />} />
                  <Route path="loan-products" element={<LoanProducts />} />
                </Route>
              </Routes>
              <InstallPrompt />
              <Toaster
                richColors
                position="top-right"
                toastOptions={{
                  style: {
                    borderRadius: '24px',
                    padding: '20px',
                    fontSize: '11px',
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    backdropFilter: 'blur(16px)'
                  }
                }}
              />
            </Router>
          </AuthProvider>
        </OrganizationProvider>
      </ThemeProvider>
    </GlobalErrorBoundary>
  );
}

export default App;
