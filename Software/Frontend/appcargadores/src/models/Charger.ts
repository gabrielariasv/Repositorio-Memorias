// src/models/Charger.ts
// Asegúrate de exportar el enum correctamente
export enum ChargerType {
  TYPE1 = "J1772 (Tipo 1)",
  TYPE2 = "Mennekes (Tipo 2)",
  CCS = "CCS (Combo)",
  CHADEMO = "CHAdeMO",
  TESLA = "Tesla Supercharger"
}

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