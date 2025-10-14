// src/models/Charger.ts
// Tipos de cargador compatibles con el backend
export enum ChargerType {
  TYPE1 = 'Type1',
  TYPE2 = 'Type2',
  CCS = 'CCS',
  CHADEMO = 'CHAdeMO',
  TESLA = 'Tesla'
}

export const CHARGER_TYPE_LABELS: Record<ChargerType, string> = {
  [ChargerType.TYPE1]: 'J1772 (Tipo 1)',
  [ChargerType.TYPE2]: 'Mennekes (Tipo 2)',
  [ChargerType.CCS]: 'CCS (Combo)',
  [ChargerType.CHADEMO]: 'CHAdeMO',
  [ChargerType.TESLA]: 'Tesla Supercharger'
};

export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export interface Charger {
  _id: string;
  name: string;
  chargerType: string;
  powerOutput: number;
  status: 'available' | 'occupied' | 'maintenance';
  location: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  createdAt?: Date;
}