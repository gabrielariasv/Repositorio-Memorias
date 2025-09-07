import React from 'react';
import {useEffect } from 'react';
import { useAuth } from './contexts/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './components/Dashboard';
import Login from './components/Login';

function App() {
    // Detectar preferencia de color del navegador y aplicar modo oscuro automáticamente
  useEffect(() => {
  const applyDarkMode = (isDark: boolean) => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark-mode');
    }
  };

  // Detectar preferencia inicial
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  applyDarkMode(darkQuery.matches);

  // Escuchar cambios
  const listener = (e: MediaQueryListEvent) => applyDarkMode(e.matches);
  darkQuery.addEventListener('change', listener);

  return () => darkQuery.removeEventListener('change', listener);
}, []);
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-grow p-4">
      {user ? (
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      ) : (
        <Login />
      )}
    </div>
  );
}

export default App;