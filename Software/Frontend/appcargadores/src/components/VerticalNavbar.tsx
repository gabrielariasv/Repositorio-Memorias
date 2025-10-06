import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';

const VerticalNavbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
  };

  const stationAdminMenu = [
    { path: '/', label: 'Cargadores', icon: '⚡' },
    { path: '/charging-history', label: 'Historial de carga', icon: '📊' },
    { path: '/profile', label: 'Editar datos de perfil', icon: '👤' },
  ];

  const evUserMenu = [
    { path: '/', label: 'Reservar', icon: '🔋' },
    { path: '/charging-history', label: 'Historial de cargas', icon: '📊' },
    { path: '/profile', label: 'Editar datos de perfil', icon: '👤' },
  ];

  const adminMenu = [
    { path: '/', label: 'Dashboard', icon: '🏠' },
  ];

  const getMenuItems = () => {
    switch (user?.role) {
      case 'station_admin':
        return stationAdminMenu;
      case 'ev_user':
        return evUserMenu;
      case 'app_admin':
        return adminMenu;
      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

  return (
    <>
      {/* Mobile menu button - Aumentado z-index */}
      <button
        className="lg:hidden fixed top-4 left-4 z-[60] p-2 rounded-md bg-white dark:bg-gray-800 shadow-md"
        onClick={() => setIsOpen(!isOpen)}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-[55]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar - Aumentado z-index */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-[60] lg:z-50
        w-64 bg-white dark:bg-gray-800 shadow-lg transform
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 transition-transform duration-300 ease-in-out
        flex flex-col h-screen
      `}>
        {/* User Profile */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-semibold">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div>
              <div className="font-semibold text-gray-800 dark:text-gray-100">{user?.name}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                {user?.role?.replace('_', ' ')}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    location.pathname === item.path
                      ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 w-full px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <span className="text-lg">🚪</span>
            <span className="font-medium">Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default VerticalNavbar;