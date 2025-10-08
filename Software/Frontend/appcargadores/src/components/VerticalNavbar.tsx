import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { useEvVehicle } from '../contexts/useEvVehicle';

const VerticalNavbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const evVehicleContext = useEvVehicle();

  const handleLogout = () => {
    logout();
  };

  const stationAdminMenu = [
    { path: '/', label: 'Cargadores', icon: '⚡' },
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
  const showVehicleSelector = user?.role === 'ev_user' && evVehicleContext;

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

      {/* Sidebar - Fijo en la pantalla */}
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

          {showVehicleSelector && (
            <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
              <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                Vehículo seleccionado
              </h3>
              {evVehicleContext.loading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></span>
                  Cargando vehículos…
                </div>
              ) : evVehicleContext.vehicles.length > 0 ? (
                <>
                  <select
                    value={evVehicleContext.selectedVehicle?._id ?? ''}
                    onChange={event => evVehicleContext.selectVehicle(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  >
                    {evVehicleContext.vehicles.map(vehicle => (
                      <option key={vehicle._id} value={vehicle._id}>
                        {vehicle.model} · {vehicle.chargerType}
                      </option>
                    ))}
                  </select>

                  {evVehicleContext.selectedVehicle ? (
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-300">
                      <div className="rounded-lg bg-white px-3 py-2 shadow-sm dark:bg-gray-800/70">
                        <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                          Nivel de carga
                        </div>
                        <div className="mt-1 text-base font-semibold text-gray-800 dark:text-gray-100">
                          {evVehicleContext.selectedVehicle.currentChargeLevel ?? '--'}%
                        </div>
                      </div>
                      <div className="rounded-lg bg-white px-3 py-2 shadow-sm dark:bg-gray-800/70">
                        <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                          Capacidad
                        </div>
                        <div className="mt-1 text-base font-semibold text-gray-800 dark:text-gray-100">
                          {evVehicleContext.selectedVehicle.batteryCapacity ?? '--'} kWh
                        </div>
                      </div>
                      <div className="rounded-lg bg-white px-3 py-2 shadow-sm dark:bg-gray-800/70">
                        <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                          Modelo
                        </div>
                        <div className="mt-1 text-base font-semibold text-gray-800 dark:text-gray-100">
                          {evVehicleContext.selectedVehicle.model}
                        </div>
                      </div>
                      <div className="rounded-lg bg-white px-3 py-2 shadow-sm dark:bg-gray-800/70">
                        <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                          Tipo de cargador
                        </div>
                        <div className="mt-1 text-base font-semibold text-gray-800 dark:text-gray-100">
                          {evVehicleContext.selectedVehicle.chargerType}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm text-gray-500 shadow-sm dark:bg-gray-800/70 dark:text-gray-300">
                      Selecciona un vehículo para ver sus detalles.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No tienes vehículos registrados.
                </p>
              )}
              {evVehicleContext.error && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                  {evVehicleContext.error}
                </p>
              )}
            </div>
          )}
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