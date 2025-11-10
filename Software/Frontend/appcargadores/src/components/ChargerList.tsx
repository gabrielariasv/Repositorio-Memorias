// components/ChargerList.tsx
import { FormEvent, useEffect, useRef, useState } from 'react';
import ChargerSearch from './ChargerSearch';
import { useNavigate } from 'react-router-dom';
import { Charger } from '../models/Charger';
import ChargerMap, { ChargerMapHandle } from './ChargerMap';
import ChargingModal from './ChargingModal';
import { useAuth } from '../contexts/useAuth';

/**
 * Componente Desktop: Lista de cargadores con filtros y búsqueda
 * 
 * Layout de 2 columnas:
 * - Izquierda: Lista scrollable con filtros y búsqueda
 * - Derecha: Mapa interactivo con marcadores
 * 
 * Features:
 * - Filtros por estado (disponible/ocupado/mantenimiento)
 * - Filtros por tipo de conector
 * - Búsqueda por nombre o ubicación
 * - Expansión de detalles inline
 * - Sincronización bidireccional con mapa
 */
function DesktopChargerList({
  chargers,
  filteredChargers,
  setFilteredChargers,
  searchMode,
  setSearchMode,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  locationMap,
  mapRef,
  expandedChargerId,
  setExpandedChargerId,
  navigate,
  getStatusClasses,
  getStatusText,
  onRequestRename,
  chargerRefs,
  highlightedChargerId,
  onChargerClickFromMap,
  activeChargingSessions,
  onOpenChargingModal,
}) {
  return (
    <div className="flex h-[79vh] min-h-[500px]">
      {/* Left Panel - Lista de Cargadores */}
      <div className="flex w-1/2 flex-col">
        {/* Header Fijo */}
        <div className="flex-shrink-0 p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="heading-1 flex items-center gap-3">
                  <div className="icon-badge-blue">
                    <i className="fas fa-charging-station text-blue-600 dark:text-blue-400 text-xl"></i>
                  </div>
                  <span>Estaciones de Carga</span>
                </h1>
                <p className="text-secondary text-sm mt-2 ml-1">
                  {chargers.length} cargadores registrados
                </p>
              </div>
            </div>
            
            {/* Filtros y Búsqueda */}
            <div className="space-y-4">
              {/* Filtros */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 form-label">
                    <i className="fas fa-filter text-gray-400"></i>
                    Filtro por estado
                  </label>
                  <select
                    className="select appearance-none cursor-pointer"
                    value={statusFilter ?? ''}
                    onChange={e => setStatusFilter(e.target.value || undefined)}
                  >
                    <option value="">Todos los estados</option>
                    <option value="available">Disponible</option>
                    <option value="occupied">Ocupado</option>
                    <option value="maintenance">Mantenimiento</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 form-label">
                    <i className="fas fa-plug text-gray-400"></i>
                    Filtro por tipo
                  </label>
                  <select
                    className="select appearance-none cursor-pointer"
                    value={typeFilter ?? ''}
                    onChange={e => setTypeFilter(e.target.value || undefined)}
                  >
                    <option value="">Todos los tipos</option>
                    <option value="Type1">Type 1</option>
                    <option value="Type2">Type 2</option>
                    <option value="CCS">CCS</option>
                    <option value="CHAdeMO">CHAdeMO</option>
                    <option value="Tesla">Tesla</option>
                  </select>
                </div>
              </div>

              {/* Barra de Búsqueda */}
              <div className="rounded-xl p-4 bg-transparent">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-search text-gray-400 dark:text-gray-500"></i>
                    <span className="form-label">Modo de búsqueda:</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSearchMode('name')}
                      className={`search-toggle ${searchMode === 'name' ? 'search-toggle--active' : 'search-toggle--inactive'}`}
                    >
                      <i className="fas fa-tag mr-2"></i>Por nombre
                    </button>
                    <button
                      onClick={() => setSearchMode('location')}
                      className={`search-toggle ${searchMode === 'location' ? 'search-toggle--active' : 'search-toggle--inactive'}`}
                    >
                      <i className="fas fa-map-marker-alt mr-2"></i>Por ubicación
                    </button>
                  </div>
                </div>
                <ChargerSearch
                  chargers={chargers}
                  mode={searchMode}
                  onResults={setFilteredChargers}
                />
              </div>
            </div>
          </div>
        </div>

        {/* LISTA CON SCROLL INDEPENDIENTE */}
        <div className="scroll-content scrollbar-muted">
          <div className="p-6">
            {filteredChargers.length === 0 ? (
              <div className="card card--2xl card--shadow-lg card--center">
                <div className="icon-empty-container">
                  <i className="fas fa-charging-station icon-empty-xl"></i>
                </div>
                <h3 className="heading-2 mb-2">
                  No se encontraron cargadores
                </h3>
                <p className="text-secondary">
                  Intenta ajustar los filtros o términos de búsqueda
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredChargers.map(charger => {
                  const status = getStatusClasses(charger.status);
                  const powerOutput = typeof charger.powerOutput === 'number' 
                    ? charger.powerOutput.toFixed(2)
                    : charger.powerOutput;
                  const activeSession = activeChargingSessions?.get?.(charger._id);
                  const hasActiveSession = !!activeSession;
                  
                  return (
                    <div
                      key={charger._id}
                      ref={el => { if (el) chargerRefs.current[charger._id] = el; }}
                      className={`card-charger group ${
                        highlightedChargerId === charger._id ? 'ring-4 ring-blue-500 dark:ring-blue-400' : ''
                      } ${hasActiveSession ? 'border-2 border-yellow-400 dark:border-yellow-500' : ''}`}
                    >
                      {/* Contenido de cada cargador */}
                      <div
                        onClick={() => setExpandedChargerId(expandedChargerId === charger._id ? null : charger._id)}
                        className="clickable-area"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="charger-title truncate">
                                {charger.name}
                              </h3>
                              <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.dot} ${status.text} bg-opacity-20`}>
                                {getStatusText(charger.status)}
                              </div>
                              {hasActiveSession && (
                                <span className="badge badge-green animate-pulse">
                                  <i className="fas fa-bolt mr-1"></i>
                                  Carga Activa
                                </span>
                              )}
                            </div>
                            
                            <div className="meta-row mb-3">
                              <div className="flex items-center gap-1.5">
                                <i className="fas fa-bolt icon-yellow"></i>
                                <span>{powerOutput} kW</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <i className="fas fa-plug icon-blue"></i>
                                <span>{charger.chargerType}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex-col-end">
                            <div className="badge badge-blue">
                              {charger.chargerType}
                            </div>
                          </div>
                        </div>

                        {/* Botones de Acción Mejorados */}
                        <div className="mt-4 flex gap-3">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              navigate(`/chargers/${charger._id}/charts`);
                            }}
                            className="action-btn-blue"
                            title="Ver gráficas detalladas"
                          >
                            <div className="action-btn-icon">
                              <i className="fas fa-chart-line text-white text-lg"></i>
                            </div>
                            <span className="text-sm font-medium">Gráficas</span>
                          </button>

                          <button
                            onClick={e => {
                              e.stopPropagation();
                              navigate(`/chargers/${charger._id}/history`);
                            }}
                            className="action-btn-purple"
                            title="Ver historial de uso"
                          >
                            <div className="action-btn-icon">
                              <i className="fas fa-history text-white text-lg"></i>
                            </div>
                            <span className="text-sm font-medium">Historial</span>
                          </button>

                          <button
                            onClick={e => {
                              e.stopPropagation();
                              navigate(`/chargers/${charger._id}/calendar`);
                            }}
                            className="action-btn-green"
                            title="Ver calendario de reservas"
                          >
                            <div className="action-btn-icon">
                              <i className="fas fa-calendar-alt text-white text-lg"></i>
                            </div>
                            <span className="text-sm font-medium">Calendario</span>
                          </button>
                        </div>

                        {/* Botón Ver Carga Actual - Debajo de los 3 botones */}
                        {hasActiveSession && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              onOpenChargingModal(charger._id, activeSession.reservationId, activeSession.vehicleId, activeSession.userId);
                            }}
                            className="btn btn-success btn-sm mt-3 w-full"
                            title="Ver carga actual"
                          >
                            <i className="fas fa-bolt mr-2"></i>
                            Ver Carga Actual
                          </button>
                        )}

                        {/* Información adicional */}
                        <div className="mt-4 flex items-center justify-between">
                          <div className="meta-subtle">
                            <i className="fas fa-map-marker-alt icon-gray"></i>
                            <span className="truncate max-w-[200px]">
                              {!charger.location || !Array.isArray(charger.location.coordinates) 
                                ? 'Ubicación desconocida'
                                : locationMap[charger._id] || `${charger.location.coordinates[1].toFixed(4)}, ${charger.location.coordinates[0].toFixed(4)}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                if (mapRef.current) {
                                  mapRef.current.flyTo({
                                    lat: charger.location.coordinates[1],
                                    lng: charger.location.coordinates[0],
                                    zoom: 17
                                  });
                                }
                              }}
                              className="link link-inline"
                            >
                              <i className="fas fa-map text-xs"></i>
                              Ver en mapa
                            </button>
                            <button className="details-toggle group">
                              <span>{expandedChargerId === charger._id ? 'Ocultar detalles' : 'Ver detalles'}</span>
                              <div className={`p-1.5 rounded-md border-2 transition-all ${
                                expandedChargerId === charger._id 
                                  ? 'chip--selected' 
                                  : 'chip--inactive'
                              }`}>
                                <i className={`fas ${expandedChargerId === charger._id ? 'fa-compress-alt' : 'fa-expand-alt'} text-xs ${
                                  expandedChargerId === charger._id ? 'text-blue-600 dark:text-blue-400' : ''
                                }`}></i>
                              </div>
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Panel expandible */}
                      {expandedChargerId === charger._id && (
                        <div className="card-details-panel">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <h4 className="item-title flex items-center gap-2">
                                <i className="fas fa-info-circle icon-blue"></i>
                                Información del cargador
                              </h4>
                              <div className="space-y-3">
                                <div className="detail-row">
                                  <span className="detail-label">Tipo de conector</span>
                                  <span className="detail-value">
                                    {charger.chargerType}
                                  </span>
                                </div>
                                <div className="detail-row">
                                  <span className="detail-label">Potencia máxima</span>
                                  <span className="detail-value">
                                    {powerOutput} kW
                                  </span>
                                </div>
                                <div className="detail-row">
                                  <span className="detail-label">Precio energía</span>
                                  <span className="detail-value">
                                    {charger.energy_cost != null ? `${Number(charger.energy_cost)} CLP$/kWh` : 'No establecido'}
                                  </span>
                                </div>
                                <div className="detail-row">
                                  <span className="detail-label">Precio estacionamiento</span>
                                  <span className="detail-value">
                                    {charger.parking_cost != null ? `${Number(charger.parking_cost)} CLP$/min` : 'No establecido'}
                                  </span>
                                </div>
                                <div className="detail-row">
                                  <span className="detail-label">Estado actual</span>
                                  <span className={`font-medium ${status.text}`}>
                                    {getStatusText(charger.status)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <h4 className="item-title flex items-center gap-2">
                                <i className="fas fa-map-marked-alt icon-green"></i>
                                Ubicación exacta
                              </h4>
                              <div className="detail-box">
                                <div className="flex justify-between items-center py-2">
                                  <span className="detail-label">Latitud</span>
                                  <span className="coord-value">
                                    {charger.location.coordinates[1].toFixed(6)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                  <span className="detail-label">Longitud</span>
                                  <span className="coord-value">
                                    {charger.location.coordinates[0].toFixed(6)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="mt-6 flex justify-end gap-3">
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                onRequestRename?.(charger);
                              }}
                              className="btn btn-outline"
                            >
                              <i className="fas fa-edit"></i>
                              Cambiar detalles
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Mapa */}
      <div className="panel-bordered-left">
        <div className="panel-header-lg">
          <h2 className="heading-3 flex items-center gap-3">
            <div className="icon-badge-green">
              <i className="fas fa-map-marker-alt icon-green"></i>
            </div>
            Mapa de Cargadores
          </h2>
          <p className="text-secondary text-sm mt-2 ml-1">
            {filteredChargers.length} cargadores mostrados en el mapa
          </p>
        </div>
        <div className="flex-1 rounded-br-2xl overflow-hidden">
          <ChargerMap ref={mapRef} chargers={filteredChargers} onChargerClick={onChargerClickFromMap} />
        </div>
      </div>
    </div>
  );
}

// --- Layout Móvil ---
function MobileChargerList({
  chargers,
  filteredChargers,
  setFilteredChargers,
  searchMode,
  setSearchMode,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  locationMap,
  mapRef,
  expandedChargerId,
  setExpandedChargerId,
  navigate,
  getStatusClasses,
  getStatusText,
  onRequestRename,
  chargerRefs,
  highlightedChargerId,
  onChargerClickFromMap,
  activeChargingSessions,
  onOpenChargingModal,
}) {
  const [isMapMinimized, setIsMapMinimized] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="flex flex-col h-[73vh] min-h-[500px]">
      {/* Static Search Header */}
      <div className="flex-shrink-0 p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h1 className="heading-3 flex items-center gap-2">
            <div className="icon-badge-blue">
              <i className="fas fa-charging-station text-blue-600 dark:text-blue-400"></i>
            </div>
            Estaciones de Carga
          </h1>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-secondary hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <i className={`fas ${showFilters ? 'fa-times' : 'fa-filter'}`}></i>
          </button>
        </div>
        
        {/* Búsqueda */}
        <div className="mb-3">
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setSearchMode('name')}
              className={`search-toggle flex-1 ${searchMode === 'name' ? 'search-toggle--active' : 'search-toggle--inactive'}`}
            >
              <i className="fas fa-tag mr-1"></i>Nombre
            </button>
            <button
              onClick={() => setSearchMode('location')}
              className={`search-toggle flex-1 ${searchMode === 'location' ? 'search-toggle--active' : 'search-toggle--inactive'}`}
            >
              <i className="fas fa-map-marker-alt mr-1"></i>Ubicación
            </button>
          </div>
          <ChargerSearch
            chargers={chargers}
            mode={searchMode}
            onResults={setFilteredChargers}
          />
        </div>

        {/* Filtros Expandibles */}
        {showFilters && (
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-3 animate-slideDown">
            <div className="space-y-2">
              <label className="form-label">
                Estado del cargador
              </label>
              <select
                className="select"
                value={statusFilter ?? ''}
                onChange={e => setStatusFilter(e.target.value || undefined)}
              >
                <option value="">Todos los estados</option>
                <option value="available">Disponible</option>
                <option value="occupied">Ocupado</option>
                <option value="maintenance">Mantenimiento</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="form-label">
                Tipo de conector
              </label>
              <select
                className="select"
                value={typeFilter ?? ''}
                onChange={e => setTypeFilter(e.target.value || undefined)}
              >
                <option value="">Todos los tipos</option>
                <option value="Type1">Type 1</option>
                <option value="Type2">Type 2</option>
                <option value="CCS">CCS</option>
                <option value="CHAdeMO">CHAdeMO</option>
                <option value="Tesla">Tesla</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Map Section - Collapsible */}
      <div className={`flex-shrink-0 border-b border-gray-200 dark:border-gray-700 transition-all duration-300 ${isMapMinimized ? 'h-12' : 'h-48'}`}>
        <button 
          onClick={() => setIsMapMinimized(!isMapMinimized)}
          className="row-toggle group"
        >
          <h3 className="heading-3 flex items-center gap-2">
            <i className="fas fa-map-marker-alt text-green-500"></i>
            Mapa de Cargadores
          </h3>
          <div className="flex items-center gap-2">
            <span className="hover-hint-xs">
              {isMapMinimized ? 'Expandir' : 'Minimizar'}
            </span>
            <div className="toggle-icon-box group-hover:border-blue-500 dark:group-hover:border-blue-400">
              <i className={`fas ${isMapMinimized ? 'fa-expand-alt' : 'fa-compress-alt'} text-lg ${isMapMinimized ? 'text-blue-600 dark:text-blue-400' : 'text-secondary'}`}></i>
            </div>
          </div>
        </button>
        {!isMapMinimized && (
          <div className="h-40">
            <ChargerMap ref={mapRef} chargers={filteredChargers} onChargerClick={onChargerClickFromMap} />
          </div>
        )}
      </div>

      {/* Scrollable Chargers List */}
      <div className="scroll-content scrollbar-muted">
        <div className="p-4">
          {filteredChargers.length === 0 ? (
            <div className="card card--center">
              <i className="fas fa-charging-station icon-empty-xl mb-3"></i>
              <p className="text-primary-medium">
                No se encontraron cargadores
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                Ajusta los filtros o términos de búsqueda
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredChargers.map(charger => {
                const status = getStatusClasses(charger.status);
                const powerOutput = typeof charger.powerOutput === 'number' 
                  ? charger.powerOutput.toFixed(2)
                  : charger.powerOutput;
                const activeSession = activeChargingSessions?.get?.(charger._id);
                const hasActiveSession = !!activeSession;
                
                return (
                  <div
                    key={charger._id}
                    ref={el => { if (el) chargerRefs.current[charger._id] = el; }}
                    className={`card card--hover card-overflow-hidden ${
                      highlightedChargerId === charger._id ? 'ring-4 ring-blue-500 dark:ring-blue-400' : ''
                    } ${hasActiveSession ? 'border-2 border-yellow-400 dark:border-yellow-500' : ''}`}
                  >
                    <div
                      onClick={() => setExpandedChargerId(expandedChargerId === charger._id ? null : charger._id)}
                      className="clickable-area"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="item-title truncate text-sm">
                              {charger.name}
                            </h3>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${status.dot} ${status.text} bg-opacity-20`}>
                              {getStatusText(charger.status)}
                            </div>
                            {hasActiveSession && (
                              <span className="badge badge-green animate-pulse">
                                <i className="fas fa-bolt mr-1"></i>
                                Carga Activa
                              </span>
                            )}
                          </div>
                          
                          <div className="meta-row mb-3">
                            <div className="flex items-center gap-1">
                              <i className="fas fa-bolt text-yellow-500"></i>
                              <span>{powerOutput} kW</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <i className="fas fa-plug text-blue-500"></i>
                              <span>{charger.chargerType}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex-col-end">
                          <div className="badge badge-blue">
                            {charger.chargerType}
                          </div>
                        </div>
                      </div>

                      {/* Botones de Acción Mejorados - Móvil */}
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            navigate(`/chargers/${charger._id}/charts`);
                          }}
                          className="action-btn-blue"
                          title="Ver gráficas"
                        >
                          <div className="action-btn-icon">
                            <i className="fas fa-chart-line text-white text-sm"></i>
                          </div>
                          <span className="text-xs font-medium">Gráficas</span>
                        </button>

                        <button
                          onClick={e => {
                            e.stopPropagation();
                            navigate(`/chargers/${charger._id}/history`);
                          }}
                          className="action-btn-purple"
                          title="Ver historial"
                        >
                          <div className="action-btn-icon">
                            <i className="fas fa-history text-white text-sm"></i>
                          </div>
                          <span className="text-xs font-medium">Historial</span>
                        </button>

                        <button
                          onClick={e => {
                            e.stopPropagation();
                            navigate(`/chargers/${charger._id}/calendar`);
                          }}
                          className="action-btn-green"
                          title="Ver calendario"
                        >
                          <div className="action-btn-icon">
                            <i className="fas fa-calendar-alt text-white text-sm"></i>
                          </div>
                          <span className="text-xs font-medium">Calendario</span>
                        </button>
                      </div>

                      {/* Botón Ver Carga Actual - Debajo de los 3 botones (móvil) */}
                      {hasActiveSession && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onOpenChargingModal(charger._id, activeSession.reservationId, activeSession.vehicleId, activeSession.userId);
                          }}
                          className="btn btn-success btn-xs mt-2 w-full"
                          title="Ver carga actual"
                        >
                          <i className="fas fa-bolt mr-2"></i>
                          Ver Carga Actual
                        </button>
                      )}

                      <div className="flex items-center justify-between mt-3">
                        <div className="meta-subtle">
                          <i className="fas fa-map-marker-alt"></i>
                          <span className="truncate max-w-[120px]">
                            {locationMap[charger._id]?.split(',')[0] || 'Ubicación'}
                          </span>
                        </div>
                        
                        <button className="link link-action group">
                          <span>{expandedChargerId === charger._id ? 'Ocultar' : 'Detalles'}</span>
                          <div className={`p-1 rounded border-2 transition-all ${
                            expandedChargerId === charger._id 
                              ? 'chip--selected' 
                              : 'chip--inactive group-hover:border-blue-400'
                          }`}>
                            <i className={`fas ${expandedChargerId === charger._id ? 'fa-compress-alt' : 'fa-expand-alt'} text-xs ${
                              expandedChargerId === charger._id ? 'text-blue-600 dark:text-blue-400' : ''
                            }`}></i>
                          </div>
                        </button>
                      </div>
                    </div>
                    
                    {expandedChargerId === charger._id && (
                      <div className="card-expand-panel">
                        <div className="space-y-3 text-xs">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="detail-label mb-1">Tipo</p>
                              <p className="detail-value">{charger.chargerType}</p>
                            </div>
                            <div>
                              <p className="detail-label mb-1">Potencia</p>
                              <p className="detail-value">{powerOutput} kW</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="detail-label mb-1">Precio energía</p>
                              <p className="detail-value">{charger.energy_cost != null ? `$${Number(charger.energy_cost).toFixed(2)} /kWh` : 'No establecido'}</p>
                            </div>
                            <div>
                              <p className="detail-label mb-1">Precio estacionamiento</p>
                              <p className="detail-value">{charger.parking_cost != null ? `$${Number(charger.parking_cost).toFixed(2)} /hr` : 'No establecido'}</p>
                            </div>
                          </div>
                          <div>
                            <p className="detail-label mb-1">Coordenadas</p>
                            <div className="space-y-1 coord-value">
                              <div>Lat: {charger.location.coordinates[1].toFixed(6)}</div>
                              <div>Lng: {charger.location.coordinates[0].toFixed(6)}</div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              onRequestRename(charger);
                            }}
                            className="btn btn-outline btn-xs"
                          >
                            <i className="fas fa-edit text-xs"></i>
                            Cambiar nombre
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// El componente principal y el modal de renombrar permanecen igual...
// (Manteniendo el mismo código del componente principal y modal)

interface ChargerListProps {
  chargers: Charger[];
  onChargerRename?: (charger: Charger) => void;
}

export default function ChargerList({ chargers, onChargerRename }: ChargerListProps) {
  const { user } = useAuth();
  const [expandedChargerId, setExpandedChargerId] = useState<string | null>(null);
  const [locationMap] = useState<Record<string, string | null>>({});
  const [searchMode, setSearchMode] = useState<'name' | 'location'>('name');
  const [filteredChargers, setFilteredChargers] = useState<Charger[]>(chargers);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const mapRef = useRef<ChargerMapHandle>(null);
  const chargerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const navigate = useNavigate();
  const [renamingCharger, setRenamingCharger] = useState<Charger | null>(null);
  const [renameName, setRenameName] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  // Nuevos estados para costos editables
  const [renameEnergyCost, setRenameEnergyCost] = useState<string>('');
  const [renameParkingCost, setRenameParkingCost] = useState<string>('');
  const [highlightedChargerId, setHighlightedChargerId] = useState<string | null>(null);
  // Sesiones de carga activas (por cargador)
  const [activeChargingSessions, setActiveChargingSessions] = useState<Map<string, any>>(new Map());
  const [chargingModalOpen, setChargingModalOpen] = useState(false);
  const [selectedChargerForCharging, setSelectedChargerForCharging] = useState<{chargerId: string; reservationId: string; vehicleId: string; userId: string} | null>(null);
  
  // Detectar si es móvil
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setFilteredChargers(
      chargers.filter(c =>
        (!statusFilter || c.status === statusFilter) &&
        (!typeFilter || c.chargerType === typeFilter)
      )
    );
  }, [chargers, statusFilter, typeFilter]);

  // Cargar sesiones activas para cargadores visibles
  useEffect(() => {
    const fetchActiveSessionsForChargers = async (list: Charger[]) => {
      try {
        const token = localStorage.getItem('token');
        const sessionMap = new Map<string, any>();
        await Promise.all(
          list.map(async (charger) => {
            try {
              const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/charging-sessions/active/by-charger/${charger._id}`,
                { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
              );
              if (resp.ok) {
                const data = await resp.json();
                if (data.session && data.session.status !== 'completed' && data.session.status !== 'cancelled') {
                  sessionMap.set(charger._id, data.session);
                }
              }
            } catch (err) {
              console.error('Error fetching session for charger', charger._id, err);
            }
          })
        );
        setActiveChargingSessions(sessionMap);
      } catch (e) {
        console.error('Error fetching active sessions:', e);
      }
    };
    if (filteredChargers && filteredChargers.length > 0) {
      fetchActiveSessionsForChargers(filteredChargers);
    } else {
      setActiveChargingSessions(new Map());
    }
  }, [filteredChargers]);

  const handleOpenChargingModal = (chargerId: string, reservationId: string, vehicleId: string, userId: string) => {
    setSelectedChargerForCharging({ chargerId, reservationId, vehicleId, userId });
    setChargingModalOpen(true);
  };

  const handleCloseChargingModal = () => {
    setChargingModalOpen(false);
    setSelectedChargerForCharging(null);
    // refrescar sesiones activas
    if (filteredChargers && filteredChargers.length > 0) {
      // Trigger re-fetch by recreating filtered array reference
      setFilteredChargers(prev => [...prev]);
    }
  };

  // Función: Obtener texto legible del estado del cargador
  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'Disponible';
      case 'occupied': return 'Ocupado';
      case 'maintenance': return 'Mantenimiento';
      default: return 'Desconocido';
    }
  };

  /**
   * Función: Obtener clases CSS según estado del cargador
   * 
   * Retorna objeto con clases para:
   * - dot: indicador circular de color
   * - text: color del texto
   * 
   * Soporte para modo claro/oscuro con prefijo dark:
   */
  const getStatusClasses = (status: string) => {
    switch (status) {
      case 'available':
        return { 
          dot: 'status-available', 
          text: 'status-available-text' 
        };
      case 'occupied':
        return { 
          dot: 'status-occupied', 
          text: 'status-occupied-text' 
        };
      case 'maintenance':
        return { 
          dot: 'status-maintenance', 
          text: 'status-maintenance-text' 
        };
      default:
        return { 
          dot: 'status-unknown', 
          text: 'status-unknown-text' 
        };
    }
  };

  // Callback: Aplicar actualización de cargador a la lista local
  const applyChargerUpdate = (updated: Charger) => {
    // Actualizar en la lista filtrada
    setFilteredChargers(prev => prev.map(charger => (charger._id === updated._id ? { ...charger, ...updated } : charger)));
    // Propagar cambio al componente padre si existe callback
    if (onChargerRename) {
      onChargerRename(updated);
    }
  };

  /**
   * Función: Abrir modal de edición de cargador
   * 
   * Inicializa el formulario con valores actuales:
   * - Nombre del cargador
   * - Costo de energía ($/kWh)
   * - Costo de estacionamiento ($/hora)
   */
  const openRenameModal = (charger: Charger) => {
    setRenamingCharger(charger);
    setRenameName(charger.name ?? '');
    setRenameError(null);
    // Convertir valores numéricos a string para inputs
    setRenameEnergyCost(charger.energy_cost != null ? String(charger.energy_cost) : '');
    setRenameParkingCost(charger.parking_cost != null ? String(charger.parking_cost) : '');
  };

  // Función: Cerrar modal de edición y limpiar estado
  const closeRenameModal = () => {
    if (isRenaming) return; // Prevenir cierre durante guardado
    setRenamingCharger(null);
    setRenameName('');
    setRenameError(null);
    setRenameEnergyCost('');
    setRenameParkingCost('');
  };

  /**
   * Handler: Guardar cambios del cargador (nombre y costos)
   * 
   * Validaciones:
   * 1. Nombre: mínimo 3 caracteres, solo alfanuméricos y básicos
   * 2. Costos: números >= 0, máximo 10000
   * 
   * Proceso:
   * 1. Validar inputs
   * 2. Enviar PATCH a /api/chargers/:id/name
   * 3. Actualizar lista local con respuesta
   * 4. Cerrar modal
   */
  const handleRenameSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!renamingCharger) return;

    // VALIDACIÓN 1: Nombre debe tener al menos 3 caracteres
    const trimmedName = renameName.trim();
    if (trimmedName.length < 3) {
      setRenameError('El nombre debe tener al menos 3 caracteres.');
      return;
    }

    // VALIDACIÓN 2: Solo caracteres alfanuméricos y símbolos básicos
    if (!/^[\p{L}0-9 .,'"-]+$/u.test(trimmedName)) {
      setRenameError('Utiliza solo letras, números y caracteres básicos.');
      return;
    }

    // VALIDACIÓN 3: Convertir y validar costos numéricos
    const energyTrim = renameEnergyCost.trim();
    const parkingTrim = renameParkingCost.trim();
    const energyVal = energyTrim === '' ? null : parseFloat(energyTrim);
    const parkingVal = parkingTrim === '' ? null : parseFloat(parkingTrim);
    
    if (energyVal !== null && (!isFinite(energyVal) || energyVal < 0 || energyVal > 10000)) {
      setRenameError('El precio de energía debe ser un número válido >= 0.');
      return;
    }
    if (parkingVal !== null && (!isFinite(parkingVal) || parkingVal < 0 || parkingVal > 10000)) {
      setRenameError('El precio de estacionamiento debe ser un número válido >= 0.');
      return;
    }

    try {
      setIsRenaming(true);
      setRenameError(null);

      // PASO 1: Preparar headers con autenticación
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // PASO 2: Construir payload con nombre y costos
      const bodyPayload: Record<string, any> = {
        name: trimmedName,
        energy_cost: energyVal,
        parking_cost: parkingVal
      };

      // PASO 3: Enviar solicitud PATCH al backend
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chargers/${renamingCharger._id}/name`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(bodyPayload),
      });

      // PASO 4: Manejar errores HTTP
      if (!response.ok) {
        let message = 'No se pudo actualizar el nombre del cargador.';
        try {
          const data = await response.json();
          if (data?.error) {
            message = data.error;
          }
        } catch {
          // Ignorar error de parseo JSON
        }
        throw new Error(message);
      }

      // PASO 5: Aplicar cambios a la lista local
      const result = await response.json();
      const updatedCharger: Charger = result?.charger ?? { ...renamingCharger, name: trimmedName, energy_cost: energyVal, parking_cost: parkingVal };
      applyChargerUpdate(updatedCharger);
      closeRenameModal();
    } catch (error: any) {
      setRenameError(error?.message ?? 'Error desconocido al renombrar el cargador.');
    } finally {
      setIsRenaming(false);
    }
  };

  /**
   * Función compleja: handleChargerClickFromMap
   * 
   * Propósito: Sincronizar interacción entre mapa y lista de cargadores.
   * Cuando el usuario hace clic en un marcador del mapa o en su popup,
   * esta función centra la vista en el cargador correspondiente en la lista
   * y lo destaca visualmente para mejorar la UX.
   * 
   * Flujo:
   * 1. Expande el cargador en la lista (muestra sus detalles)
   * 2. Aplica highlight visual (anillo azul) temporalmente
   * 3. Hace scroll suave para centrar el cargador en la pantalla
   * 4. Remueve el highlight después de 2 segundos
   * 
   * Técnicas utilizadas:
   * - useRef para obtener referencia al elemento DOM del cargador
   * - scrollIntoView con behavior:'smooth' para UX suave
   * - Timeout de 100ms para dar tiempo al DOM a expandirse antes de scroll
   * - Highlight temporal de 2s para feedback visual claro
   * - Clases Tailwind 'ring-4 ring-blue-500' para el highlight
   * 
   * @param chargerId - ID del cargador a centrar y destacar
   */
  const handleChargerClickFromMap = (chargerId: string) => {
    // Expandir el cargador
    setExpandedChargerId(chargerId);
    // Destacarlo temporalmente
    setHighlightedChargerId(chargerId);
    // Hacer scroll al elemento
    setTimeout(() => {
      const element = chargerRefs.current[chargerId];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
    // Remover el highlight después de 2 segundos
    setTimeout(() => {
      setHighlightedChargerId(null);
    }, 2000);
  };

  return (
    <>
      {isMobile ? (
        <MobileChargerList
          chargers={chargers}
          filteredChargers={filteredChargers}
          setFilteredChargers={setFilteredChargers}
          searchMode={searchMode}
          setSearchMode={setSearchMode}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          locationMap={locationMap}
          mapRef={mapRef}
          expandedChargerId={expandedChargerId}
          setExpandedChargerId={setExpandedChargerId}
          navigate={navigate}
          getStatusClasses={getStatusClasses}
          getStatusText={getStatusText}
          onRequestRename={openRenameModal}
          chargerRefs={chargerRefs}
          highlightedChargerId={highlightedChargerId}
          onChargerClickFromMap={handleChargerClickFromMap}
          activeChargingSessions={activeChargingSessions}
          onOpenChargingModal={handleOpenChargingModal}
        />
      ) : (
        <DesktopChargerList
          chargers={chargers}
          filteredChargers={filteredChargers}
          setFilteredChargers={setFilteredChargers}
          searchMode={searchMode}
          setSearchMode={setSearchMode}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          locationMap={locationMap}
          mapRef={mapRef}
          expandedChargerId={expandedChargerId}
          setExpandedChargerId={setExpandedChargerId}
          navigate={navigate}
          getStatusClasses={getStatusClasses}
          getStatusText={getStatusText}
          onRequestRename={openRenameModal}
          chargerRefs={chargerRefs}
          highlightedChargerId={highlightedChargerId}
          onChargerClickFromMap={handleChargerClickFromMap}
          activeChargingSessions={activeChargingSessions}
          onOpenChargingModal={handleOpenChargingModal}
        />
      )}

      {renamingCharger && (
        <div className="modal" onClick={closeRenameModal}>
          <div className="relative z-10 w-full max-w-md modal__panel" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="icon-badge-blue">
                <i className="fas fa-edit text-blue-600 dark:text-blue-400 text-lg"></i>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Cambiar detalles del cargador
                </h3>
                <p className="text-sm text-secondary">
                  Actualiza el nombre y los precios para mejor identificación
                </p>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-4">
              <p className="text-sm text-secondary">
                Cargador actual: <span className="detail-value">{renamingCharger.name}</span>
              </p>
              {/* Precios apilados: cada uno en su fila */}
              <div className="mt-2 text-sm text-secondary space-y-2">
                <div>
                  <div className="detail-label text-sm">Precio energía</div>
                  <div className="detail-value">
                    {renamingCharger.energy_cost != null ? `${Math.round(Number(renamingCharger.energy_cost))} CLP$/kWh` : 'No establecido'}
                  </div>
                </div>
                <div>
                  <div className="detail-label text-sm">Precio estacionamiento</div>
                  <div className="detail-value">
                    {renamingCharger.parking_cost != null ? `${Math.round(Number(renamingCharger.parking_cost))} CLP$/min` : 'No establecido'}
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleRenameSubmit} className="space-y-4">
              <div>
                <label htmlFor="charger-new-name" className="form-label">
                  Nuevo nombre
                </label>
                <input
                  id="charger-new-name"
                  type="text"
                  value={renameName}
                  onChange={event => setRenameName(event.target.value)}
                  className="input"
                  placeholder="Ingresa el nuevo nombre..."
                  maxLength={80}
                  autoFocus
                  disabled={isRenaming}
                />
                {renameError && (
                  <div className="error-message">
                    <i className="fas fa-exclamation-circle"></i>
                    {renameError}
                  </div>
                )}
              </div>

              {/* Campos para precios */}
              <div className="grid grid-rows-2 gap-3">
                <div>
                  <label className="form-label">Precio energía (CLP$/kWh)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={renameEnergyCost}
                    onChange={e => setRenameEnergyCost(e.target.value)}
                    className="input"
                    placeholder="Ej. 365"
                    disabled={isRenaming}
                  />
                </div>
                <div>
                  <label className="form-label">Precio estacionamiento (CLP$/min)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={renameParkingCost}
                    onChange={e => setRenameParkingCost(e.target.value)}
                    className="input"
                    placeholder="Ej. 29"
                    disabled={isRenaming}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeRenameModal}
                  className="btn btn-secondary"
                  disabled={isRenaming}
                >
                  <i className="fas fa-times"></i>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isRenaming}
                >
                  {isRenaming ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check"></i>
                      Guardar cambios
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de gestión de la sesión de carga */}
      {selectedChargerForCharging && chargingModalOpen && (
        <ChargingModal
          isOpen={chargingModalOpen}
          onClose={handleCloseChargingModal}
          reservationId={selectedChargerForCharging.reservationId}
          chargerId={selectedChargerForCharging.chargerId}
          vehicleId={selectedChargerForCharging.vehicleId}
          adminId={user?._id || ''}
        />
      )}
    </>
  );
}