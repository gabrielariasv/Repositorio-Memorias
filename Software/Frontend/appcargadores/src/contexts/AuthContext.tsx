import React, { useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { AuthContext, User } from './AuthContextDef';

// Configurar axios para incluir credenciales
axios.defaults.withCredentials = false;

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Effect: Verificar y refrescar token al iniciar sesión
   * 
   * Proceso:
   * 1. Si hay token en localStorage, agregarlo a headers de axios
   * 2. Llamar GET /api/auth/profile para validar token
   * 3. Si válido: actualizar usuario en contexto
   * 4. Si inválido: hacer logout y limpiar sesión
   * 
   * Esto mantiene sesión activa entre recargas de página.
   */
  useEffect(() => {
    const verifyToken = async () => {
      try {
        setIsLoading(true);
        // Validar token con backend
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/profile`);
        setUser(response.data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error verifying token:', error);
        setIsLoading(false);
        // Token inválido o expirado: cerrar sesión
        logout();
      }
    };
    
    if (token) {
      // Configurar header de autorización global
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      verifyToken();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  // verifyToken ahora está definido dentro de useEffect

  /**
   * Función: Iniciar sesión con credenciales
   * 
   * Proceso:
   * 1. Enviar POST a /api/auth/login con email y password
   * 2. Recibir token JWT y datos del usuario
   * 3. Guardar token en localStorage y estado
   * 4. Configurar header Authorization de axios
   * 5. Actualizar usuario en contexto
   * 
   * @returns true si login exitoso, false si falla
   */
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // PASO 1: Autenticar con backend
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        email,
        password
      });
      
      const { token: newToken, user: userData } = response.data;
      
      // PASO 2 y 3: Guardar token y usuario
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      
      // PASO 4: Configurar axios para futuras peticiones
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      setIsLoading(false);
      
      return true;
    } catch (error: any) {
      console.error('Login error:', error);
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setIsLoading(false);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
// useAuth se ha movido a useAuth.ts