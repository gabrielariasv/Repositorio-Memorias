// components/ChargerList.tsx
import { FormEvent, useEffect, useRef, useState } from 'react';
import ChargerSearch from './ChargerSearch';
import { useNavigate } from 'react-router-dom';
import { Charger } from '../models/Charger';
import ChargerMap, { ChargerMapHandle } from './ChargerMap';

// --- Desktop Layout ---
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
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-xl">
                    <i className="fas fa-charging-station text-blue-600 dark:text-blue-400 text-xl"></i>
                  </div>
                  <span>Estaciones de Carga</span>
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-2 ml-1">
                  {chargers.length} cargadores registrados
                </p>
              </div>
            </div>
            
            {/* Filtros y Búsqueda */}
            <div className="space-y-4">
              {/* Filtros */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <i className="fas fa-filter text-gray-400"></i>
                    Filtro por estado
                  </label>
                  <select
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer"
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
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <i className="fas fa-plug text-gray-400"></i>
                    Filtro por tipo
                  </label>
                  <select
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer"
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
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Modo de búsqueda:</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSearchMode('name')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        searchMode === 'name'
                          ? 'bg-blue-500 text-white shadow-md'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                      }`}
                    >
                      <i className="fas fa-tag mr-2"></i>Por nombre
                    </button>
                    <button
                      onClick={() => setSearchMode('location')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        searchMode === 'location'
                          ? 'bg-blue-500 text-white shadow-md'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                      }`}
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
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
          <div className="p-6">
            {filteredChargers.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg p-8 text-center">
                <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-charging-station text-3xl text-gray-400 dark:text-gray-500"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  No se encontraron cargadores
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
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
                  
                  return (
                    <div
                      key={charger._id}
                      ref={el => { if (el) chargerRefs.current[charger._id] = el; }}
                      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group ${
                        highlightedChargerId === charger._id ? 'ring-4 ring-blue-500 dark:ring-blue-400' : ''
                      }`}
                    >
                      {/* Contenido de cada cargador */}
                      <div
                        onClick={() => setExpandedChargerId(expandedChargerId === charger._id ? null : charger._id)}
                        className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-800 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {charger.name}
                              </h3>
                              <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.dot} ${status.text} bg-opacity-20`}>
                                {getStatusText(charger.status)}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                              <div className="flex items-center gap-1.5">
                                <i className="fas fa-bolt text-yellow-500"></i>
                                <span>{powerOutput} kW</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <i className="fas fa-plug text-blue-500"></i>
                                <span>{charger.chargerType}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2">
                            <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg text-sm font-medium">
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
                            className="flex-1 flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-800/30 dark:hover:to-blue-700/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 transition-all duration-200 hover:scale-[1.02] hover:shadow-md group/btn"
                            title="Ver gráficas detalladas"
                          >
                            <div className="p-2 bg-blue-500 rounded-lg group-hover/btn:bg-blue-600 transition-colors">
                              <i className="fas fa-chart-line text-white text-lg"></i>
                            </div>
                            <span className="text-sm font-medium">Gráficas</span>
                          </button>

                          <button
                            onClick={e => {
                              e.stopPropagation();
                              navigate(`/chargers/${charger._id}/history`);
                            }}
                            className="flex-1 flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 hover:from-purple-100 hover:to-purple-200 dark:hover:from-purple-800/30 dark:hover:to-purple-700/30 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 transition-all duration-200 hover:scale-[1.02] hover:shadow-md group/btn"
                            title="Ver historial de uso"
                          >
                            <div className="p-2 bg-purple-500 rounded-lg group-hover/btn:bg-purple-600 transition-colors">
                              <i className="fas fa-history text-white text-lg"></i>
                            </div>
                            <span className="text-sm font-medium">Historial</span>
                          </button>

                          <button
                            onClick={e => {
                              e.stopPropagation();
                              navigate(`/chargers/${charger._id}/calendar`);
                            }}
                            className="flex-1 flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 hover:from-green-100 hover:to-green-200 dark:hover:from-green-800/30 dark:hover:to-green-700/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 transition-all duration-200 hover:scale-[1.02] hover:shadow-md group/btn"
                            title="Ver calendario de reservas"
                          >
                            <div className="p-2 bg-green-500 rounded-lg group-hover/btn:bg-green-600 transition-colors">
                              <i className="fas fa-calendar-alt text-white text-lg"></i>
                            </div>
                            <span className="text-sm font-medium">Calendario</span>
                          </button>
                        </div>

                        {/* Información adicional */}
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <i className="fas fa-map-marker-alt text-gray-400"></i>
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
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium flex items-center gap-1.5 transition-colors"
                            >
                              <i className="fas fa-map text-xs"></i>
                              Ver en mapa
                            </button>
                            <button className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors group">
                              <span>{expandedChargerId === charger._id ? 'Ocultar detalles' : 'Ver detalles'}</span>
                              <div className={`p-1.5 rounded-md border-2 transition-all ${
                                expandedChargerId === charger._id 
                                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400' 
                                  : 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 group-hover:border-gray-400 dark:group-hover:border-gray-500'
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
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 border-t border-gray-200 dark:border-gray-600 p-6 transition-all duration-300">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <h4 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                                <i className="fas fa-info-circle text-blue-500"></i>
                                Información del cargador
                              </h4>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                                  <span className="text-gray-600 dark:text-gray-400">Tipo de conector</span>
                                  <span className="font-medium text-gray-800 dark:text-white">
                                    {charger.chargerType}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                                  <span className="text-gray-600 dark:text-gray-400">Potencia máxima</span>
                                  <span className="font-medium text-gray-800 dark:text-white">
                                    {powerOutput} kW
                                  </span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                                  <span className="text-gray-600 dark:text-gray-400">Precio energía</span>
                                  <span className="font-medium text-gray-800 dark:text-white">
                                    {charger.energy_cost != null ? `${Number(charger.energy_cost)} CLP$/kWh` : 'No establecido'}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                                  <span className="text-gray-600 dark:text-gray-400">Precio estacionamiento</span>
                                  <span className="font-medium text-gray-800 dark:text-white">
                                    {charger.parking_cost != null ? `${Number(charger.parking_cost)} CLP$/min` : 'No establecido'}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                                  <span className="text-gray-600 dark:text-gray-400">Estado actual</span>
                                  <span className={`font-medium ${status.text}`}>
                                    {getStatusText(charger.status)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <h4 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                                <i className="fas fa-map-marked-alt text-green-500"></i>
                                Ubicación exacta
                              </h4>
                              <div className="space-y-3 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                                <div className="flex justify-between items-center py-2">
                                  <span className="text-gray-600 dark:text-gray-400">Latitud</span>
                                  <span className="font-mono text-sm text-gray-800 dark:text-white">
                                    {charger.location.coordinates[1].toFixed(6)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                  <span className="text-gray-600 dark:text-gray-400">Longitud</span>
                                  <span className="font-mono text-sm text-gray-800 dark:text-white">
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
                              className="px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 flex items-center gap-2 shadow-sm"
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
      <div className="flex w-1/2 flex-col bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
        <div className="flex-shrink-0 p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-xl">
              <i className="fas fa-map-marker-alt text-green-600 dark:text-green-400"></i>
            </div>
            Mapa de Cargadores
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-2 ml-1">
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

// --- Mobile Layout ---
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
}) {
  const [isMapMinimized, setIsMapMinimized] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="flex flex-col h-[73vh] min-h-[500px]">
      {/* Static Search Header */}
      <div className="flex-shrink-0 p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <i className="fas fa-charging-station text-blue-600 dark:text-blue-400"></i>
            </div>
            Estaciones de Carga
          </h1>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <i className={`fas ${showFilters ? 'fa-times' : 'fa-filter'}`}></i>
          </button>
        </div>
        
        {/* Búsqueda */}
        <div className="mb-3">
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setSearchMode('name')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                searchMode === 'name'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              <i className="fas fa-tag mr-1"></i>Nombre
            </button>
            <button
              onClick={() => setSearchMode('location')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                searchMode === 'location'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
              }`}
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
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Estado del cargador
              </label>
              <select
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Tipo de conector
              </label>
              <select
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="w-full p-3 bg-gray-50 dark:bg-gray-700 flex justify-between items-center hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer group"
        >
          <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            <i className="fas fa-map-marker-alt text-green-500"></i>
            Mapa de Cargadores
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 hidden group-hover:inline">
              {isMapMinimized ? 'Expandir' : 'Minimizar'}
            </span>
            <div className="p-2 rounded-lg bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 shadow-sm group-hover:border-blue-500 dark:group-hover:border-blue-400 transition-all">
              <i className={`fas ${isMapMinimized ? 'fa-expand-alt' : 'fa-compress-alt'} text-lg ${isMapMinimized ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}></i>
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
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
        <div className="p-4">
          {filteredChargers.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow p-6 text-center">
              <i className="fas fa-charging-station text-3xl text-gray-300 dark:text-gray-600 mb-3"></i>
              <p className="text-gray-600 dark:text-gray-300 font-medium">
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
                
                return (
                  <div
                    key={charger._id}
                    ref={el => { if (el) chargerRefs.current[charger._id] = el; }}
                    className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 ${
                      highlightedChargerId === charger._id ? 'ring-4 ring-blue-500 dark:ring-blue-400' : ''
                    }`}
                  >
                    <div
                      onClick={() => setExpandedChargerId(expandedChargerId === charger._id ? null : charger._id)}
                      className="p-4 cursor-pointer active:bg-gray-50 dark:active:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-800 dark:text-white truncate text-sm">
                              {charger.name}
                            </h3>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${status.dot} ${status.text} bg-opacity-20`}>
                              {getStatusText(charger.status)}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400 mb-3">
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
                        
                        <div className="flex flex-col items-end gap-2">
                          <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded text-xs font-medium">
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
                          className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-800/30 text-blue-600 dark:text-blue-400 transition-all duration-200 active:scale-95 group/btn"
                          title="Ver gráficas"
                        >
                          <div className="p-1.5 bg-blue-500 rounded-md group-hover/btn:bg-blue-600 transition-colors">
                            <i className="fas fa-chart-line text-white text-sm"></i>
                          </div>
                          <span className="text-xs font-medium">Gráficas</span>
                        </button>

                        <button
                          onClick={e => {
                            e.stopPropagation();
                            navigate(`/chargers/${charger._id}/history`);
                          }}
                          className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-800/30 text-purple-600 dark:text-purple-400 transition-all duration-200 active:scale-95 group/btn"
                          title="Ver historial"
                        >
                          <div className="p-1.5 bg-purple-500 rounded-md group-hover/btn:bg-purple-600 transition-colors">
                            <i className="fas fa-history text-white text-sm"></i>
                          </div>
                          <span className="text-xs font-medium">Historial</span>
                        </button>

                        <button
                          onClick={e => {
                            e.stopPropagation();
                            navigate(`/chargers/${charger._id}/calendar`);
                          }}
                          className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-800/30 text-green-600 dark:text-green-400 transition-all duration-200 active:scale-95 group/btn"
                          title="Ver calendario"
                        >
                          <div className="p-1.5 bg-green-500 rounded-md group-hover/btn:bg-green-600 transition-colors">
                            <i className="fas fa-calendar-alt text-white text-sm"></i>
                          </div>
                          <span className="text-xs font-medium">Calendario</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <i className="fas fa-map-marker-alt"></i>
                          <span className="truncate max-w-[120px]">
                            {locationMap[charger._id]?.split(',')[0] || 'Ubicación'}
                          </span>
                        </div>
                        
                        <button className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors group">
                          <span>{expandedChargerId === charger._id ? 'Ocultar' : 'Detalles'}</span>
                          <div className={`p-1 rounded border-2 transition-all ${
                            expandedChargerId === charger._id 
                              ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400' 
                              : 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 group-hover:border-blue-400'
                          }`}>
                            <i className={`fas ${expandedChargerId === charger._id ? 'fa-compress-alt' : 'fa-expand-alt'} text-xs ${
                              expandedChargerId === charger._id ? 'text-blue-600 dark:text-blue-400' : ''
                            }`}></i>
                          </div>
                        </button>
                      </div>
                    </div>
                    
                    {expandedChargerId === charger._id && (
                      <div className="bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 p-4">
                        <div className="space-y-3 text-xs">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-gray-500 dark:text-gray-400 mb-1">Tipo</p>
                              <p className="font-medium text-gray-800 dark:text-white">{charger.chargerType}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400 mb-1">Potencia</p>
                              <p className="font-medium text-gray-800 dark:text-white">{powerOutput} kW</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-gray-500 dark:text-gray-400 mb-1">Precio energía</p>
                              <p className="font-medium text-gray-800 dark:text-white">{charger.energy_cost != null ? `$${Number(charger.energy_cost).toFixed(2)} /kWh` : 'No establecido'}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400 mb-1">Precio estacionamiento</p>
                              <p className="font-medium text-gray-800 dark:text-white">{charger.parking_cost != null ? `$${Number(charger.parking_cost).toFixed(2)} /hr` : 'No establecido'}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400 mb-1">Coordenadas</p>
                            <div className="space-y-1 font-mono text-gray-800 dark:text-white">
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
                            className="px-3 py-1.5 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-700 dark:text-gray-200 text-xs hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors flex items-center gap-1"
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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'Disponible';
      case 'occupied': return 'Ocupado';
      case 'maintenance': return 'Mantenimiento';
      default: return 'Desconocido';
    }
  };

  const getStatusClasses = (status: string) => {
    switch (status) {
      case 'available':
        return { 
          dot: 'bg-green-500 dark:bg-green-600 text-green-700 dark:text-green-300', 
          text: 'text-green-700 dark:text-green-300' 
        };
      case 'occupied':
        return { 
          dot: 'bg-yellow-500 dark:bg-yellow-600 text-yellow-700 dark:text-yellow-300', 
          text: 'text-yellow-700 dark:text-yellow-300' 
        };
      case 'maintenance':
        return { 
          dot: 'bg-red-500 dark:bg-red-600 text-red-700 dark:text-red-400', 
          text: 'text-red-700 dark:text-red-400' 
        };
      default:
        return { 
          dot: 'bg-gray-500 dark:bg-gray-600 text-gray-700 dark:text-gray-300', 
          text: 'text-gray-700 dark:text-gray-300' 
        };
    }
  };

  const applyChargerUpdate = (updated: Charger) => {
    setFilteredChargers(prev => prev.map(charger => (charger._id === updated._id ? { ...charger, ...updated } : charger)));
    if (onChargerRename) {
      onChargerRename(updated);
    }
  };

  const openRenameModal = (charger: Charger) => {
    setRenamingCharger(charger);
    setRenameName(charger.name ?? '');
    setRenameError(null);
    // Inicializar los campos de costo (mostrar como string para input)
    setRenameEnergyCost(charger.energy_cost != null ? String(charger.energy_cost) : '');
    setRenameParkingCost(charger.parking_cost != null ? String(charger.parking_cost) : '');
  };

  const closeRenameModal = () => {
    if (isRenaming) return;
    setRenamingCharger(null);
    setRenameName('');
    setRenameError(null);
    setRenameEnergyCost('');
    setRenameParkingCost('');
  };

  const handleRenameSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!renamingCharger) return;

    const trimmedName = renameName.trim();

    if (trimmedName.length < 3) {
      setRenameError('El nombre debe tener al menos 3 caracteres.');
      return;
    }

    if (!/^[\p{L}0-9 .,'"-]+$/u.test(trimmedName)) {
      setRenameError('Utiliza solo letras, números y caracteres básicos.');
      return;
    }

    // Validar valores numéricos de costos
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

      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // Enviar nombre y costos (si están presentes enviar null o número)
      const bodyPayload: Record<string, any> = {
        name: trimmedName,
        energy_cost: energyVal,
        parking_cost: parkingVal
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chargers/${renamingCharger._id}/name`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(bodyPayload),
      });

      if (!response.ok) {
        let message = 'No se pudo actualizar el nombre del cargador.';
        try {
          const data = await response.json();
          if (data?.error) {
            message = data.error;
          }
        } catch {
          // Ignorar error de parseo
        }
        throw new Error(message);
      }

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
        />
      )}

      {renamingCharger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            role="button"
            tabIndex={-1}
            onClick={closeRenameModal}
          ></div>
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow-2xl p-6 transform transition-all duration-300 scale-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-xl">
                <i className="fas fa-edit text-blue-600 dark:text-blue-400 text-lg"></i>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Cambiar detalles del cargador
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Actualiza el nombre y los precios para mejor identificación
                </p>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Cargador actual: <span className="font-medium text-gray-800 dark:text-white">{renamingCharger.name}</span>
              </p>
              {/* Precios apilados: cada uno en su fila */}
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <div>
                  <div className="text-gray-600 text-sm">Precio energía</div>
                  <div className="font-medium text-gray-800 dark:text-white">
                    {renamingCharger.energy_cost != null ? `${Math.round(Number(renamingCharger.energy_cost))} CLP$/kWh` : 'No establecido'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600 text-sm">Precio estacionamiento</div>
                  <div className="font-medium text-gray-800 dark:text-white">
                    {renamingCharger.parking_cost != null ? `${Math.round(Number(renamingCharger.parking_cost))} CLP$/min` : 'No establecido'}
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleRenameSubmit} className="space-y-4">
              <div>
                <label htmlFor="charger-new-name" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Nuevo nombre
                </label>
                <input
                  id="charger-new-name"
                  type="text"
                  value={renameName}
                  onChange={event => setRenameName(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                  placeholder="Ingresa el nuevo nombre..."
                  maxLength={80}
                  autoFocus
                  disabled={isRenaming}
                />
                {renameError && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-red-600 dark:text-red-400">
                    <i className="fas fa-exclamation-circle"></i>
                    {renameError}
                  </div>
                )}
              </div>

              {/* Campos para precios */}
              <div className="grid grid-rows-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Precio energía (CLP$/kWh)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={renameEnergyCost}
                    onChange={e => setRenameEnergyCost(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    placeholder="Ej. 365"
                    disabled={isRenaming}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Precio estacionamiento (CLP$/min)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={renameParkingCost}
                    onChange={e => setRenameParkingCost(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    placeholder="Ej. 29"
                    disabled={isRenaming}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeRenameModal}
                  className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 transition-all duration-200 font-medium flex items-center gap-2"
                  disabled={isRenaming}
                >
                  <i className="fas fa-times"></i>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 font-medium flex items-center gap-2 shadow-lg"
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
    </>
  );
}