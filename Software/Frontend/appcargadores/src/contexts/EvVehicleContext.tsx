import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { EvVehicleContext, EvVehicle, EvVehicleContextValue } from './EvVehicleContextDef';

export const EvVehicleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<EvVehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVehicles = useCallback(async () => {
    if (!user?._id) {
      setVehicles([]);
      setSelectedVehicleId(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/vehicles/user/${user._id}`);
      if (!response.ok) {
        throw new Error('No se pudieron obtener los vehículos del usuario');
      }

      const data = await response.json();
      setVehicles(Array.isArray(data) ? data : []);

      if (Array.isArray(data) && data.length > 0) {
        setSelectedVehicleId(prev => {
          if (prev && data.some(vehicle => vehicle._id === prev)) {
            return prev;
          }
          return data[0]._id;
        });
      } else {
        setSelectedVehicleId(null);
      }
    } catch (err: any) {
      console.error('Error fetching vehicles:', err);
      setError(err?.message ?? 'Error desconocido al obtener vehículos');
      setVehicles([]);
      setSelectedVehicleId(null);
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const selectVehicle = useCallback((vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
  }, []);

  const value = useMemo<EvVehicleContextValue>(() => {
    const selectedVehicle = vehicles.find(vehicle => vehicle._id === selectedVehicleId) ?? null;

    return {
      vehicles,
      selectedVehicle,
      loading,
      error,
      selectVehicle,
      refreshVehicles: fetchVehicles,
    };
  }, [vehicles, selectedVehicleId, loading, error, selectVehicle, fetchVehicles]);

  return <EvVehicleContext.Provider value={value}>{children}</EvVehicleContext.Provider>;
};

