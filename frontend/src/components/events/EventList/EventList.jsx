import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import SearchAndFilter from '../../common/SearchAndFilter/SearchAndFilter';
import { getAllEvents, getMyRegistrations, registerToGame, leaveGame, deleteEvent, getSystems, downloadTemplate } from '../../../api/client';
import toast from 'react-hot-toast';
import styles from './EventList.module.css';

function EventList() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const [registeredEventIds, setRegisteredEventIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [systems, setSystems] = useState([]);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSubcategory, setFilterSubcategory] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [eventsData, registrationsData] = await Promise.all([getAllEvents(), getMyRegistrations()]);
      setEvents(eventsData);
      const ids = new Set(registrationsData.map((reg) => reg.id));
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

  useEffect(() => {
    const loadSystems = async () => {
      try {
        const data = await getSystems();
        setSystems(data);
      } catch (err) {
        console.error('Error cargando sistemas', err);
      }
    };
    loadSystems();
  }, []);

  const filteredEvents = events.filter((event) => {
    const matchesTitle = event.title.toLowerCase().includes(searchTerm.toLowerCase());
    let matchesCategory = true;
    if (filterCategory === 'system') {
      matchesCategory = event.system_name === filterSubcategory;
    } else if (filterCategory === 'status') {
      matchesCategory = event.status === filterSubcategory;
    }
    return matchesTitle && matchesCategory;
  });

  const handleJoin = async (eventId) => {
    try {
      await registerToGame(eventId);
      setRegisteredEventIds((prev) => new Set(prev).add(eventId));
      setEvents((prevEvents) => prevEvents.map((ev) => (ev.id === eventId ? { ...ev, player_joined: (ev.player_joined || 0) + 1 } : ev)));
      toast.success('✅ Te has apuntado a la partida');
    } catch (err) {
      toast.error('❌' + err.message);
    }
  };

  const handleLeave = async (eventId) => {
    try {
      await leaveGame(eventId);
      setRegisteredEventIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(eventId);
        return newSet;
      });
      setEvents((prevEvents) => prevEvents.map((ev) => (ev.id === eventId ? { ...ev, player_joined: Math.max(0, (ev.player_joined || 0) - 1) } : ev)));
      toast.success('✅ Has salido de la partida');
    } catch (err) {
      toast.error('❌' + err.message);
    }
  };

  const handleDelete = async (eventId, eventTitle) => {
    if (window.confirm(`¿Eliminar la partida "${eventTitle}"? Esta acción no se puede deshacer.`)) {
      try {
        await deleteEvent(eventId);
        await loadData();
        toast.success('✅ Partida eliminada');
      } catch (err) {
        toast.error('❌ Error al eliminar: ' + err.message);
      }
    }
  };

  const handleDownloadTemplate = async (systemId, systemName) => {
    try {
      const blob = await downloadTemplate(systemId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plantilla_${systemName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Plantilla descargada');
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <div className={styles.loading}>Cargando partidas...</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;

  return (
    <div className={styles.container}>
      <SearchAndFilter
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterCategory={filterCategory}
        setFilterCategory={setFilterCategory}
        filterSubcategory={filterSubcategory}
        setFilterSubcategory={setFilterSubcategory}
        systems={systems}
      />
      <h1 className={styles.title}>📅 Partidas disponibles</h1>
      <div className={styles.grid}>
        {filteredEvents.map((event) => {
          const isMaster = user && event.master_id && Number(user.user_id) === Number(event.master_id);
          const isRegistered = registeredEventIds.has(event.id);
          const isFull = (event.player_joined || 0) >= event.max_players;

          // Caso master
          if (isMaster) {
            return (
              <div key={event.id} className={styles.card}>
                <h2>{event.title}</h2>
                <h3>{event.description}</h3>
                <p>🎲 Sistema: {event.system_name || 'No especificado'}</p>
                <p className={styles.date}>🗓️ Fecha: {new Date(event.date).toLocaleDateString()}</p>
                <p className={styles.players}>
                  👥 Jugadores: {event.player_joined || 0}/{event.max_players}
                </p>
                <p>🎲 Master: <span className={styles.master}>{event.master_username}</span></p>
                <p>📌 Estado: <span className={`${styles.status} ${event.status === 'open' ? styles.statusOpen : event.status === 'closed' ? styles.statusClosed : styles.statusCancelled}`}>{event.status}</span></p>
                <div className={styles.actionButtons}>
                  {event.system_id && (
                    <button className={styles.downloadButton} onClick={() => handleDownloadTemplate(event.system_id, event.system_name)}>
                      📥 Plantilla
                    </button>
                  )}
                  <button className={styles.deleteButton} onClick={() => handleDelete(event.id, event.title)}>
                    🗑️ Eliminar partida
                  </button>
                </div>
              </div>
            );
          }

          // Caso no master (jugador)
          return (
            <div key={event.id} className={styles.card}>
              <h2>{event.title}</h2>
              <h3>{event.description}</h3>
              <p>🎲 Sistema: {event.system_name || 'No especificado'}</p>
              <p className={styles.date}>🗓️ Fecha: {new Date(event.date).toLocaleDateString()}</p>
              <p className={styles.players}>
                👥 Jugadores: {event.player_joined || 0}/{event.max_players}
              </p>
              <p>🎲 Master: <span className={styles.master}>{event.master_username}</span></p>
              <p>📌 Estado: <span className={`${styles.status} ${event.status === 'open' ? styles.statusOpen : event.status === 'closed' ? styles.statusClosed : styles.statusCancelled}`}>{event.status}</span></p>
              <div className={styles.actionButtons}>
                {event.system_id && isRegistered && (
                  <button className={styles.downloadButton} onClick={() => handleDownloadTemplate(event.system_id, event.system_name)}>
                    📥 Plantilla
                  </button>
                )}
                {isRegistered ? (
                  <button className={styles.leaveButton} onClick={() => handleLeave(event.id)}>
                    🚪 Salir de la partida
                  </button>
                ) : (
                  event.status === 'open' && (
                    <button className={styles.joinButton} onClick={() => handleJoin(event.id)} disabled={isFull}>
                      {isFull ? '❌ Partida llena' : '🎲 Apuntarse'}
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default EventList;