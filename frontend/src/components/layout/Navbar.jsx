import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import styles from './Navbar.module.css';

function Navbar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <nav className={styles.navbar}>
      <div className={styles.navLinks}>
        <Link to="/events">Eventos</Link>
        <Link to="/my-registrations">Mis partidas</Link>
        <Link to="/events/create">Crear partida</Link>
      </div>
      <button className={styles.logoutButton} onClick={logout}>
        Cerrar sesión
      </button>
    </nav>
  );
}

export default Navbar;
