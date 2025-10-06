// components/ChargerList.tsx
import { useEffect, useRef, useState } from 'react';
import ChargerSearch from './ChargerSearch';
import { useNavigate } from 'react-router-dom';
import { Charger } from '../models/Charger';
import ChargerMap, { ChargerMapHandle } from './ChargerMap';

// --- Desktop Layout ---
function DesktopChargerList({
  chargers, filteredChargers, setFilteredChargers, searchMode, setSearchMode, statusFilter, setStatusFilter, typeFilter, setTypeFilter, locationMap, mapRef, expandedChargerId, setExpandedChargerId, navigate, getStatusClasses, getStatusText
}) {
  return (
    <div className="h-screen flex">
      {/* Left Panel - Chargers List (Scrollable) */}
      <div className="w-1/2 flex flex-col border-r border-gray-200 dark:border-gray-700">
        {/* Static Header Section */}
        <div className="flex-shrink-0 p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <i className="fas fa-charging-station text-blue-500"></i>
                  Estaciones de Carga
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  {chargers.length} cargadores registrados
                </p>
              </div>
            </div>
            
            {/* Search and Filters - Always Visible */}
            <div className="flex flex-col gap-2 mt-4">
              <div className="flex gap-2 flex-wrap">
                <select
                  className="border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-white flex-1 min-w-32"
                  value={searchMode}
                  onChange={e => setSearchMode(e.target.value)}
                >
                  <option value="name">Buscar por nombre</option>
                  <option value="location">Buscar por ubicación</option>
                </select>
                <select
                  className="border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-white flex-1 min-w-32"
                  value={statusFilter ?? ''}
                  onChange={e => setStatusFilter(e.target.value || undefined)}
                >
                  <option value="">Todos los estados</option>
                  <option value="available">Disponible</option>
                  <option value="occupied">Ocupado</option>
                  <option value="maintenance">Mantenimiento</option>
                </select>
                <select
                  className="border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-white flex-1 min-w-32"
                  value={typeFilter ?? ''}
                  onChange={e => setTypeFilter(e.target.value || undefined)}
                >
                  <option value="">Todos los tipos</option>
                  <option value="Type1">Type1</option>
                  <option value="Type2">Type2</option>
                  <option value="CCS">CCS</option>
                  <option value="CHAdeMO">CHAdeMO</option>
                  <option value="Tesla">Tesla</option>
                </select>
              </div>
              <ChargerSearch
                chargers={chargers}
                mode={searchMode}
                onResults={setFilteredChargers}
              />
              <button
                className="px-2 py-1 border rounded text-sm bg-blue-600 text-white hover:bg-blue-700 w-fit"
                onClick={() => setFilteredChargers(
                  chargers.filter(c =>
                    (!statusFilter || c.status === statusFilter) &&
                    (!typeFilter || c.chargerType === typeFilter)
                  )
                )}
              >Filtrar</button>
            </div>
          </div>
        </div>

        {/* Scrollable Chargers List */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
          {filteredChargers.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow p-8 text-center">
              <div className="bg-gray-200 dark:bg-gray-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-charging-station text-2xl text-gray-500 dark:text-gray-200"></i>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-lg">
                No hay cargadores registrados
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
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden transition-all duration-300"
                  >
                    <div
                      onClick={() => setExpandedChargerId(expandedChargerId === charger._id ? null : charger._id)}
                      className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                            {charger.name}
                          </h3>
                          <div className="flex items-center mt-1">
                            <div className={`w-3 h-3 rounded-full mr-2 ${status.dot}`} />
                            <span className={`text-sm ${status.text}`}>
                              {getStatusText(charger.status)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-lg text-xs font-medium">
                            {charger.chargerType}
                          </div>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              navigate(`/chargers/${charger._id}/charts`);
                            }}
                            className="px-3 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900/30 dark:hover:bg-blue-800/50 dark:text-blue-400 text-sm transition-colors"
                          >
                            <i className="fas fa-chart-line mr-1"></i> Gráficas
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              navigate(`/chargers/${charger._id}/calendar`);
                            }}
                            className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100 text-sm transition-colors"
                          >
                            Ver calendario
                          </button>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Potencia</p>
                          <p className="font-medium">{powerOutput} kW</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Ubicación</p>
                          <p className="font-medium truncate">
                            {!charger.location || !Array.isArray(charger.location.coordinates) 
                              ? 'Ubicación desconocida'
                              : locationMap[charger._id] || `${charger.location.coordinates[1].toFixed(4)}, ${charger.location.coordinates[0].toFixed(4)}`}
                            <button
                              className="ml-2 text-blue-600 dark:text-blue-400 underline text-xs"
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
                            >Ver en mapa</button>
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium flex items-center">
                          {expandedChargerId === charger._id ? 'Ocultar detalles' : 'Ver detalles'}
                          <i className={`fas ${expandedChargerId === charger._id ? 'fa-chevron-up' : 'fa-chevron-down'} ml-2 text-xs`}></i>
                        </button>
                      </div>
                    </div>
                    
                    {expandedChargerId === charger._id && (
                      <div className="bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-700 p-4 transition-all duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Información detallada</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Tipo:</span>
                                <span className="font-medium text-gray-800 dark:text-gray-200">
                                  {charger.chargerType}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Potencia:</span>
                                <span className="font-medium text-gray-800 dark:text-gray-200">
                                  {powerOutput} kW
                                </span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Ubicación exacta</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Latitud:</span>
                                <span className="font-medium text-gray-800 dark:text-gray-200">
                                  {charger.location.coordinates[1].toFixed(6)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Longitud:</span>
                                <span className="font-medium text-gray-800 dark:text-gray-200">
                                  {charger.location.coordinates[0].toFixed(6)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                          <button className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg text-gray-800 dark:text-gray-200 text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                            <i className="fas fa-edit mr-2"></i> Cambiar nombre
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

      {/* Right Panel - Map (Static) */}
      <div className="w-1/2 flex flex-col bg-white dark:bg-gray-800 relative z-10">
        <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2 flex items-center justify-between">
            <span>
              <i className="fas fa-map-marker-alt mr-2 text-blue-500"></i> Mapa de Cargadores
            </span>
          </h2>
        </div>
        <div className="flex-1 relative z-10">
          <ChargerMap ref={mapRef} chargers={filteredChargers} />
        </div>
      </div>
    </div>
  );
}

// --- Mobile Layout ---
function MobileChargerList({
  chargers, filteredChargers, setFilteredChargers, searchMode, setSearchMode, statusFilter, setStatusFilter, typeFilter, setTypeFilter, locationMap, mapRef, expandedChargerId, setExpandedChargerId, navigate, getStatusClasses, getStatusText
}) {
  const [isMapMinimized, setIsMapMinimized] = useState(false);

  return (
    <div className="flex flex-col h-screen">
      {/* Static Search Header */}
      <div className="flex-shrink-0 p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <i className="fas fa-charging-station text-blue-500"></i>
            Estaciones de Carga
          </h1>
        </div>
        
        {/* Search and Filters */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <select
              className="border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-white flex-shrink-0"
              value={searchMode}
              onChange={e => setSearchMode(e.target.value)}
            >
              <option value="name">Por nombre</option>
              <option value="location">Por ubicación</option>
            </select>
            <select
              className="border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-white flex-shrink-0"
              value={statusFilter ?? ''}
              onChange={e => setStatusFilter(e.target.value || undefined)}
            >
              <option value="">Todos estados</option>
              <option value="available">Disponible</option>
              <option value="occupied">Ocupado</option>
              <option value="maintenance">Mantenimiento</option>
            </select>
            <select
              className="border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-white flex-shrink-0"
              value={typeFilter ?? ''}
              onChange={e => setTypeFilter(e.target.value || undefined)}
            >
              <option value="">Todos tipos</option>
              <option value="Type1">Type1</option>
              <option value="Type2">Type2</option>
              <option value="CCS">CCS</option>
              <option value="CHAdeMO">CHAdeMO</option>
              <option value="Tesla">Tesla</option>
            </select>
          </div>
          <ChargerSearch
            chargers={chargers}
            mode={searchMode}
            onResults={setFilteredChargers}
          />
          <button
            className="px-2 py-1 border rounded text-sm bg-blue-600 text-white hover:bg-blue-700 w-fit"
            onClick={() => setFilteredChargers(
              chargers.filter(c =>
                (!statusFilter || c.status === statusFilter) &&
                (!typeFilter || c.chargerType === typeFilter)
              )
            )}
          >Filtrar</button>
        </div>
      </div>

      {/* Map Section - Collapsible */}
      <div className={`flex-shrink-0 border-b border-gray-200 dark:border-gray-700 transition-all duration-300 ${isMapMinimized ? 'h-16' : 'h-64'}`}>
        <div className="p-2 bg-gray-50 dark:bg-gray-700 flex justify-between items-center">
          <h3 className="font-semibold text-gray-800 dark:text-white">
            Mapa de Cargadores
          </h3>
          <button 
            onClick={() => setIsMapMinimized(!isMapMinimized)}
            className="p-1 rounded-lg bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500"
          >
            <i className={`fas ${isMapMinimized ? 'fa-chevron-down' : 'fa-chevron-up'} text-gray-600 dark:text-gray-300`}></i>
          </button>
        </div>
        {!isMapMinimized && (
          <div className="h-56">
            <ChargerMap ref={mapRef} chargers={filteredChargers} />
          </div>
        )}
      </div>

      {/* Scrollable Chargers List */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        <div className="p-4">
          {filteredChargers.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow p-6 text-center">
              <p className="text-gray-600 dark:text-gray-300">
                No hay cargadores registrados
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
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
                  >
                    <div
                      onClick={() => setExpandedChargerId(expandedChargerId === charger._id ? null : charger._id)}
                      className="p-3 cursor-pointer"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800 dark:text-white truncate">
                            {charger.name}
                          </h3>
                          <div className="flex items-center mt-1">
                            <div className={`w-2 h-2 rounded-full mr-2 ${status.dot}`} />
                            <span className={`text-xs ${status.text}`}>
                              {getStatusText(charger.status)}
                            </span>
                          </div>
                        </div>
                        <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded text-xs font-medium ml-2">
                          {charger.chargerType}
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Potencia</p>
                          <p className="font-medium">{powerOutput} kW</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Ubicación</p>
                          <p className="font-medium truncate">
                            {!charger.location || !Array.isArray(charger.location.coordinates) 
                              ? 'Ubicación desconocida'
                              : locationMap[charger._id] || `${charger.location.coordinates[1].toFixed(4)}, ${charger.location.coordinates[0].toFixed(4)}`}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-between items-center">
                        <div className="flex gap-1">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              navigate(`/chargers/${charger._id}/charts`);
                            }}
                            className="px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900/30 dark:hover:bg-blue-800/50 dark:text-blue-400 text-xs transition-colors"
                          >
                            <i className="fas fa-chart-line mr-1"></i> Gráficas
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              navigate(`/chargers/${charger._id}/calendar`);
                            }}
                            className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100 text-xs transition-colors"
                          >
                            Calendario
                          </button>
                        </div>
                        <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs font-medium flex items-center">
                          {expandedChargerId === charger._id ? 'Ocultar' : 'Detalles'}
                          <i className={`fas ${expandedChargerId === charger._id ? 'fa-chevron-up' : 'fa-chevron-down'} ml-1 text-xs`}></i>
                        </button>
                      </div>
                    </div>
                    
                    {expandedChargerId === charger._id && (
                      <div className="bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-700 p-3">
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Tipo:</span>
                            <span className="font-medium">{charger.chargerType}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Potencia:</span>
                            <span className="font-medium">{powerOutput} kW</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Latitud:</span>
                            <span className="font-medium">{charger.location.coordinates[1].toFixed(6)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Longitud:</span>
                            <span className="font-medium">{charger.location.coordinates[0].toFixed(6)}</span>
                          </div>
                        </div>
                        <div className="mt-3 flex justify-end gap-2">
                          <button className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200 text-xs hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                            <i className="fas fa-edit mr-1"></i> Cambiar nombre
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

interface ChargerListProps {
  chargers: Charger[];
  onAddNew: () => void;
}

export default function ChargerList({ chargers}: ChargerListProps) {
  const [expandedChargerId, setExpandedChargerId] = useState<string | null>(null);
  const [locationMap] = useState<Record<string, string | null>>({});
  const [searchMode, setSearchMode] = useState<'name' | 'location'>('name');
  const [filteredChargers, setFilteredChargers] = useState<Charger[]>(chargers);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const mapRef = useRef<ChargerMapHandle>(null);
  const navigate = useNavigate();
  
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
      case 'available': return 'Desocupado';
      case 'occupied': return 'Ocupado';
      case 'maintenance': return 'Mantenimiento';
      default: return 'Desconocido';
    }
  };

  const getStatusClasses = (status: string) => {
    switch (status) {
      case 'available':
        return { dot: 'bg-green-500 dark:bg-green-600', text: 'text-green-700 dark:text-green-300' };
      case 'occupied':
        return { dot: 'bg-yellow-500 dark:bg-yellow-600', text: 'text-yellow-700 dark:text-yellow-300' };
      case 'maintenance':
        return { dot: 'bg-red-500 dark:bg-red-600', text: 'text-red-700 dark:text-red-400' };
      default:
        return { dot: 'bg-gray-500 dark:bg-gray-600', text: 'text-gray-700 dark:text-gray-300' };
    }
  };

  return (
    isMobile ? (
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
      />
    )
  );
}