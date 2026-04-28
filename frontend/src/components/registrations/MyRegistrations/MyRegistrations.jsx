import { useState, useEffect } from 'react';
import { getMyRegistrations } from '../../../api/client';
import styles from './MyRegistrations.module.css';

function MyRegistrations() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
                            <p className={styles.date}>
                                🗓️ Fecha: {new Date(event.date).toLocaleDateString()}
                            </p>
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
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default MyRegistrations;