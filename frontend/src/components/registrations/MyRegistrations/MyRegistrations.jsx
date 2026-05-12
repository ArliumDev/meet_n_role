import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { getMyRegistrations, deleteEvent, leaveGame, getSystems, downloadTemplate } from '../../../api/client';
import EditEventModal from '../../events/EditEventModal/EditEventModal';
import SearchAndFilter from '../../common/SearchAndFilter/SearchAndFilter';
import toast from 'react-hot-toast';
import styles from './MyRegistrations.module.css';

function MyRegistrations() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editedEvent, setEditedEvent] = useState(null);
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSubcategory, setFilterSubcategory] = useState('');
  const [systems, setSystems] = useState([]);

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

  const filteredEvents = events.filter(event => {
    const matchesTitle = event.title.toLowerCase().includes(searchTerm.toLowerCase());
    let matchesCategory = true;
    if (filterCategory === 'system') {
      matchesCategory = event.system_name === filterSubcategory;
    } else if (filterCategory === 'status') {
      matchesCategory = event.status === filterSubcategory;
    }
    return matchesTitle && matchesCategory;
  });

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
        toast.success('Partida eliminada');
      } catch (err) {
        toast.error('Error al eliminar: ' + err.message);
      }
    }
  };

  const handleLeaveClick = async (event) => {
    if (window.confirm(`¿Salir de la partida "${event.title}"?`)) {
      try {
        await leaveGame(event.id);
        refreshList();
        toast.success('Has salido de la partida');
      } catch (err) {
        toast.error('Error al salir: ' + err.message);
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

  if (loading) return <div className={styles.loading}>Cargando tus partidas...</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>📋 Mis partidas</h1>

      <SearchAndFilter
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterCategory={filterCategory}
        setFilterCategory={setFilterCategory}
        filterSubcategory={filterSubcategory}
        setFilterSubcategory={setFilterSubcategory}
        systems={systems}
      />

      {filteredEvents.length === 0 ? (
        <p className={styles.noEvents}>No hay partidas que coincidan con los filtros.</p>
      ) : (
        <div className={styles.grid}>
          {filteredEvents.map((event) => {
            const isMaster = user && user.user_id === event.master_id;

            return (
              <div key={event.id} className={styles.card}>
                <h2>{event.title}</h2>
                <h3>{event.description}</h3>
                <p className={styles.date}>🗓️ Fecha: {new Date(event.date).toLocaleDateString()}</p>
                <p className={styles.players}>
                  👥 Jugadores: {event.player_joined || 0}/{event.max_players}
                </p>
                <p>🎲 Master: <span className={styles.master}>{event.master_username}</span></p>
                <p>🎲 Sistema: {event.system_name || 'No especificado'}</p>
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

                <div className={styles.actionButtons}>
                  {event.system_id && (
                    <button
                      className={styles.downloadButton}
                      onClick={() => handleDownloadTemplate(event.system_id, event.system_name)}
                    >
                      📥 Plantilla
                    </button>
                  )}
                  {isMaster ? (
                    <>
                      <button className={styles.editButton} onClick={() => handleEditClick(event)}>
                        ✏️ Editar
                      </button>
                      <button className={styles.deleteButton} onClick={() => handleDeleteClick(event)}>
                        🗑️ Eliminar partida
                      </button>
                    </>
                  ) : (
                    <button className={styles.leaveButton} onClick={() => handleLeaveClick(event)}>
                      🚪 Salir de la partida
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editedEvent && <EditEventModal event={editedEvent} onClose={handleCloseModal} onSave={refreshList} />}
    </div>
  );
}

export default MyRegistrations;