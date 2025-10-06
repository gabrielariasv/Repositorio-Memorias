import React, { useState, useRef, useEffect } from "react";
import './DropdownSearch.css';
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
    <div className="dropdown" ref={ref}>
      <input
        className="dropbtn"
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
        <div className={`dropdown-content show`} style={{ width: "100%" }}>
          {loading ? (
            <div className="p-2 text-center text-gray-500">Buscando...</div>
          ) : mode === 'location' ? (
            options.length > 0 ? (
              options.map(opt => (
                <div
                  key={opt.label}
                  className="dropdown-item"
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
                </div>
              ))
            ) : (
              <div className="p-2 text-gray-500">No se encontraron ubicaciones</div>
            )
          ) : (
            suggestions.length > 0 ? (
              suggestions.map(charger => (
                <div
                  key={charger._id}
                  className="dropdown-item"
                  onClick={() => {
                    setSearch(charger.name);
                    setOpen(false);
                    setSuggestions([charger]);
                    onResults([charger]);
                  }}
                >
                  {charger.name}
                </div>
              ))
            ) : (
              <div className="p-2 text-gray-500">No se encontraron cargadores</div>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default ChargerSearch;
