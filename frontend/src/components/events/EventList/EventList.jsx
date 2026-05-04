import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { getAllEvents, getMyRegistrations, registerToGame, leaveGame, deleteEvent } from '../../../api/client';
import styles from './EventList.module.css';

function EventList() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const [registeredEventIds, setRegisteredEventIds] = useState(new Set());

  const loadData = async () => {
    try {
      setLoading(true);
      const [eventsData, registrationsData] = await Promise.all([
        getAllEvents(),
        getMyRegistrations()
      ]);
      setEvents(eventsData);
      const ids = new Set(registrationsData.map(reg => reg.id));
      setRegisteredEventIds(ids);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleJoin = async (eventId) => {
    try {
      await registerToGame(eventId);
      setRegisteredEventIds(prev => new Set(prev).add(eventId));
      setEvents(prevEvents =>
        prevEvents.map(ev =>
          ev.id === eventId
            ? { ...ev, player_joined: (ev.player_joined || 0) + 1 }
            : ev
        )
      );
      alert('✅ Te has apuntado a la partida');
    } catch (err) {
      alert('❌ ' + err.message);
    }
  };

  const handleLeave = async (eventId) => {
    try {
      await leaveGame(eventId);
      setRegisteredEventIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(eventId);
        return newSet;
      });
      setEvents(prevEvents =>
        prevEvents.map(ev =>
          ev.id === eventId
            ? { ...ev, player_joined: Math.max(0, (ev.player_joined || 0) - 1) }
            : ev
        )
      );
      alert('✅ Has salido de la partida');
    } catch (err) {
      alert('❌ ' + err.message);
    }
  };

  const handleDelete = async (eventId, eventTitle) => {
    if (window.confirm(`¿Eliminar la partida "${eventTitle}"? Esta acción no se puede deshacer.`)) {
      try {
        await deleteEvent(eventId);
        await loadData();
        alert('Partida eliminada');
      } catch (err) {
        alert('Error al eliminar: ' + err.message);
      }
    }
  };

  if (loading) return <div className={styles.loading}>Cargando partidas...</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>📅 Partidas disponibles</h1>
      <div className={styles.grid}>
        {events.map((event) => {
          const isMaster = user && event.master_id && Number(user.user_id) === Number(event.master_id);
          const isRegistered = registeredEventIds.has(event.id);
          const isFull = (event.player_joined || 0) >= event.max_players;
          
          // CASO MASTER: botón eliminar
          if (isMaster) {
            return (
              <div key={event.id} className={styles.card}>
                <h2>{event.title}</h2>
                <h3>{event.description}</h3>
                <p className={styles.date}>🗓️ Fecha: {new Date(event.date).toLocaleDateString()}</p>
                <p className={styles.players}>
                  👥 Jugadores: {event.player_joined || 0}/{event.max_players}
                </p>
                <p>🎲 Master: <span className={styles.master}>{event.master_username}</span></p>
                <p>📌 Estado: <span className={`${styles.status} ${event.status === 'open' ? styles.statusOpen : event.status === 'closed' ? styles.statusClosed : styles.statusCancelled}`}>{event.status}</span></p>
                <button
                  className={styles.deleteButton}
                  onClick={() => handleDelete(event.id, event.title)}
                >
                  🗑️ Eliminar partida
                </button>
              </div>
            );
          }

          // CASO NO MASTER: botones apuntarse/salir
          return (
            <div key={event.id} className={styles.card}>
              <h2>{event.title}</h2>
              <h3>{event.description}</h3>
              <p className={styles.date}>🗓️ Fecha: {new Date(event.date).toLocaleDateString()}</p>
              <p className={styles.players}>
                👥 Jugadores: {event.player_joined || 0}/{event.max_players}
              </p>
              <p>🎲 Master: <span className={styles.master}>{event.master_username}</span></p>
              <p>📌 Estado: <span className={`${styles.status} ${event.status === 'open' ? styles.statusOpen : event.status === 'closed' ? styles.statusClosed : styles.statusCancelled}`}>{event.status}</span></p>

              {isRegistered ? (
                <button className={styles.leaveButton} onClick={() => handleLeave(event.id)}>
                  🚪 Salir de la partida
                </button>
              ) : (
                event.status === 'open' && (
                  <button
                    className={styles.joinButton}
                    onClick={() => handleJoin(event.id)}
                    disabled={isFull}
                  >
                    {isFull ? '❌ Partida llena' : '🎲 Apuntarse'}
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default EventList;