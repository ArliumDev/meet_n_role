import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { updateUser } from '../../../api/client';
import styles from './Profile.module.css';

function Profile() {
  const { user, login } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password && password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const updates = {};
      if (username !== user.username) updates.username = username;
      if (password) updates.password = password;
      if (Object.keys(updates).length === 0) {
        setError('No hay cambios');
        setLoading(false);
        return;
      }
      await updateUser(user.user_id, updates.username, updates.password);
      // Recargar datos del usuario (actualizar contexto)
      const response = await fetch('http://localhost:8000/users/me', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const newUser = await response.json();
      // No tenemos una forma directa de actualizar el contexto sin volver a hacer login.
      // Recargamos la página para forzar la actualización (simple pero efectivo)
      window.location.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('¿Restablecer contraseña? Se te asignará una temporal.')) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`http://localhost:8000/users/${user.user_id}/reset_password`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setMessage(`Contraseña temporal: ${data.temp_password}. Anótala y cámbiala luego.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h2>Editar perfil</h2>
        {error && <div className={styles.error}>{error}</div>}
        {message && <div className={styles.message}>{message}</div>}

        <label>Nombre de usuario</label>
        <input
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          className={styles.input}
        />

        <label>Nueva contraseña (dejar vacío para no cambiar)</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className={styles.input}
        />

        <label>Confirmar nueva contraseña</label>
        <input
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          className={styles.input}
        />

        <button type="submit" disabled={loading} className={styles.button}>
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </button>

        <button type="button" onClick={handleReset} disabled={loading} className={styles.resetButton}>
          🔑 Resetear contraseña
        </button>
      </form>
    </div>
  );
}

export default Profile;