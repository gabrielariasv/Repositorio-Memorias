import React, { useState, useRef, useEffect } from "react";
import { Charger } from '../models/Charger';

export type LocationOption = {
  label: string;
  lat: number;
  lon: number;
};

interface ChargerSearchProps {
  chargers: Charger[];
  mode: 'name' | 'location';
  onResults: (results: Charger[]) => void;
}

const fuseOptions = {
  keys: ['name'],
  threshold: 0.4,
};

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const ChargerSearch: React.FC<ChargerSearchProps> = ({ chargers, mode, onResults }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Charger[]>(chargers);
  const ref = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSuggestions(chargers);
  }, [chargers]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (search.trim().length > 0) {
      setLoading(true);
      searchTimeoutRef.current = setTimeout(async () => {
        if (mode === 'name') {
          // Fuzzy search by name
          const Fuse = (await import('fuse.js')).default;
          const fuse = new Fuse(chargers, fuseOptions);
          const results = fuse.search(search).map(r => r.item);
          setSuggestions(results);
          onResults(results);
        } else if (mode === 'location') {
          // Geocode location and sort chargers by distance
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(search)}`
            );
            const results = await response.json();
            setOptions(
              results.map((r: { display_name: string; lat: string; lon: string }) => ({
                label: r.display_name,
                lat: parseFloat(r.lat),
                lon: parseFloat(r.lon),
              }))
            );
            if (results.length > 0) {
              const { lat, lon } = results[0];
              const sorted = [...chargers].sort((a, b) => {
                const aDist = getDistanceFromLatLonInKm(
                  parseFloat(lat),
                  parseFloat(lon),
                  a.location.coordinates[1],
                  a.location.coordinates[0]
                );
                const bDist = getDistanceFromLatLonInKm(
                  parseFloat(lat),
                  parseFloat(lon),
                  b.location.coordinates[1],
                  b.location.coordinates[0]
                );
                return aDist - bDist;
              });
              setSuggestions(sorted);
              onResults(sorted);
            }
          } catch {
            setOptions([]);
            setSuggestions(chargers);
            onResults(chargers);
          }
        }
        setLoading(false);
      }, 300);
    } else {
      setSuggestions(chargers);
      onResults(chargers);
      setOptions([]);
    }
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [search, mode, chargers, onResults]);

  return (
    <div className="relative w-full" ref={ref}>
      <input
        className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
        type="text"
        placeholder={mode === 'name' ? 'Buscar por nombre...' : 'Buscar por ubicación...'}
        value={search}
        onChange={e => {
          setSearch(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && search.trim().length > 0 && (
        <div className="absolute z-50 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl">
          {loading ? (
            <div className="p-3 text-center text-gray-600 dark:text-gray-300">Buscando...</div>
          ) : mode === 'location' ? (
            options.length > 0 ? (
              options.map(opt => (
                <button
                  type="button"
                  key={opt.label}
                  className="block w-full text-left px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700/60 focus:outline-none"
                  onClick={() => {
                    setSearch(opt.label);
                    setOpen(false);
                    // Ordenar por esta ubicación
                    const sorted = [...chargers].sort((a, b) => {
                      const aDist = getDistanceFromLatLonInKm(
                        opt.lat,
                        opt.lon,
                        a.location.coordinates[1],
                        a.location.coordinates[0]
                      );
                      const bDist = getDistanceFromLatLonInKm(
                        opt.lat,
                        opt.lon,
                        b.location.coordinates[1],
                        b.location.coordinates[0]
                      );
                      return aDist - bDist;
                    });
                    setSuggestions(sorted);
                    onResults(sorted);
                  }}
                >
                  {opt.label}
                </button>
              ))
            ) : (
              <div className="p-3 text-sm text-gray-600 dark:text-gray-300">No se encontraron ubicaciones</div>
            )
          ) : suggestions.length > 0 ? (
            suggestions.map(charger => (
              <button
                type="button"
                key={charger._id}
                className="block w-full text-left px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700/60 focus:outline-none"
                onClick={() => {
                  setSearch(charger.name);
                  setOpen(false);
                  setSuggestions([charger]);
                  onResults([charger]);
                }}
              >
                {charger.name}
              </button>
            ))
          ) : (
            <div className="p-3 text-sm text-gray-600 dark:text-gray-300">No se encontraron cargadores</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChargerSearch;
