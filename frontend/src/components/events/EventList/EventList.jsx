import styles from './EventList.module.css';

function EventList() {
  return (
    <div className={styles.container}>
      <h1>Lista de partidas</h1>
      <p>Aquí irán los eventos</p>
    </div>
  );
}

export default EventList;