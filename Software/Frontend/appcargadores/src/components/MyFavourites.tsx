import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/useAuth';

interface MyFavouritesProps {
  userId: string;
  onGoToReserve: (chargerId: string) => void;
  refreshKey?: number;
}

// Componente: muestra y gestiona la lista de cargadores favoritos del usuario
const MyFavourites: React.FC<MyFavouritesProps> = ({ userId, onGoToReserve, refreshKey }) => {
  const { token: authTokenFromContext } = useAuth() as any;
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const getToken = () => {
    // Preferir token del contexto si está disponible, sino usar localStorage
    return authTokenFromContext ?? localStorage.getItem('token');
  };

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/favourites/${userId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
        }
      });
      if (!res.ok) {
        throw new Error('No se pudieron obtener favoritos');
      }
      const data = await res.json();
      setFavorites(Array.isArray(data.favoriteStations) ? data.favoriteStations : []);
    } catch (err) {
      console.error('Error fetching favourites:', err);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchFavorites();
  }, [userId, refreshKey]);

  const handleRemove = async (stationId: string) => {
    if (!confirm('¿Eliminar esta estación de tus favoritos?')) return;
    setRemovingId(stationId);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/favourites/${userId}/${stationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
        }
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error || 'No se pudo eliminar de favoritos');
        return;
      }
      // Refrescar lista local
      await fetchFavorites();
    } catch (err) {
      console.error('Error removing favourite:', err);
      alert('Ocurrió un error al eliminar');
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-6"><div className="h-8 w-8 animate-spin rounded-full border-t-2 border-indigo-600" /></div>;
  }

  if (!favorites.length) {
    return <div className="p-4 text-gray-600 dark:text-gray-300 text-justify">No tienes estaciones favoritas. Para agregar
    estaciones a tus favoritas, ve al mapa (o al calendario de reserva), selecciona la estación y presiona el ícono de estrella en la estación que desees.
    </div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-gray-800 dark:text-gray-100">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-300">Nombre de la estación</th>
            <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-300">Dirección (posición)</th>
            <th className="px-4 py-2 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-300">Acciones</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {favorites.map((station: any) => {
            const lat = station.location?.coordinates?.[1] ?? station.location?.lat ?? null;
            const lng = station.location?.coordinates?.[0] ?? station.location?.lng ?? null;
            const posStr = (lat !== null && lng !== null) ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : 'N/D';
            return (
              <tr key={station._id}>
                <td className="px-4 py-3">{station.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{posStr}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      className="w-32 h-15 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                      onClick={() => onGoToReserve(station._id)}
                    >
                      Ir a calendario
                    </button>
                    <button
                      className="w-32 h-15 px-3 py-1.5 bg-red-500 text-white text-sm rounded hover:bg-red-600 disabled:opacity-50"
                      onClick={() => handleRemove(station._id)}
                      disabled={removingId === station._id}
                    >
                      {removingId === station._id ? 'Eliminando...' : 'Quitar de Favoritos'}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default MyFavourites;
