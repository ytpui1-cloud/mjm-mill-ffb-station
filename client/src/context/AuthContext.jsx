import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, authStorage, setUnauthorizedHandler } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    authStorage.clearToken();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  useEffect(() => {
    if (!authStorage.getToken()) {
      setLoading(false);
      return;
    }
    api.me()
      .then(setUser)
      .catch(() => authStorage.clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = async (phone, password) => {
    const { token, user: loggedInUser } = await api.login({ phone, password });
    authStorage.setToken(token);
    setUser(loggedInUser);
    return loggedInUser;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
