import styles from './Login.module.css';
import { useAuth } from '../../../contexts/AuthContext';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const { login, loading, error } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(username, password);
    navigate('/events');
  };

  return (
    <div className={styles.container}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h2>Iniciar sesión</h2>

        {error && <div className={styles.error}>{error}</div>}

        <input type="text" placeholder="Usuario" value={username} onChange={(e) => setUsername(e.target.value)} className={styles.input} disabled={loading} />

        <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} className={styles.input} disabled={loading} />

        <button type="submit" disabled={loading} className={styles.button}>
          {loading ? 'Cargando...' : 'Iniciar sesión'}
        </button>
      </form>
    </div>
  );
}

export default Login;
