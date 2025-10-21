import React, { useState, useEffect, useRef } from 'react'; // <-- add useRef
// FullCalendar removido — usamos inputs nativos en su lugar

interface ChargerOptionsModalProps {
  onClose: () => void;
  user: any;
  selectedVehicle: any;
  fetchReservations: (vehicleId: string) => Promise<void>;
  onReserveCharger: () => void;
  onCenterCharger?: (coords: { lat: number; lng: number }) => void;
  externalSelectedCharger?: any; // <-- nuevo prop opcional
}

const ChargerOptionsModal: React.FC<ChargerOptionsModalProps> = ({ onClose, user, selectedVehicle, fetchReservations, onCenterCharger, externalSelectedCharger }) => {
  const [loadingFind, setLoadingFind] = useState(false);
  const [loadingReserve, setLoadingReserve] = useState(false);
  // indica que el flujo manual de "Reservar un cargador" está activo (botón "apretado")
  const [isManualMode, setIsManualMode] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [proposal, setProposal] = useState<any>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showChargerList, setShowChargerList] = useState(false);
  const [chargersList, setChargersList] = useState<any[]>([]);
  const [selectedCharger, setSelectedCharger] = useState<any>(null);
  const [preferences, setPreferences] = useState({
    distancia: 0.5,
    costo: 0.5,
    tiempoCarga: 0.5,
    demora: 0.5,
  });
  const [showPreferences, setShowPreferences] = useState(false);
  // nuevo: porcentaje objetivo de carga (por defecto 100%)
  const [targetPercent, setTargetPercent] = useState<number>(100);
  // ref para evitar bucles: valores posibles 'target-user', 'duration-user', 'target-program', 'duration-program', null
  const lastChangeRef = useRef<string | null>(null);

  // Nuevo: helper para formatear fecha para input datetime-local y obtener "ahora" redondeado
  const formatLocalDatetime = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const min = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };
  const getNowRounded = (stepMinutes = 5) => {
    const d = new Date();
    d.setSeconds(0, 0);
    const m = d.getMinutes();
    const rem = m % stepMinutes;
    if (rem !== 0) d.setMinutes(m + (stepMinutes - rem));
    return formatLocalDatetime(d);
  };

  // Nuevo estado: min permitido para el input (no seleccionar pasado)
  const [manualStartISO, setManualStartISO] = useState<string>('');
  const [manualDurationMin, setManualDurationMin] = useState<number>(60);
  const [chargerReservations, setChargerReservations] = useState<any[]>([]);
  const [minStartISO, setMinStartISO] = useState<string>('');

  // Encuéntrame un cargador automático usando el endpoint de recomendación
  const handleFind = async () => {
    setIsManualMode(false);
    setLoadingFind(true);
    setFeedback(null);
    setProposal(null);
    setShowConfirm(false);
    setShowChargerList(false);
    try {
      if (!selectedVehicle || !user) throw new Error('Selecciona un vehículo primero.');
      const batteryCapacity = selectedVehicle.batteryCapacity;
      const currentChargeLevel = selectedVehicle.currentChargeLevel;
      const energyNeeded = batteryCapacity * (1 - currentChargeLevel / 100);
      if (energyNeeded <= 0) throw new Error('El vehículo ya está completamente cargado.');

      // Coordenadas fijas de Santiago, puedes cambiarlas por la ubicación real del usuario
      const latitude = -33.4489;
      const longitude = -70.6693;
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        vehicleId: selectedVehicle._id,
        currentChargeLevel: currentChargeLevel.toString(),
        distancia: preferences.distancia.toString(),
        costo: preferences.costo.toString(),
        tiempoCarga: preferences.tiempoCarga.toString(),
        demora: preferences.demora.toString(),
        targetCharge: String(targetPercent) // <-- nuevo parámetro enviado al backend
      });
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/chargers/recommendation?${params}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'No se pudo obtener recomendación.');
      }
      const data = await res.json();
      if (!data.best) throw new Error('No se encontró un cargador disponible para recomendar.');
      const { charger, tCarga, tDemora } = data.best;
      // Calcular tiempos de inicio y fin
      const now = new Date();
      const startTime = new Date(now.getTime() + (tDemora * 60 * 1000));
      const endTime = new Date(startTime.getTime() + (tCarga * 60 * 1000));
      setProposal({
        charger,
        startTime,
        endTime,
        power: charger.powerOutput,
        chargeTimeHours: tCarga / 60
      });
      setShowConfirm(true);
    } catch (e: any) {
      setFeedback(e.message || 'No se pudo realizar la reserva.');
      setTimeout(() => setFeedback(null), 2500);
    } finally {
      setLoadingFind(false);
    }
  };

  // Reservar manualmente
  const handleManual = async () => {
    // activar el modo manual (botón queda "apretado")
    setIsManualMode(true);
    setLoadingReserve(true);
    setProposal(null);
    setShowConfirm(false);
    setFeedback(null);
    try {
      const chargersRes = await fetch(`${import.meta.env.VITE_API_URL}/api/chargers/nearby?latitude=-33.4489&longitude=-70.6693&maxDistance=100000`);
      const chargers = await chargersRes.json();
      setChargersList(chargers);
      const now = getNowRounded();
      setManualStartISO(now);
      setMinStartISO(now);
      setShowChargerList(true);
    } catch (e) {
      // si falla la carga, salir del modo manual
      setIsManualMode(false);
      setFeedback('No se pudieron cargar los cargadores.');
    } finally {
      setLoadingReserve(false);
    }
  };

  // Confirmar reserva
  const confirmReservation = async () => {
    if (!proposal) return;
    setLoadingReserve(true);
    setFeedback(null);
    try {
      const { charger, startTime, endTime, chargeTimeHours } = proposal;
      const reservationRes = await fetch(`${import.meta.env.VITE_API_URL}/api/calendar/reservation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: selectedVehicle._id,
          chargerId: charger._id,
          userId: user._id,
          startTime,
          endTime,
          calculatedEndTime: endTime,
          status: 'upcoming',
          estimatedChargeTime: Math.round(chargeTimeHours * 60),
          bufferTime: 0
        })
      });
      if (reservationRes.ok) {
        // reserva exitosa: salir del modo manual
        setIsManualMode(false);
        await fetchReservations(selectedVehicle._id);
        setFeedback('¡Reserva realizada exitosamente!');
        setShowConfirm(false);
        setProposal(null);
        setTimeout(() => {
          setFeedback(null);
          onClose();
        }, 1800);
      } else {
        setFeedback('No se pudo realizar la reserva.');
      }
    } catch (e) {
      setFeedback('No se pudo realizar la reserva.');
    } finally {
      setLoadingReserve(false);
    }
  };

  // cargar reservas del cargador seleccionado para mostrarlas en el calendario
  React.useEffect(() => {
    if (!selectedCharger) return;
    let mounted = true;
    (async () => {
      try {
        const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/chargers/${selectedCharger._id}/reservations`);
        const existing = resp.ok ? await resp.json() : [];
        if (!mounted) return;
        const events = existing.map((r: any) => ({
          id: r._id,
          title: r.status === 'active' ? 'En curso' : 'Reservado',
          start: r.startTime,
          end: r.endTime,
          color: r.status === 'active' ? '#10B981' : '#8B5CF6' // verde / morado
        }));
        setChargerReservations(events);
      } catch (err) {
        setChargerReservations([]);
      }
    })();
    return () => { mounted = false; };
  }, [selectedCharger]);

  // Al montar y para mantener el min actualizado, inicializar valores
  useEffect(() => {
    const now = getNowRounded();
    setMinStartISO(now);
    // sólo inicializamos manualStartISO si está vacío
    setManualStartISO(prev => prev || now);
    // actualizar min cada minuto para mantenerlo conservador
    const t = setInterval(() => setMinStartISO(getNowRounded()), 60_000);
    return () => clearInterval(t);
  }, []);

  // cuando se recibe una estación desde el mapa, preseleccionarla y abrir el flujo manual
  React.useEffect(() => {
    if (!externalSelectedCharger) return;
    (async () => {
      // activar modo manual y mostrar la UI de selección
      setIsManualMode(true);
      setProposal(null);
      setShowConfirm(false);
      setFeedback(null);
      setShowChargerList(true);
      setSelectedCharger(externalSelectedCharger);
      // fijar fecha/hora por defecto (ahora redondeado)
      const now = getNowRounded();
      setManualStartISO(now);
      setMinStartISO(now);

      // intentar cargar estaciones cercanas alrededor de la estación seleccionada
      try {
        const coords = externalSelectedCharger?.location?.coordinates;
        let lat: number | undefined, lng: number | undefined;
        if (Array.isArray(coords) && coords.length >= 2) { lat = coords[1]; lng = coords[0]; }
        else if (externalSelectedCharger?.location?.lat != null && externalSelectedCharger?.location?.lng != null) {
          lat = externalSelectedCharger.location.lat;
          lng = externalSelectedCharger.location.lng;
        }
        if (typeof lat === 'number' && typeof lng === 'number') {
          // buscar dentro de 5000m (ajustable)
          const q = new URLSearchParams({ latitude: String(lat), longitude: String(lng), maxDistance: '5000' });
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/chargers/nearby?${q}`);
          if (res.ok) {
            const list = await res.json();
            // asegurar que la estación seleccionada esté al inicio y no duplicada
            const merged = list.reduce((acc: any[], c: any) => {
              if (!acc.some(a => a._id === c._id)) acc.push(c);
              return acc;
            }, [] as any[]);
            const exists = merged.some((c:any) => c._id === externalSelectedCharger._id);
            const finalList = exists ? merged : [externalSelectedCharger, ...merged];
            setChargersList(finalList);
            return;
          }
        }
        // si no hay coords o fallo, al menos incluir la estación seleccionada
        setChargersList(prev => {
          const exists = prev.some(c => c._id === externalSelectedCharger._id);
          return exists ? prev : [externalSelectedCharger, ...prev];
        });
      } catch (err) {
        // si falla la llamada, mostramos solo la estación seleccionada
        setChargersList(prev => {
          const exists = prev.some(c => c._id === externalSelectedCharger._id);
          return exists ? prev : [externalSelectedCharger, ...prev];
        });
        setFeedback('No se pudieron cargar cargadores cercanos. Mostrando la estación seleccionada.');
        setTimeout(() => setFeedback(null), 2500);
      }
      // centrar el mapa también si la prop onCenterCharger está disponible
      if (onCenterCharger) {
        const coords = externalSelectedCharger?.location?.coordinates;
        if (Array.isArray(coords) && coords.length >= 2) {
          onCenterCharger({ lat: coords[1], lng: coords[0] });
        } else if (externalSelectedCharger?.location?.lat != null && externalSelectedCharger?.location?.lng != null) {
          onCenterCharger({ lat: externalSelectedCharger.location.lat, lng: externalSelectedCharger.location.lng });
        }
      }
    })();
   }, [externalSelectedCharger]);

  // REEMPLAZADO: al cambiar cargador/vehículo/target -> calcular minutosNeeded y actualizar SOLO manualDurationMin
  useEffect(() => {
	  if (!selectedVehicle || !selectedCharger) return;
	  const current = Number(selectedVehicle.currentChargeLevel || 0);
	  const batteryCapacity = Number(selectedVehicle.batteryCapacity || 0);
	  const target = Number(targetPercent);
	  if (isNaN(batteryCapacity) || isNaN(current) || isNaN(target)) return;

	  const energyNeededKWh = batteryCapacity * (target / 100 - current / 100);
	  if (energyNeededKWh <= 0) return;

	  const power = Number(selectedCharger.powerOutput || selectedCharger.power || 0);
	  if (power > 0) {
		const minutesNeeded = Math.max(1, Math.round((energyNeededKWh / power) * 60));
		// si el último cambio fue hecho por el usuario en duration, no sobrescribimos
		if (lastChangeRef.current === 'duration-user') {
		  // limpiar la marca para permitir futuras actualizaciones automáticas
		  lastChangeRef.current = null;
		  return;
		}
		// marcar que este cambio viene por target -> programático de duración
		lastChangeRef.current = 'target-program';
		setManualDurationMin(prev => {
		  // heurística: reemplazar solo si es default o muy grande
		  if (prev === 60 || prev > 24 * 60) return minutesNeeded;
		  return minutesNeeded; // aquí preferimos mostrar la estimación al usuario antes de proponer
		});
		// limpiar marca en siguiente tick
		setTimeout(() => { if (lastChangeRef.current === 'target-program') lastChangeRef.current = null; }, 0);
	  }
	}, [selectedCharger, selectedVehicle, targetPercent]);

	// NUEVO: cuando manualDurationMin cambia por acción del usuario, recalcula targetPercent (si procede)
	useEffect(() => {
	  if (!selectedVehicle || !selectedCharger) return;
	  // si el último cambio fue 'target-user' evitamos sobreescribir (el usuario acaba de tocar target)
	  if (lastChangeRef.current === 'target-user') {
		lastChangeRef.current = null;
		return;
	  }
	  // Si fue un cambio programático en duración, no recalculamos target para no interferir
	  if (lastChangeRef.current === 'target-program') { lastChangeRef.current = null; return; }

	  const current = Number(selectedVehicle.currentChargeLevel || 0);
	  const batteryCapacity = Number(selectedVehicle.batteryCapacity || 0);
	  const power = Number(selectedCharger.powerOutput || selectedCharger.power || 0);
	  const minutes = Number(manualDurationMin || 0);
	  if (isNaN(batteryCapacity) || isNaN(current) || isNaN(power) || power <= 0) return;

	  const energyDelivered = (power * (minutes / 60)); // kWh
	  const newTargetFloat = current + (energyDelivered / Math.max(1, batteryCapacity)) * 100;
	  const newTarget = Math.min(100, Math.max(Math.ceil(current + 1), Math.round(newTargetFloat)));
	  if (!isNaN(newTarget) && newTarget !== targetPercent) {
		// marcar que la actualización viene de duración del usuario (programática aquí)
		lastChangeRef.current = 'duration-program';
		setTargetPercent(newTarget);
		setTimeout(() => { if (lastChangeRef.current === 'duration-program') lastChangeRef.current = null; }, 0);
	  }
	}, [manualDurationMin, selectedCharger, selectedVehicle]);

  // cuando el usuario selecciona un rango en el calendario
  const handleCalendarSelect = (selectInfo: any) => {
    const start = selectInfo.start;
    const end = selectInfo.end;
    // actualizar inputs manuales para mostrar selección
    const pad = (n: number) => n.toString().padStart(2, '0');
    const toLocalDatetimeInput = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = pad(d.getMonth() + 1);
      const dd = pad(d.getDate());
      const hh = pad(d.getHours());
      const min = pad(d.getMinutes());
      return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    };
    setManualStartISO(toLocalDatetimeInput(start));
    setManualDurationMin(Math.max(5, Math.round((end.getTime() - start.getTime()) / 60000)));
  };

  // calcular mínimo permitido para el target (1% por encima del nivel actual)
  const minAllowedPercent = Math.ceil(Number(selectedVehicle?.currentChargeLevel ?? 0) + 1);

  // Renderizado
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-gray-200 dark:border-gray-700 w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Reservar Cargador</h2>
        {/* Botón de cerrar eliminado */}
      </div>

      {/* Contenedor principal: izquierda = opciones/preferencias/selección, derecha = propuesta */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Columna izquierda: controles y selección (ocupa 2 columnas en md) */}
        <div className="md:col-span-2">
          {/* Botones de acción */}
          <div className="flex gap-2 mb-4">
            <button
              className="flex-1 py-3 px-6 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow transition-colors duration-200 disabled:opacity-60"
              onClick={handleFind}
              disabled={loadingFind}
            >{loadingFind ? 'Buscando...' : 'Encuéntrame un cargador'}</button>
            <button
              // el botón aparece "apretado" cuando isManualMode === true
              className={`flex-1 py-3 px-6 rounded font-semibold shadow transition-colors duration-200 disabled:opacity-60 ${
                isManualMode
                  ? 'bg-indigo-700 text-white shadow-inner'
                  : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700'
              }`}
              onClick={handleManual}
              disabled={loadingReserve}
            >{loadingReserve ? 'Cargando...' : 'Reservar un cargador'}</button>
          </div>

          {/* Control targetPercent */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Cargar hasta (%)</label>
            <div className="grid grid-cols-7 gap-2">
              <button
                type="button"
                className="w-full px-2 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
                onClick={() => { lastChangeRef.current = 'target-user'; setTargetPercent(minAllowedPercent); }}
                aria-label="Ir a mínimo"
              >min</button>

              <button
                type="button"
                className="w-full px-2 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
                onClick={() => { lastChangeRef.current = 'target-user'; setTargetPercent(p => Math.max(minAllowedPercent, Number(p) - 10)); }}
                aria-label="Disminuir 10"
              >-10</button>

              <button
                type="button"
                className="w-full px-2 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
                onClick={() => { lastChangeRef.current = 'target-user'; setTargetPercent(p => Math.max(minAllowedPercent, Number(p) - 1)); }}
                aria-label="Disminuir 1"
              >-</button>

              <input
                type="text"
                value={String(targetPercent)}
                onChange={e => {
                  lastChangeRef.current = 'target-user';
                  const raw = e.target.value.replace(/[^\d]/g, '');
                  const num = raw === '' ? minAllowedPercent : Number(raw);
                  if (!isNaN(num)) {
                    const clamped = Math.min(100, Math.max(minAllowedPercent, num));
                    setTargetPercent(clamped);
                  }
                }}
                className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-center text-gray-800 dark:text-gray-100"
                aria-label="Porcentaje objetivo"
              />

              <button
                type="button"
                className="w-full px-2 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
                onClick={() => { lastChangeRef.current = 'target-user'; setTargetPercent(p => Math.min(100, Number(p) + 1)); }}
                aria-label="Aumentar 1"
              >+</button>

              <button
                type="button"
                className="w-full px-2 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
                onClick={() => { lastChangeRef.current = 'target-user'; setTargetPercent(p => Math.min(100, Number(p) + 10)); }}
                aria-label="Aumentar 10"
              >+10</button>

              <button
                type="button"
                className="w-full px-2 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
                onClick={() => { lastChangeRef.current = 'target-user'; setTargetPercent(100); }}
                aria-label="Ir a máximo"
              >max</button>
            </div>
          </div>

          {/* Preferencias */}
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <button className="text-sm text-indigo-600 dark:text-indigo-300 underline" onClick={() => setShowPreferences(p => !p)}>
                {showPreferences ? 'Ocultar preferencias' : 'Mostrar preferencias'}
              </button>
              <div className="relative group">
                <span className="inline-block w-5 h-5 rounded-full bg-indigo-200 text-indigo-700 dark:bg-indigo-700 dark:text-indigo-100 text-center cursor-pointer select-none" style={{ fontSize: '16px', lineHeight: '20px' }}>?</span>
                <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-64 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-xs rounded shadow-lg p-3 z-50 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-200">
                  <b>¿Qué son las preferencias?</b><br/>
                  Ajusta la importancia relativa de cada factor en la recomendación automática:
                  <ul className="list-disc ml-4 mt-1">
                    <li><b>Distancia</b>: Cuánto te importa la distancia hacia el cargador.</li>
                    <li><b>Costo</b>: Cuánto te importa el precio por kWh de la carga.</li>
                    <li><b>Tiempo de carga</b>: Cuánto te importa el tiempo que demorará en cargar tu vehículo.</li>
                    <li><b>Demora</b>: Cuánto te importa el tiempo de espera hasta que el cargador esté disponible.</li>
                  </ul>
                  <span className="block mt-2">Desliza los controles para priorizar lo que más te importa.</span>
                </div>
              </div>
            </div>
            {showPreferences && (
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-700 dark:text-gray-200 mb-1">Distancia</label>
                  <div className="flex items-center gap-2">
                    <button type="button" className="px-2 py-1 text-lg font-bold text-indigo-600 dark:text-indigo-300" onClick={() => setPreferences(p => ({ ...p, distancia: Math.max(0, +(p.distancia - 0.05).toFixed(2)) }))}>-</button>
                    <input type="range" min={0} max={1} step={0.01} value={preferences.distancia} onChange={e => setPreferences(p => ({ ...p, distancia: Number(e.target.value) }))} className="w-full" />
                    <button type="button" className="px-2 py-1 text-lg font-bold text-indigo-600 dark:text-indigo-300" onClick={() => setPreferences(p => ({ ...p, distancia: Math.min(1, +(p.distancia + 0.05).toFixed(2)) }))}>+</button>
                  </div>
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-200 mb-1">Costo</label>
                  <div className="flex items-center gap-2">
                    <button type="button" className="px-2 py-1 text-lg font-bold text-indigo-600 dark:text-indigo-300" onClick={() => setPreferences(p => ({ ...p, costo: Math.max(0, +(p.costo - 0.05).toFixed(2)) }))}>-</button>
                    <input type="range" min={0} max={1} step={0.01} value={preferences.costo} onChange={e => setPreferences(p => ({ ...p, costo: Number(e.target.value) }))} className="w-full" />
                    <button type="button" className="px-2 py-1 text-lg font-bold text-indigo-600 dark:text-indigo-300" onClick={() => setPreferences(p => ({ ...p, costo: Math.min(1, +(p.costo + 0.05).toFixed(2)) }))}>+</button>
                  </div>
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-200 mb-1">Tiempo de carga</label>
                  <div className="flex items-center gap-2">
                    <button type="button" className="px-2 py-1 text-lg font-bold text-indigo-600 dark:text-indigo-300" onClick={() => setPreferences(p => ({ ...p, tiempoCarga: Math.max(0, +(p.tiempoCarga - 0.05).toFixed(2)) }))}>-</button>
                    <input type="range" min={0} max={1} step={0.01} value={preferences.tiempoCarga} onChange={e => setPreferences(p => ({ ...p, tiempoCarga: Number(e.target.value) }))} className="w-full" />
                    <button type="button" className="px-2 py-1 text-lg font-bold text-indigo-600 dark:text-indigo-300" onClick={() => setPreferences(p => ({ ...p, tiempoCarga: Math.min(1, +(p.tiempoCarga + 0.05).toFixed(2)) }))}>+</button>
                  </div>
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-200 mb-1">Demora</label>
                  <div className="flex items-center gap-2">
                    <button type="button" className="px-2 py-1 text-lg font-bold text-indigo-600 dark:text-indigo-300" onClick={() => setPreferences(p => ({ ...p, demora: Math.max(0, +(p.demora - 0.05).toFixed(2)) }))}>-</button>
                    <input type="range" min={0} max={1} step={0.01} value={preferences.demora} onChange={e => setPreferences(p => ({ ...p, demora: Number(e.target.value) }))} className="w-full" />
                    <button type="button" className="px-2 py-1 text-lg font-bold text-indigo-600 dark:text-indigo-300" onClick={() => setPreferences(p => ({ ...p, demora: Math.min(1, +(p.demora + 0.05).toFixed(2)) }))}>+</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Columna derecha: Propuesta (ocupa 1 columna en md) */}
        <div className="md:col-span-1">
          {/* Selección manual (ahora en la columna derecha) */}
          {showChargerList && (
            <div className="mb-4 w-full bg-indigo-50 dark:bg-indigo-800 rounded p-4 text-gray-800 dark:text-gray-100">
              <div className="mb-2 font-semibold">Estación de carga:</div>
              <select
                className="w-full mb-4 p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
                value={selectedCharger?._id || ''}
                onChange={e => {
                  const charger = chargersList.find(c => c._id === e.target.value);
                  setSelectedCharger(charger);
                  if (charger && onCenterCharger) {
                    const coords = charger.location?.coordinates;
                    if (Array.isArray(coords) && coords.length >= 2) {
                      onCenterCharger({ lat: coords[1], lng: coords[0] });
                    } else if (charger.location && charger.location.lat != null && charger.location.lng != null) {
                      onCenterCharger({ lat: charger.location.lat, lng: charger.location.lng });
                    }
                  }
                }}
              >
                <option value="">Selecciona una estación...</option>
                {chargersList.map(charger => (
                  <option key={charger._id} value={charger._id}>
                    {charger.name} ({charger.powerOutput || charger.power} kW)
                  </option>
                ))}
              </select>

              {/* Inputs nativos para seleccionar inicio y duración */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha/hora de inicio</label>
                  <input
                    type="datetime-local"
                    value={manualStartISO}
                    onChange={e => setManualStartISO(e.target.value)}
                    min={minStartISO}
                    className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Duración reserva (minutos)</label>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    value={manualDurationMin}
                    onChange={e => { lastChangeRef.current = 'duration-user'; setManualDurationMin(Number(e.target.value)); }}
                    className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  className="flex-1 py-2 rounded bg-green-600 hover:bg-green-700 text-white font-semibold"
                  disabled={!selectedCharger || loadingReserve}
                  onClick={async () => {
                    if (!selectedCharger || !selectedVehicle) return;
                    if (!manualDurationMin || manualDurationMin <= 0) { setFeedback('Elige duración válida.'); return; }
                    setLoadingReserve(true);
                    setFeedback(null);
                    try {
                      const q = new URLSearchParams({ minDuration: String(manualDurationMin), lookAheadDays: '7' });
                      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/calendar/charger/${selectedCharger._id}/next-available?${q}`);
                      if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.error || 'No se pudo consultar la próxima ventana disponible.');
                      }
                      const data = await res.json();
                      if (!data.found) {
                        setFeedback(data.message || 'No se encontró una ventana disponible en el periodo de búsqueda.');
                        setLoadingReserve(false);
                        return;
                      }
                      const startTime = new Date(data.start);
                      const endTime = new Date(data.end);
                      const batteryCapacity = selectedVehicle.batteryCapacity;
                      const currentChargeLevel = selectedVehicle.currentChargeLevel;
                      const energyNeeded = batteryCapacity * (1 - currentChargeLevel / 100);
                      const power = selectedCharger.powerOutput || selectedCharger.power;
                      const estimatedFullChargeMinutes = power ? Math.round((energyNeeded / power) * 60) : Math.round(manualDurationMin);
                      const chargeTimeHours = manualDurationMin / 60;
                      setProposal({
                        charger: selectedCharger,
                        startTime,
                        endTime,
                        power,
                        chargeTimeHours,
                        estimatedFullChargeMinutes,
                        targetPercent,
                        estimatedEnergyKWh: Math.max(0, Number(selectedVehicle?.batteryCapacity || 0) * (targetPercent / 100 - Number(selectedVehicle?.currentChargeLevel || 0) / 100))
                      });
                      setShowConfirm(true);
                      setShowChargerList(false);
                    } catch (e: any) {
                      setFeedback(e.message || 'No se pudo calcular la reserva.');
                    } finally {
                      setLoadingReserve(false);
                    }
                  }}
                >Proponer reserva</button>
                <button
                  className="flex-1 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold"
                  onClick={() => { setShowChargerList(false); setSelectedCharger(null); setIsManualMode(false); }}
                  disabled={loadingReserve}
                >Cancelar</button>
              </div>
            </div>
          )}

           {proposal && showConfirm ? (
             <div className="sticky top-6 bg-indigo-50 dark:bg-indigo-800 rounded p-4 text-gray-800 dark:text-gray-100">
               <div className="mb-2 font-semibold">Propuesta de reserva:</div>
               <div><b>Estación:</b> {proposal.charger.name}</div>
               <div><b>Potencia:</b> {proposal.power} kW</div>
               <div><b>Inicio:</b> {proposal.startTime.toLocaleString()}</div>
               <div><b>Fin:</b> {proposal.endTime.toLocaleString()}</div>
               <div><b>Tiempo estimado de carga:</b> {Math.round(proposal.chargeTimeHours * 60)} minutos</div>
               <div className="flex gap-2 mt-4">
                 <button className="flex-1 py-2 rounded bg-green-600 hover:bg-green-700 text-white font-semibold" onClick={confirmReservation} disabled={loadingReserve}>Aceptar</button>
                 <button className="flex-1 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold" onClick={() => { setProposal(null); setShowConfirm(false); setIsManualMode(false); }}>Cancelar</button>
               </div>
             </div>
           ) : (
             // espacio reservado cuando no hay propuesta para mantener la columna visible
             <div className="hidden md:block h-0 md:h-full"></div>
           )}
         </div>
       </div>
 
       {/* Feedback (debajo de la grid) */}
      {feedback && <div className="mt-4 text-center text-green-600 dark:text-green-300">{feedback}</div>}
    </div>
  );
};

export default ChargerOptionsModal;