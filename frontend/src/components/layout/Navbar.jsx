import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';

function Navbar() {
  const { user, logout } = useAuth();
  if (user === null) return null;

  return (
    <nav>
      <div>
        <Link to="/events">Eventos</Link>
        <Link to="/my-registrations">Mis partidas</Link>
        <Link to="/events/create">Crear partida</Link>
      </div>
      <button type="button" onClick={logout}>
        Cerrar sesión
      </button>
    </nav>
  );
}
export default Navbar;
