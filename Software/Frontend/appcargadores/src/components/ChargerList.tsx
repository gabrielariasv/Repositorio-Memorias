// components/ChargerList.tsx
import { useState } from 'react';
import { Charger } from '../models/Charger';
import ChargerMap from './ChargerMap';

interface ChargerListProps {
  chargers: Charger[];
  onAddNew: () => void;
}

export default function ChargerList({ chargers, onAddNew }: ChargerListProps) {
  const [expandedChargerId, setExpandedChargerId] = useState<string | null>(null);

  const toggleExpand = (chargerId: string) => {
    setExpandedChargerId(expandedChargerId === chargerId ? null : chargerId);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'Desocupado';
      case 'in-use': return 'Ocupado';
      case 'maintenance': return 'Mantenimiento';
      default: return 'Desconocido';
    }
  };

  // Devuelve clases separadas para el punto (dot) y el texto (text)
  const getStatusClasses = (status: string) => {
    switch (status) {
      case 'available':
        return {
          dot: 'bg-green-500 dark:bg-green-600',
          text: 'text-green-700 dark:text-green-300'
        };
      case 'in-use':
        return {
          dot: 'bg-yellow-500 dark:bg-yellow-600',
          text: 'text-yellow-700 dark:text-yellow-300'
        };
      case 'maintenance':
        return {
          dot: 'bg-red-500 dark:bg-red-600',
          text: 'text-red-700 dark:text-red-300'
        };
      default:
        return {
          dot: 'bg-gray-500 dark:bg-gray-600',
          text: 'text-gray-700 dark:text-gray-300'
        };
    }
  };

  return (
    <div className="container mx-auto p-4 flex flex-col lg:flex-row gap-6">
      <div className="flex-1">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
                <i className="fas fa-charging-station mr-3 text-blue-500"></i>
                Estaciones de Carga
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {chargers.length} cargadores registrados
              </p>
            </div>

            <button
              onClick={onAddNew}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 shadow-md transition-all flex items-center dark:from-green-600 dark:to-emerald-700"
            >
              <i className="fas fa-plus mr-2" /> Agregar Cargador
            </button>
          </div>
        </div>

        {chargers.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow p-8 text-center">
            <div className="bg-gray-200 dark:bg-gray-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-charging-station text-2xl text-gray-500 dark:text-gray-200"></i>
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              No hay cargadores registrados
            </p>
            <button
              onClick={onAddNew}
              className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow transition-colors dark:bg-blue-700 dark:hover:bg-blue-600"
            >
              Agregar Primer Cargador
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {chargers.map((charger) => {
              const status = getStatusClasses(charger.status);
              return (
                <div
                  key={charger._id || charger.name}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden transition-all duration-300"
                >
                  {/* Encabezado de la tarjeta */}
                  <div
                    onClick={() => toggleExpand(charger._id || '')}
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
                      <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-lg text-xs font-medium">
                        {charger.type}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Potencia</p>
                        <p className="font-medium">{charger.power} kW</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Ubicación</p>
                        <p className="font-medium truncate">
                          {charger.location.lat.toFixed(4)}, {charger.location.lng.toFixed(4)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium flex items-center">
                        {expandedChargerId === charger._id ? 'Ocultar detalles' : 'Ver detalles'}
                        <i className={`fas ${expandedChargerId === charger._id ? 'fa-chevron-up' : 'fa-chevron-down'} ml-2 text-xs`} />
                      </button>
                    </div>
                  </div>

                  {/* Detalles expandidos */}
                  {expandedChargerId === charger._id && (
                    <div className="bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-700 p-4 transition-all duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Información detallada</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">ID:</span>
                              <span className="font-medium text-gray-800 dark:text-gray-200">{charger._id}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Fecha creación:</span>
                              <span className="font-medium text-gray-800 dark:text-gray-200">
                                {charger.createdAt ? new Date(charger.createdAt).toLocaleDateString() : 'Desconocida'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Estado actual:</span>
                              <span className="font-medium text-gray-800 dark:text-gray-200">
                                {charger.status === 'available' ? 'Operativo y desocupado' :
                                  charger.status === 'in-use' ? 'Ocupado actualmente' :
                                    'En mantenimiento - No disponible'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Ubicación exacta</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Latitud:</span>
                              <span className="font-medium text-gray-800 dark:text-gray-200">{charger.location.lat.toFixed(6)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Longitud:</span>
                              <span className="font-medium text-gray-800 dark:text-gray-200">{charger.location.lng.toFixed(6)}</span>
                            </div>
                            <div className="mt-2">
                              <button className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
                                Ver en mapa completo
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end gap-2">
                        <button className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg text-gray-800 dark:text-gray-200 text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                          <i className="fas fa-edit mr-2"></i> Editar
                        </button>
                        <button className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors">
                          <i className="fas fa-trash mr-2"></i> Eliminar
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

      {/* Columna derecha - Mapa */}
      <div className="w-full lg:w-2/5 mt-6 lg:mt-0">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow p-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
            <i className="fas fa-map-marker-alt mr-2 text-blue-500"></i> Mapa de Cargadores
          </h2>
          <ChargerMap chargers={chargers} />
        </div>
      </div>
    </div>
  );
}
