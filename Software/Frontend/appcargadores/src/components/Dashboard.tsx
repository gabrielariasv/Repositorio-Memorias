import React from 'react';
import { useAuth } from '../contexts/useAuth';
import ChargerList from './ChargerList';
import ChargerForm from './ChargerForm';
import VehicleDashboard from './VehicleDashboard';
//import AdminDashboard from './AdminDashboard';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  // Renderizar dashboard según el rol del usuario
  switch (user.role) {
    case 'app_admin':
      return /*<AdminDashboard />*/;
    case 'station_admin':
      return <StationAdminDashboard />;
    case 'ev_user':
      return <VehicleDashboard />;
    default:
      return (
        <div className="p-4">
          <h1 className="text-2xl font-bold">Rol no reconocido</h1>
        </div>
      );
  }
};

// Dashboard para administradores de estaciones
const StationAdminDashboard: React.FC = () => {
  const [showForm, setShowForm] = React.useState(false);
  const { user } = useAuth();

  // En una implementación real, obtendrías estos datos de la API
  const [chargers, setChargers] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (user?.ownedStations && user.ownedStations.length > 0) {
      // Cargar los cargadores del usuario
      fetchUserChargers();
    }
  }, [user]);

  const fetchUserChargers = async () => {
    try {
      // Aquí harías una llamada a la API para obtener los cargadores del usuario
      // Por ahora usamos datos de ejemplo
      const response = await fetch('/api/chargers/user');
      const data = await response.json();
      setChargers(data);
    } catch (error) {
      console.error('Error fetching chargers:', error);
    }
  };

  const addCharger = (charger: any) => {
    // En una implementación real, enviarías esto a la API
    const newCharger = {
      ...charger,
      _id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date()
    };
    setChargers([...chargers, newCharger]);
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-4 bg-white shadow">
        <h1 className="text-2xl font-bold">Panel de Administración de Estaciones</h1>
        <p className="text-gray-600">Bienvenido, {user?.name}</p>
      </div>
      
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
};

export default Dashboard;