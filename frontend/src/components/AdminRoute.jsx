import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function AdminRoute({ children }) {
  const token = localStorage.getItem('token');
  const roleStr = localStorage.getItem('role') || '';
  const userRoles = roleStr.split(',').map(r => r.trim());

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!userRoles.includes('Administrator') && !userRoles.includes('Executive Dashboard')) {
    toast.error('Akses Ditolak. Anda tidak memiliki izin untuk mengakses halaman ini.');
    return <Navigate to="/" replace />;
  }

  return children;
}
