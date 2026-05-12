import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createEvent, getSystems } from '../../../api/client';
import styles from './CreateEventForm.module.css';

function CreateEventForm() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [max_players, setMaxPlayers] = useState('');
  const [systems, setSystems] = useState([]);
  const [selectedSystemId, setSelectedSystemId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      if (!title || !description || !date || !max_players) {
        setError('Todos los campos son obligatorios');
        return;
      }
      if (Number(max_players) < 1) {
        setError('El número de jugadores debe ser al menos 1');
        return;
      }
      if (!selectedSystemId) {
        setError('Debes seleccionar un sistema');
        return;
      }
      await createEvent(title, description, date, Number(max_players), selectedSystemId);
      navigate('/events');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h2>Crear nueva partida</h2>
        {error && <div className={styles.error}>{error}</div>}
        <input className={styles.input} type="text" placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)}></input>
        <textarea className={styles.textarea} placeholder="Descripción de la partida" value={description} onChange={(e) => setDescription(e.target.value)}></textarea>
        <input className={styles.input} type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)}></input>
        <input className={styles.input} type="number" placeholder="Max. jugadores" value={max_players} onChange={(e) => setMaxPlayers(e.target.value)} min="1"></input>
        <select value={selectedSystemId} onChange={(e) => setSelectedSystemId(Number(e.target.value))} className={styles.input} required>
          <option value="">Selecciona un sistema</option>
          {systems.map((sys) => (
            <option key={sys.id} value={sys.id}>
              {sys.name}
            </option>
          ))}
        </select>
        <button className={styles.button} type="submit" disabled={loading}>
          {loading ? 'Creando...' : 'Crear partida'}
        </button>
      </form>
    </div>
  );
}

export default CreateEventForm;
