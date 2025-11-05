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
    { path: '/', label: 'Cargadores', icon: '' },
    { path: '/profile', label: 'Editar datos de perfil', icon: '' },
  ];

  const evUserMenu = [
    { path: '/', label: 'Reservar', icon: '' },
    { path: '/charging-history', label: 'Historial de cargas', icon: '' },
    { path: '/profile', label: 'Editar datos de perfil', icon: '' },
  ];

  const adminMenu = [
    { path: '/', label: 'Dashboard', icon: '' },
    { path: '/management', label: 'Gestión', icon: '' },
  ];

  /**
   * Función: Obtener elementos de menú según rol del usuario
   * 
   * Roles y sus menús:
   * - station_admin: Cargadores, Perfil
   * - ev_user: Reservar, Historial, Perfil
   * - app_admin: Dashboard, Gestión
   * 
   * @returns Array de items con path, label e icon
   */
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
  
  // Mostrar selector de vehículo solo para usuarios EV con vehículos registrados
  const showVehicleSelector = user?.role === 'ev_user' && evVehicleContext;

  return (
    <>
      {/* Botón hamburguesa para móvil - z-index alto para estar sobre mapa */}
      <button
        className="lg:hidden fixed top-4 left-4 z-[60] btn btn-ghost"
        onClick={() => setIsOpen(!isOpen)}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Overlay oscuro al abrir menú móvil */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-[55]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 
        Sidebar principal
        - Móvil: se desliza desde la izquierda al abrir
        - Desktop: siempre visible, fijo
        - Layout: flex column con header, nav y footer
      */}
      <aside className={`
        fixed inset-y-0 left-0 z-[60]
        w-64 bg-white dark:bg-gray-800 shadow-lg transform
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 transition-transform duration-300 ease-in-out
        flex flex-col h-screen
      `}>
        {/* User Profile */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex items-center space-x-3 flex-1">
            <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-semibold">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div>
              <div className="item-title">{user?.name}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                {user?.role?.replace('_', ' ')}
              </div>
            </div>
            </div>
          </div>

          {/* Selector de vehículo para usuarios EV */}
          {showVehicleSelector && (
            <div className="mt-5 card p-4 dark:bg-gray-900">
              <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                Vehículo seleccionado
              </h3>
              {evVehicleContext.loading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <span className="spinner-inline"></span>
                  Cargando vehículos…
                </div>
              ) : evVehicleContext.vehicles.length > 0 ? (
                <>
                  {/* Dropdown para cambiar vehículo activo */}
                  <select
                    value={evVehicleContext.selectedVehicle?._id ?? ''}
                    onChange={event => evVehicleContext.selectVehicle(event.target.value)}
                    className="select"
                  >
                    {evVehicleContext.vehicles.map(vehicle => (
                      <option key={vehicle._id} value={vehicle._id}>
                        {vehicle.model} · {vehicle.chargerType}
                      </option>
                    ))}
                  </select>

                  {/* Grid con detalles del vehículo seleccionado (2x2) */}
                  {evVehicleContext.selectedVehicle ? (
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-secondary">
                      <div className="surface">
                        <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                          Nivel de carga
                        </div>
                        <div className="mt-1 text-base item-title">
                          {evVehicleContext.selectedVehicle.currentChargeLevel ?? '--'}%
                        </div>
                      </div>
                      <div className="surface">
                        <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                          Capacidad
                        </div>
                        <div className="mt-1 text-base item-title">
                          {evVehicleContext.selectedVehicle.batteryCapacity ?? '--'} kWh
                        </div>
                      </div>
                      <div className="surface">
                        <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                          Modelo
                        </div>
                        <div className="mt-1 text-base item-title">
                          {evVehicleContext.selectedVehicle.model}
                        </div>
                      </div>
                      <div className="surface">
                        <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                          Tipo de cargador
                        </div>
                        <div className="mt-1 text-base item-title">
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
                <p className="text-secondary">
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

        {/* Navegación principal - items dinámicos según rol */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`nav-link ${location.pathname === item.path ? 'nav-link--active' : ''}`}
                  onClick={() => setIsOpen(false)} // Cerrar menú móvil al navegar
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-primary-medium">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer con botón de logout */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleLogout}
            className="btn btn-ghost btn-block text-red-600 dark:text-red-400"
          >
            <span className="text-lg">🚪</span>
            <span className="text-primary-medium">Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default VerticalNavbar;