import { Charger } from '../models/Charger';
import { useNavigate } from 'react-router-dom';

interface ChargerDetailProps {
  charger: Charger;
  onClose: () => void;
}

export default function ChargerDetail({ charger, onClose }: ChargerDetailProps) {
  const navigate = useNavigate();
  
  // Función para obtener el texto de estado
  const getStatusText = () => {
    switch (charger.status) {
      case 'available': return 'Desocupado';
      case 'in-use': return 'Ocupado';
      case 'maintenance': return 'Mantenimiento';
      default: return 'Desconocido';
    }
  };

  // Función para obtener el color de estado
  const getStatusColor = () => {
    switch (charger.status) {
      case 'available': 
        return 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400';
      case 'in-use': 
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400';
      case 'maintenance': 
        return 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400';
      default: 
        return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-gray-900/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              <i className="fas fa-charging-station mr-3 text-blue-500"></i>
              {charger.name}
            </h2>
            <button 
              onClick={onClose}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Tipo</p>
                <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg">
                  {charger.type}
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Potencia</p>
                <div className="bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-lg">
                  {charger.power} kW
                </div>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Estado</p>
              <div className={`px-3 py-1.5 rounded-lg ${getStatusColor()}`}>
                {getStatusText()}
              </div>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Ubicación</p>
              <div className="bg-gray-100 dark:bg-gray-700/50 p-3 rounded-lg">
                <div className="text-gray-800 dark:text-gray-200">
                  <span className="font-medium">Lat:</span> {charger.location.lat.toFixed(6)}
                </div>
                <div className="text-gray-800 dark:text-gray-200">
                  <span className="font-medium">Lng:</span> {charger.location.lng.toFixed(6)}
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => {
                navigate('/thingspeak');
                onClose();
              }}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg hover:from-blue-700 hover:to-indigo-800 shadow-md transition-all flex items-center justify-center"
            >
              <i className="fas fa-bolt mr-2"></i> Corriente
            </button>
            
            <button
              onClick={() => {
                navigate('/thingspeak-disp');
                onClose();
              }}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-fuchsia-700 text-white rounded-lg hover:from-purple-700 hover:to-fuchsia-800 shadow-md transition-all flex items-center justify-center"
            >
              <i className="fas fa-car mr-2"></i> Ocupación
            </button>
          </div>
          
          <button 
            onClick={onClose}
            className="w-full mt-4 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}