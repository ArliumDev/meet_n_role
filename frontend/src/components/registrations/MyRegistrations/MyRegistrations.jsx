import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { getMyRegistrations, deleteEvent, leaveGame } from '../../../api/client';
import EditEventModal from '../../events/EditEventModal/EditEventModal';
import styles from './MyRegistrations.module.css';

function MyRegistrations() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editedEvent, setEditedEvent] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const loadRegistrations = async () => {
      try {
        setLoading(true);
        const data = await getMyRegistrations();
        setEvents(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadRegistrations();
  }, []);

  const refreshList = async () => {
    const data = await getMyRegistrations();
    setEvents(data);
  };

  const handleEditClick = (event) => setEditedEvent(event);
  const handleCloseModal = () => setEditedEvent(null);

  const handleDeleteClick = async (event) => {
    if (window.confirm(`¿Eliminar la partida "${event.title}"? Esta acción no se puede deshacer.`)) {
      try {
        await deleteEvent(event.id);
        refreshList();
      } catch (err) {
        alert('Error al eliminar: ' + err.message);
      }
    }
  };

  const handleLeaveClick = async (event) => {
    if (window.confirm(`¿Salir de la partida "${event.title}"?`)) {
      try {
        await leaveGame(event.id);
        refreshList();
      } catch (err) {
        alert('Error al salir: ' + err.message);
      }
    }
  };

  if (loading) return <div className={styles.loading}>Cargando tus partidas...</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>📋 Mis partidas</h1>
      {events.length === 0 ? (
        <p className={styles.noEvents}>No estás apuntado a ninguna partida.</p>
      ) : (
        <div className={styles.grid}>
          {events.map((event) => (
            <div key={event.id} className={styles.card}>
              <h2>{event.title}</h2>
              <h3>{event.description}</h3>
              <p className={styles.date}>🗓️ Fecha: {new Date(event.date).toLocaleDateString()}</p>
              <p className={styles.players}>
                👥 Jugadores: {event.player_joined || 0}/{event.max_players}
              </p>
              <p>
                🎲 Master: <span className={styles.master}>{event.master_username}</span>
              </p>
              <p>
                📌 Estado:{' '}
                <span
                  className={`${styles.status} ${
                    event.status === 'open'
                      ? styles.statusOpen
                      : event.status === 'closed'
                      ? styles.statusClosed
                      : styles.statusCancelled
                  }`}
                >
                  {event.status}
                </span>
              </p>

              {/* Botones para el máster */}
              {user && user.user_id === event.master_id && (
                <div className={styles.buttonGroup}>
                  <button className={styles.editButton} onClick={() => handleEditClick(event)}>
                    ✏️ Editar
                  </button>
                  <button className={styles.deleteButton} onClick={() => handleDeleteClick(event)}>
                    🗑️ Eliminar
                  </button>
                </div>
              )}

              {/* Botón "Salir de la partida" solo para jugadores (no máster) */}
              {user && user.user_id !== event.master_id && (
                <button className={styles.leaveButton} onClick={() => handleLeaveClick(event)}>
                  🚪 Salir de la partida
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {editedEvent && <EditEventModal event={editedEvent} onClose={handleCloseModal} onSave={refreshList} />}
    </div>
  );
}

export default MyRegistrations;