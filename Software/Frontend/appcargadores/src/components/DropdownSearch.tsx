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
    if (search.trim().length > 2) {
      setLoading(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(search)}`
          );
          const results = await response.json();
          setOptions(
            results.map((r: any) => ({
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
      }, 300);
    } else {
      setOptions([]);
    }
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