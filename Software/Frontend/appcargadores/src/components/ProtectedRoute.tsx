import React from 'react';
import { useAuth } from '../contexts/useAuth';
import Login from './Login';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
}

// Componente que protege rutas requiriendo autenticación y opcionalmente roles específicos
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="screen-center">
        <div className="spinner-lg"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(user.role)) {
      return (
        <div className="screen-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Acceso no autorizado</h1>
            <p className="text-gray-600">No tienes permisos para acceder a esta página.</p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;