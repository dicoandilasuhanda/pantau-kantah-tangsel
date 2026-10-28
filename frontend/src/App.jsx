import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import HomeHub from './pages/HomeHub';
import Dashboard from './pages/Dashboard';
import SuratDashboard from './pages/SuratDashboard';
import SuratEntryForm from './pages/SuratEntryForm';
import EntryForm from './pages/EntryForm';
import Scanner from './pages/Scanner';
import FileDetails from './pages/FileDetails';
import AdminRoute from './components/AdminRoute';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import { Toaster } from 'react-hot-toast';
import KPIDashboard from './components/KPIDashboard';

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
  const roleStr = localStorage.getItem('role') || '';
  const userRoles = roleStr.split(',').map(r => r.trim());
  return (userRoles.includes('Administrator') || userRoles.some(r => r.includes('Koordinator')) || userRoles.some(r => r.includes('Kepala Seksi'))) ? children : <Navigate to="/" />;
};

const SuratRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const roleStr = localStorage.getItem('role') || '';
  const userRoles = roleStr.split(',').map(r => r.trim());
  if (!token) return <Navigate to="/login" />;
  return (userRoles.includes('Administrator') || userRoles.includes('Petugas Entry Surat')) ? children : <Navigate to="/" />;
};

const SuratEntryRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const roleStr = localStorage.getItem('role') || '';
  const userRoles = roleStr.split(',').map(r => r.trim());
  if (!token) return <Navigate to="/login" />;
  return userRoles.includes('Petugas Entry Surat') ? children : <Navigate to="/surat" />;
};

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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <main style={{ flex: '1 0 auto', display: 'flex', flexDirection: 'column' }}>
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
          </Routes>
        </main>
        
        {/* Footer Terkunci di Bawah */}
        <footer 
          style={{ 
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            width: '100%',
            textAlign: 'center', 
            padding: '12px 16px', 
            fontSize: '0.8rem', 
            color: '#64748b', 
            backgroundColor: '#090d16',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            zIndex: 9999,
            boxSizing: 'border-box'
          }}
          className="fixed bottom-0 left-0 right-0 w-full py-3 text-center text-xs text-slate-400 bg-[#090d16] border-t border-slate-800/60 z-50"
        >
          <span>
            © 2026 Pantau.Kantah Tangsel. Build by{' '}
            <a 
              href="https://x.com/dicoandila" 
              target="_blank" 
              rel="noreferrer" 
              style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 500 }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
            >
              @dicoandila
            </a>
          </span>
        </footer>
      </div>
    </Router>
  );
}

export default App;