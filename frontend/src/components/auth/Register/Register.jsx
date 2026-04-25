import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import styles from './Register.module.css';

function Register() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPass, setConfirmPass] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [matchErr, setMatchErr] = useState('');

  const { register, loading, error } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPass) {
      setMatchErr('Las contraseñas no coinciden');
      return;
    }

    setMatchErr('');
    await register(username, password);
    navigate('/events');
  };

  return (
    <div className={styles.container}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h2>Regístrate</h2>

        {matchErr && <div className={styles.error}>{matchErr}</div>}
        {error && <div className={styles.error}>{error}</div>}

        <input type="text" placeholder="Usuario" value={username} onChange={(e) => setUsername(e.target.value)} className={styles.input} disabled={loading} />

        <div className={styles.passwordWrapper}>
          <input type={showPassword ? 'text' : 'password'} placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} className={styles.input} disabled={loading} />
          <button type="button" className={styles.eyeButton} onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>

        <div className={styles.passwordWrapper}>
          <input type={showConfirm ? 'text' : 'password'} placeholder="Confirmar contraseña" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} className={styles.input} disabled={loading} />
          <button type="button" className={styles.eyeButton} onClick={() => setShowConfirm(!showConfirm)}>
            {showConfirm ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>

        <button type="submit" disabled={loading} className={styles.button}>
          {loading ? 'Cargando...' : 'Crear cuenta'}
        </button>
        <div className={styles.footer}>
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </div>
      </form>
    </div>
  );
}

export default Register;
