import { useContext } from 'react';
import { EvVehicleContext } from './EvVehicleContextDef';

export const useEvVehicle = () => {
  return useContext(EvVehicleContext);
};
