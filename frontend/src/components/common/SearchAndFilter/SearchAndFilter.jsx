// src/components/common/SearchAndFilter/SearchAndFilter.jsx
import styles from './SearchAndFilter.module.css';

function SearchAndFilter({
  searchTerm,
  setSearchTerm,
  filterCategory,
  setFilterCategory,
  filterSubcategory,
  setFilterSubcategory,
  systems,
}) {
  // Opciones para el primer desplegable (categorías)
  const categories = [
    { value: '', label: '📌 Todas las categorías' },
    { value: 'system', label: '🎲 Sistema' },
    { value: 'status', label: '🚦 Estado' },
  ];

  // Calcular opciones para el segundo desplegable según categoría seleccionada
  let subcategoryOptions = [];
  if (filterCategory === 'system') {
    subcategoryOptions = systems.map(sys => ({
      value: sys.name,
      label: sys.name,
    }));
  } else if (filterCategory === 'status') {
    subcategoryOptions = [
      { value: 'open', label: '✅ Abiertas' },
      { value: 'closed', label: '🔒 Cerradas' },
      { value: 'cancelled', label: '❌ Canceladas' },
    ];
  }

  const handleCategoryChange = (e) => {
    const newCategory = e.target.value;
    setFilterCategory(newCategory);
    setFilterSubcategory(''); // reset subcategoría al cambiar categoría
  };

  return (
    <div className={styles.filters}>
      <div className={styles.searchWrapper}>
        <input
          type="text"
          placeholder="🔍 Buscar por título..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
        {searchTerm && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={() => setSearchTerm('')}
          >
            ✖️
          </button>
        )}
      </div>

      <select
        value={filterCategory}
        onChange={handleCategoryChange}
        className={styles.categorySelect}
      >
        {categories.map(cat => (
          <option key={cat.value} value={cat.value}>{cat.label}</option>
        ))}
      </select>

      <select
        value={filterSubcategory}
        onChange={(e) => setFilterSubcategory(e.target.value)}
        className={styles.subcategorySelect}
        disabled={!filterCategory || subcategoryOptions.length === 0}
      >
        <option value="">-- Selecciona --</option>
        {subcategoryOptions.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

export default SearchAndFilter;