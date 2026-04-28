import { useState, useEffect } from 'react';
import { getAllEvents } from '../../../api/client';
import styles from './EventList.module.css';

function EventList() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);
        const data = await getAllEvents();
        setEvents(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, []);

  if (loading) return <div className={styles.loading}>Cargando partidas...</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>📅 Partidas disponibles</h1>
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
              📌 Estado: <span className={`${styles.status} ${event.status === 'open' ? styles.statusOpen : event.status === 'closed' ? styles.statusClosed : styles.statusCancelled}`}>{event.status}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default EventList;
