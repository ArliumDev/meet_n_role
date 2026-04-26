import { useState, useEffect } from 'react';
import { getAllEvents } from '../../../api/client';
// import styles from './EventList.module.css';

function EventList() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      {events.map(event => {
         return <div key={event.id}>
          <h2>{event.title}</h2>
          <h3>{event.description}</h3>
          <p>Creado el {event.date}</p>
          <p>Límite jugadores: {event.max_players}</p>
          <p>Estado: {event.status}</p>
          <p>Master: {event.master_username}</p>
          <p>Jugadores: {event.players_joined}</p>
        </div>
      })}
    </div>
  )
}

export default EventList;
