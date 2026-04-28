import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from './layout/Navbar';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Cargando...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div>
      <Navbar/>
      {children}
    </div>
  )
}

export default ProtectedRoute;