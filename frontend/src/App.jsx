import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import HomeHub from './pages/HomeHub';
import Dashboard from './pages/Dashboard';
import SuratDashboard from './pages/SuratDashboard';
import SuratEntryForm from './pages/SuratEntryForm';
import SuratScanner from './pages/SuratScanner';
import SuratDetails from './pages/SuratDetails';
import EntryForm from './pages/EntryForm';
import Scanner from './pages/Scanner';
import FileDetails from './pages/FileDetails';
import AdminRoute from './components/AdminRoute';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import WebAppStats from './pages/admin/WebAppStats';
import { Toaster } from 'react-hot-toast';
import KPIDashboard from './components/KPIDashboard';
import PdfTools from './pages/PdfTools';
import Profile from './pages/Profile';

// Pemeriksaan Ingat Sesi Saya: Jika tidak dicentang dan browser baru saja dibuka dari awal, reset sesi
if (localStorage.getItem('remember_me') === 'false' && !sessionStorage.getItem('session_active')) {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('user');
}

// Simple PrivateRoute wrapper
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

const KpiRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

const SuratRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" />;
  return children;
};

const SuratEntryRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const roleStr = localStorage.getItem('role') || '';
  const userRoles = roleStr.split(',').map(r => r.trim());
  if (!token) return <Navigate to="/login" />;
  return (userRoles.includes('Administrator') || userRoles.includes('Petugas Entry Surat')) ? children : <Navigate to="/surat" />;
};

function AppContent() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  useEffect(() => {
    document.title = 'Pantau.Kantah Tangsel';
  }, [location.pathname]);

  useEffect(() => {
    const syncTheme = () => {
      const activeTheme = localStorage.getItem('theme') || 'light';
      document.documentElement.setAttribute('data-theme', activeTheme);
    };
    syncTheme();
    window.addEventListener('theme-change', syncTheme);
    return () => window.removeEventListener('theme-change', syncTheme);
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <main style={{ flex: '1 0 auto', display: 'flex', flexDirection: 'column', paddingBottom: !isLoginPage ? '3.5rem' : '0' }}>
        <Routes>
          <Route path="/login" element={<Login />} />
        
          <Route path="/" element={
            <PrivateRoute>
              <HomeHub />
            </PrivateRoute>
          } />

          <Route path="/berkas" element={
            <PrivateRoute>
              <>
                <Navbar />
                <Dashboard />
              </>
            </PrivateRoute>
          } />

          <Route path="/surat" element={
            <SuratRoute>
              <>
                <Navbar />
                <SuratDashboard />
              </>
            </SuratRoute>
          } />

          <Route path="/surat/entry" element={
            <SuratEntryRoute>
              <>
                <Navbar />
                <SuratEntryForm />
              </>
            </SuratEntryRoute>
          } />

          <Route path="/surat/scan" element={
            <SuratRoute>
              <>
                <Navbar />
                <SuratScanner />
              </>
            </SuratRoute>
          } />

          <Route path="/surat/detail/:id" element={
            <SuratRoute>
              <>
                <Navbar />
                <SuratDetails />
              </>
            </SuratRoute>
          } />

          <Route path="/entry" element={
            <PrivateRoute>
              <>
                <Navbar />
                <EntryForm />
              </>
            </PrivateRoute>
          } />

          <Route path="/scan" element={
            <PrivateRoute>
              <>
                <Navbar />
                <Scanner />
              </>
            </PrivateRoute>
          } />

          <Route path="/file/:qrcode" element={
            <PrivateRoute>
              <>
                <Navbar />
                <FileDetails />
              </>
            </PrivateRoute>
          } />

          <Route path="/kpi" element={
            <KpiRoute>
              <>
                <Navbar />
                <div style={{ padding: '2rem 0' }}>
                  <KPIDashboard />
                </div>
              </>
            </KpiRoute>
          } />

          <Route path="/pdf-tools" element={
            <PrivateRoute>
              <>
                <Navbar />
                <PdfTools />
              </>
            </PrivateRoute>
          } />

          <Route path="/profile" element={
            <PrivateRoute>
              <>
                <Navbar />
                <Profile />
              </>
            </PrivateRoute>
          } />

          {/* Admin Routes */}
          <Route path="/admin" element={
            <AdminRoute>
              <>
                <Navbar />
                <AdminDashboard />
              </>
            </AdminRoute>
          } />
          
          <Route path="/admin/users" element={
            <AdminRoute>
              <>
                <Navbar />
                <UserManagement />
              </>
            </AdminRoute>
          } />

          <Route path="/admin/stats" element={
            <AdminRoute>
              <>
                <Navbar />
                <WebAppStats />
              </>
            </AdminRoute>
          } />
        </Routes>
      </main>
      
      {/* Footer Terkunci di Bawah (Kecuali Halaman Login yang Memiliki Footer Institusi Sendiri) */}
      {!isLoginPage && (
        <footer 
          className="no-print"
          style={{ 
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            width: '100%',
            padding: '10px 1.5rem', 
            fontSize: '0.78rem', 
            color: 'var(--text-muted)', 
            backgroundColor: 'var(--glass-bg)',
            borderTop: '1px solid var(--border-color)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            zIndex: 9999,
            boxSizing: 'border-box'
          }}
        >
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ textAlign: 'left' }}>
              © 2026 Kantor Pertanahan Kota Tangerang Selatan
            </span>
            <a 
              href="https://x.com/dicoandila" 
              target="_blank" 
              rel="noreferrer" 
              style={{ color: '#1D4ED8', textDecoration: 'none', fontWeight: 600, textAlign: 'right' }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
            >
              Build by @dicoandila
            </a>
          </div>
        </footer>
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <Toaster 
        position="top-center" 
        toastOptions={{ 
          style: { background: 'var(--surface-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)', backdropFilter: 'blur(12px)' },
          success: { iconTheme: { primary: 'var(--accent-color)', secondary: 'var(--text-main)' } },
          error: { iconTheme: { primary: 'var(--error-color)', secondary: 'var(--text-main)' } }
        }} 
      />
      <AppContent />
    </Router>
  );
}

export default App;