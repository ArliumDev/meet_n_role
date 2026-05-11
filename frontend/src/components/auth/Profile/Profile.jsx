import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { updateUser, deleteUser } from '../../../api/client';
import styles from './Profile.module.css';

// Componente para el formulario de eliminación
function DeleteAccount({ onCancel }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!password || !confirm) {
      setError('Debes escribir tu contraseña y confirmarla');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (!window.confirm('⚠️ Esta acción es IRREVERSIBLE. Se borrarán todas tus partidas y registros. ¿Estás seguro?')) {
      return;
    }
    setDeleting(true);
    setError('');
    try {
      await deleteUser();
      logout();
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  };

  return (
    <div className={styles.deleteContainer}>
      <div className={styles.form}>
        <h2>⚠️ Eliminar cuenta</h2>
        <p>Esta acción es permanente. Toda tu información se perderá.</p>
        {error && <div className={styles.error}>{error}</div>}
        <label>Contraseña actual</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className={styles.input}
        />
        <label>Confirmar contraseña</label>
        <input
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          className={styles.input}
        />
        <div className={styles.deleteActions}>
          <button onClick={handleDelete} disabled={deleting} className={styles.deleteButton}>
            {deleting ? 'Eliminando...' : 'Sí, eliminar mi cuenta'}
          </button>
          <button onClick={onCancel} disabled={deleting} className={styles.cancelButton}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// Componente principal Profile
function Profile() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showDeleteForm, setShowDeleteForm] = useState(false);
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
      setMessage('Perfil actualizado. Recargando...');
      setTimeout(() => window.location.reload(), 1500);
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

  // Si se está mostrando el formulario de eliminación, renderiza ese componente
  if (showDeleteForm) {
    return <DeleteAccount onCancel={() => setShowDeleteForm(false)} />;
  }

  // Renderizado normal del perfil
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

        {/* Botón para mostrar el formulario de eliminación */}
        <button
          type="button"
          onClick={() => setShowDeleteForm(true)}
          className={styles.deleteAccountButton}
        >
          🗑️ Eliminar mi cuenta
        </button>
      </form>
    </div>
  );
}

export default Profile;