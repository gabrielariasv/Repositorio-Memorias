// src/App.tsx
import { useState } from 'react';
import ChargerList from './components/ChargerList'; // Ruta corregida
import ChargerForm from './components/ChargerForm'; // Ruta corregida
import { Charger, ChargerType } from './models/Charger';

function App() {
  const [chargers, setChargers] = useState<Charger[]>([
  {
    _id: "1",
    name: "Cargador Principal",
    type: ChargerType.CCS, // Usa el enum en lugar del string
    power: 150,
    location: { lat: 40.416775, lng: -3.703790 },
    status: "available",
    createdAt: new Date()
  }
]);
  
  const [showForm, setShowForm] = useState(false);

  const addCharger = (charger: Omit<Charger, '_id' | 'createdAt'>) => {
    const newCharger: Charger = {
      ...charger,
      _id: Math.random().toString(36).substr(2, 9), // ID temporal
      createdAt: new Date()
    };
    setChargers([...chargers, newCharger]);
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {showForm ? (
        <div className="max-w-3xl mx-auto py-8">
          <ChargerForm 
            onSubmit={addCharger} 
            onCancel={() => setShowForm(false)} 
          />
        </div>
      ) : (
        <ChargerList 
          chargers={chargers} 
          onAddNew={() => setShowForm(true)} 
        />
      )}
    </div>
  );
}

export default App;