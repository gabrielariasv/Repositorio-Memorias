import React, { useState, useRef, useEffect } from "react";
import './DropdownSearch.css';

export type LocationOption = {
  label: string;
  lat: number;
  lon: number;
};

interface DropdownSearchProps {
  onSelect: (option: LocationOption) => void;
}

const DropdownSearch: React.FC<DropdownSearchProps> = ({ onSelect }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Effect: Cerrar dropdown al hacer click fuera del componente
   * 
   * Proceso:
   * 1. Detectar clicks en cualquier parte del documento
   * 2. Verificar si el click fue fuera del ref del dropdown
   * 3. Si fue fuera: cerrar el dropdown
   * 4. Cleanup: remover event listener al desmontar
   * 
   * Mejora UX: comportamiento estándar de dropdowns.
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /**
   * Effect: Búsqueda de ubicaciones con debounce usando Nominatim API
   * 
   * Proceso:
   * 1. Limpiar timeout anterior si existe (debounce)
   * 2. Si búsqueda > 2 caracteres: esperar 300ms
   * 3. Llamar Nominatim API (OpenStreetMap geocoding)
   * 4. Transformar resultados a formato LocationOption
   * 5. Actualizar lista de opciones
   * 6. Cleanup: limpiar timeout al cambiar búsqueda
   * 
   * Debounce de 300ms reduce llamadas innecesarias a la API.
   */
  useEffect(() => {
    // PASO 1: Limpiar timeout previo (debounce)
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // VALIDACIÓN: Mínimo 3 caracteres para buscar
    if (search.trim().length > 2) {
      setLoading(true);
      
      // PASO 2: Debounce de 300ms antes de llamar API
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          // PASO 3: Geocoding con Nominatim (OSM)
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(search)}`
          );
          const results = await response.json();
          
          // PASO 4: Transformar a formato LocationOption
          setOptions(
            results.map((r: { display_name: string; lat: string; lon: string }) => ({
              label: r.display_name,
              lat: parseFloat(r.lat),
              lon: parseFloat(r.lon),
            }))
          );
        } catch {
          setOptions([]);
        } finally {
          setLoading(false);
        }
      }, 300); // 300ms de delay
    } else {
      setOptions([]);
    }
    
    // PASO 5: Cleanup al cambiar búsqueda o desmontar
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [search]);

  return (
    <div className="dropdown" ref={ref}>
      <button
        className="dropbtn"
        type="button"
        onClick={() => setOpen((o) => !o)}
      >
        Buscar ubicación
      </button>
      <div
        id="myDropdown"
        className={`dropdown-content${open ? " show" : ""}`}
        style={{ width: "100%" }}
      >
        <input
          type="text"
          placeholder="Buscar..."
          id="myInput"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus={open}
        />
        {loading && (
          <div style={{ padding: "12px 16px", color: "#888" }}>Buscando...</div>
        )}
        {options.map((opt, idx) => (
          <a
            key={idx}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setOpen(false);
              setSearch(opt.label);
              onSelect(opt);
            }}
          >
            {opt.label}
          </a>
        ))}
        {!loading && options.length === 0 && search.length > 2 && (
          <div style={{ padding: "12px 16px", color: "#888" }}>
            No se encontraron resultados
          </div>
        )}
      </div>
    </div>
  );
};

export default DropdownSearch;