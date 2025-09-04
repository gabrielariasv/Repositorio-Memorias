import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/useAuth';

interface ChargingSession {
  _id: string;
  startTime: string;
  endTime: string;
  energyDelivered: number;
  duration: number;
  chargerId: {
    name: string;
    location: {
      coordinates: number[];
    };
  };
}

const VehicleDashboard: React.FC = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [chargingHistory, setChargingHistory] = useState<ChargingSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserVehicles = React.useCallback(async () => {
    try {
      // Obtener vehículos del usuario
      const response = await fetch('/api/vehicles/user');
      const data = await response.json();
      setVehicles(data);
      
      if (data.length > 0) {
        setSelectedVehicle(data[0]);
        fetchChargingHistory(data[0]._id);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.vehicles && user.vehicles.length > 0) {
      fetchUserVehicles();
    }
  }, [user, fetchUserVehicles]);

  const fetchChargingHistory = async (vehicleId: string) => {
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}/charging-history`);
      const data = await response.json();
      setChargingHistory(data);
    } catch (error) {
      console.error('Error fetching charging history:', error);
    }
  };

  const handleVehicleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const vehicleId = e.target.value;
    const vehicle = vehicles.find(v => v._id === vehicleId);
    if (vehicle) {
      setSelectedVehicle(vehicle);
      fetchChargingHistory(vehicleId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Mis Vehículos</h1>
          <p className="text-gray-600">Bienvenido, {user?.name}</p>
        </div>

        {vehicles.length > 0 ? (
          <>
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Seleccionar Vehículo</h2>
              <select
                className="w-full p-2 border border-gray-300 rounded"
                value={selectedVehicle?._id || ''}
                onChange={handleVehicleChange}
              >
                {vehicles.map(vehicle => (
                  <option key={vehicle._id} value={vehicle._id}>
                    {vehicle.model} - {vehicle.chargerType}
                  </option>
                ))}
              </select>
            </div>

            {selectedVehicle && (
              <div className="bg-white shadow rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Información del Vehículo</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p><span className="font-semibold">Modelo:</span> {selectedVehicle.model}</p>
                    <p><span className="font-semibold">Tipo de cargador:</span> {selectedVehicle.chargerType}</p>
                  </div>
                  <div>
                    <p><span className="font-semibold">Capacidad de batería:</span> {selectedVehicle.batteryCapacity} kWh</p>
                    <p><span className="font-semibold">Nivel de carga actual:</span> {selectedVehicle.currentChargeLevel}%</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Historial de Carga</h2>
              {chargingHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cargador</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Energía (kWh)</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duración (min)</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {chargingHistory.map(session => (
                        <tr key={session._id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {new Date(session.startTime).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {session.chargerId.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {session.energyDelivered.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {session.duration.toFixed(0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No hay historial de carga para este vehículo.</p>
              )}
            </div>
          </>
        ) : (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold mb-4">No tienes vehículos registrados</h2>
            <p className="text-gray-600">Contacta con el administrador para registrar tu vehículo.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VehicleDashboard;