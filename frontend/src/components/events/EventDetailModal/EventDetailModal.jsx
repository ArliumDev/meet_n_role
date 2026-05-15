import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { getEvent, getEventPlayers, registerToGame, leaveGame } from '../../../api/client';
import toast from 'react-hot-toast';
import styles from './EventDetailModal.module.css';

function EventDetailModal({ eventId, isOpen, onClose, onEventChange }) {
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Cargar datos cada vez que se abre el modal o cambia eventId
  useEffect(() => {
    if (!isOpen || !eventId) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [eventData, playersData] = await Promise.all([
          getEvent(eventId),
          getEventPlayers(eventId)
        ]);
        setEvent(eventData);
        setPlayers(playersData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, eventId]); // dependencias necesarias, loadData no es externa

  const isMaster = user && event && event.master_id === user.user_id;
  const isRegistered = user && players.some(p => p.id === user.user_id);

  const handleJoin = async () => {
    setActionLoading(true);
    try {
      await registerToGame(eventId);
      toast.success('Te has apuntado a la partida');
      // Recargar datos
      const [eventData, playersData] = await Promise.all([
        getEvent(eventId),
        getEventPlayers(eventId)
      ]);
      setEvent(eventData);
      setPlayers(playersData);
      if (onEventChange) onEventChange();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    setActionLoading(true);
    try {
      await leaveGame(eventId);
      toast.success('Has salido de la partida');
      const [eventData, playersData] = await Promise.all([
        getEvent(eventId),
        getEventPlayers(eventId)
      ]);
      setEvent(eventData);
      setPlayers(playersData);
      if (onEventChange) onEventChange();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleKick = async (userId, username) => {
    if (!window.confirm(`¿Expulsar a ${username} de la partida?`)) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:8000/registrations/${eventId}/kick/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Error al expulsar');
      }
      toast.success(`${username} ha sido expulsado`);
      // Recargar lista de jugadores (y evento por si cambia el aforo)
      const [eventData, playersData] = await Promise.all([
        getEvent(eventId),
        getEventPlayers(eventId)
      ]);
      setEvent(eventData);
      setPlayers(playersData);
      if (onEventChange) onEventChange();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>✖</button>
        {loading ? (
          <div className={styles.loading}>Cargando detalles...</div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : (
          <>
            <h2>{event.title}</h2>
            <div className={styles.info}>
              <p><strong>Descripción:</strong> {event.description}</p>
              <p><strong>Fecha:</strong> {new Date(event.date).toLocaleString()}</p>
              <p><strong>Máximo de jugadores:</strong> {event.max_players}</p>
              <p><strong>Estado:</strong> {event.status}</p>
              <p><strong>Sistema:</strong> {event.system_name || 'No especificado'}</p>
              <p><strong>Master:</strong> {event.master_username}</p>
              <p><strong>Jugadores apuntados:</strong> {players.length}/{event.max_players}</p>
            </div>

            <div className={styles.playersSection}>
              <h3>Jugadores</h3>
              <ul className={styles.playersList}>
                {players.map(p => (
                  <li key={p.id} className={styles.playerItem}>
                    <span>{p.username}</span>
                    {isMaster && p.id !== user.user_id && (
                      <button
                        className={styles.kickButton}
                        onClick={() => handleKick(p.id, p.username)}
                        disabled={actionLoading}
                      >
                        Expulsar
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.actions}>
              {!isMaster && (
                isRegistered ? (
                  <button
                    className={styles.leaveButton}
                    onClick={handleLeave}
                    disabled={actionLoading}
                  >
                    🚪 Salir de la partida
                  </button>
                ) : (
                  event.status === 'open' && players.length < event.max_players && (
                    <button
                      className={styles.joinButton}
                      onClick={handleJoin}
                      disabled={actionLoading}
                    >
                      🎲 Apuntarse
                    </button>
                  )
                )
              )}
              {isMaster && (
                <button
                  className={styles.closeModalButton}
                  onClick={onClose}
                >
                  Cerrar
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default EventDetailModal;