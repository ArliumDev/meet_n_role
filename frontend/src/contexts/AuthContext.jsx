import { createContext, useContext, useState, useEffect } from 'react';
import { signIn, signUp, getMe } from '../api/client';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); //true mientras se verifica el token guardado
  const [error, setError] = useState(null);

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
    } else setLoading(false);
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
      console.log('User guardado en contexto:', data);
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

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    setError(null);
  };

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
