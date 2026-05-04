// src/components/layout/Navbar.jsx
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import styles from './Navbar.module.css';

function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) return null;

  return (
    <nav className={styles.navbar}>
      <div className={styles.navLinks}>
        <Link to="/events">📅 Partidas</Link>
        <Link to="/my-registrations">🎲 Mis partidas</Link>
        <Link to="/events/create">✨ Crear partida</Link>
      </div>
      <div className={styles.userMenu}>
        <button className={styles.userButton} onClick={() => setMenuOpen(!menuOpen)}>
          👤 {user.username} ▼
        </button>
        {menuOpen && (
          <div className={styles.dropdown}>
            <div className={styles.dropdownItem}>
              <strong>{user.username}</strong> ({user.app_role})
            </div>
            <Link to="/profile" className={styles.dropdownItem}>
              ⚙️ Cambiar datos
            </Link>
            <button className={styles.dropdownItem} onClick={logout}>
              🚪 Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
