import { useContext } from 'react';
import { EvVehicleContext } from './EvVehicleContextDef';

// Hook para acceder al contexto de vehículos eléctricos
export const useEvVehicle = () => {
  return useContext(EvVehicleContext);
};
