import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { signIn, signUp, getMe } from '../api/client';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Persistir sesión al recargar
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      const persistUser = async () => {
        try {
          const userData = await getMe();
          setUser(userData);
          setToken(savedToken);
        } catch (err) {
          localStorage.removeItem('token');
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      persistUser();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const { token } = await signIn(username, password);
      setToken(token);
      localStorage.setItem('token', token);
      const data = await getMe();
      setUser(data);
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const register = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      await signUp(username, password);
      await login(username, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Memoizamos logout para que no cambie de identidad en cada render
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    setError(null);
  }, []);

  // Cierre por inactividad (30 minutos)
  useEffect(() => {
    if (!user) return; // solo activar si hay usuario logueado

    let timeoutId;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        logout();
        toast?.info('Sesión expirada por inactividad');
      }, 30 * 60 * 1000); // 30 minutos (cambia a 2*60*1000 para pruebas)
    };

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'click', 'mousemove'];

    const handleActivity = () => resetTimer();

    // Iniciar timer y registrar eventos
    resetTimer();
    activityEvents.forEach(event => window.addEventListener(event, handleActivity));

    // Limpiar al desmontar o cuando user/logout cambien
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      activityEvents.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [user, logout]);

  const value = {
    token,
    user,
    loading,
    error,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};