import { useState, useEffect } from 'react';
import { updateEvent } from '../../../api/client';
import styles from './EditEventModal.module.css';

function EditEventModal({ event, onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('');
  const [status, setStatus] = useState('open');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (event) {
      setTitle(event.title || '');
      setDescription(event.description || '');
      const formattedDate = event.date ? event.date.slice(0, 16) : '';
      setDate(formattedDate);
      setMaxPlayers(event.max_players?.toString() || '');
      setStatus(event.status || 'open');
    }
  }, [event]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const updates = {};
    if (title !== event.title) updates.title = title;
    if (description !== event.description) updates.description = description;
    if (date !== (event.date ? event.date.slice(0, 16) : '')) updates.date = date;
    if (Number(maxPlayers) !== event.max_players) updates.max_players = Number(maxPlayers);
    if (status !== event.status) updates.status = status;

    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }

    setLoading(true);
    setError('');
    try {
      await updateEvent(event.id, updates);
      onSave();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2>Editar partida</h2>
        {error && <div className={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <label>Título</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <label>Descripción</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} required />
          <label>Fecha</label>
          <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} required />
          <label>Máximo de jugadores</label>
          <input type="number" value={maxPlayers} onChange={(e) => setMaxPlayers(e.target.value)} min="1" required />
          <label>Estado</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="open">Abierta</option>
            <option value="closed">Cerrada</option>
            <option value="cancelled">Cancelada</option>
          </select>
          <div className={styles.actions}>
            <button type="button" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditEventModal;
