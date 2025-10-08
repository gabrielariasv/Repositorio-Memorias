import { createContext } from 'react';

export interface EvVehicle {
  _id: string;
  model: string;
  chargerType: string;
  currentChargeLevel?: number;
  batteryCapacity?: number;
  [key: string]: any;
}

export interface EvVehicleContextValue {
  vehicles: EvVehicle[];
  selectedVehicle: EvVehicle | null;
  loading: boolean;
  error: string | null;
  selectVehicle: (vehicleId: string) => void;
  refreshVehicles: () => Promise<void>;
}

export const EvVehicleContext = createContext<EvVehicleContextValue | undefined>(undefined);
