import React, { useState } from 'react';

interface ChargerOptionsModalProps {
  onClose: () => void;
  user: any;
  selectedVehicle: any;
  fetchReservations: (vehicleId: string) => Promise<void>;
  onReserveCharger: (chargerId: string) => void;
  userLocation?: { lat: number; lng: number } | null;
  onCenterCharger?: (options: { lat: number; lng: number; zoom?: number } | null) => void;
}

const ChargerOptionsModal: React.FC<ChargerOptionsModalProps> = ({ onClose, user, selectedVehicle, fetchReservations, onReserveCharger, userLocation, onCenterCharger }) => {
  const [loadingFind, setLoadingFind] = useState(false);
  const [loadingReserve, setLoadingReserve] = useState(false);
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
    // Modo de búsqueda por defecto 'charge'
    searchMode: 'charge' as 'charge' | 'time',
    // Para modo 'time': tiempo disponible (minutos). El peso de carga siempre será 1.
    availableTime: 30
  });
  // Porcentaje objetivo de batería (solo usado en modo 'charge')
  const [targetChargeLevel, setTargetChargeLevel] = useState<number>(80);
  const [showPreferences, setShowPreferences] = useState(false);

  // Nuevo estado para ranking y control de "otra recomendación"
  const [ranking, setRanking] = useState<any[] | null>(null);
  const [currentRankingIndex, setCurrentRankingIndex] = useState<number>(0);
  const [lastRankingIds, setLastRankingIds] = useState<string[] | null>(null);

  const getChargerLatLng = (charger: any) => {
    if (!charger) return null;
    if (charger.location?.coordinates && Array.isArray(charger.location.coordinates) && charger.location.coordinates.length >= 2) {
      return { lat: charger.location.coordinates[1], lng: charger.location.coordinates[0] };
    }
    if (charger.location?.lat !== undefined && charger.location?.lng !== undefined) {
      return { lat: charger.location.lat, lng: charger.location.lng };
    }
    if (charger.lat !== undefined && charger.lng !== undefined) {
      return { lat: charger.lat, lng: charger.lng };
    }
    return null;
  };

  /**
   * Función compleja: fetchRecommendationData
   * 
   * Propósito: Obtener recomendación inteligente de cargador desde el backend
   * usando un algoritmo multi-criterio que considera distancia, costo, tiempo
   * de carga y demoras por reservas futuras.
   * 
   * Modos:
   * - 'charge': Busca cargador para alcanzar un % de batería objetivo
   * - 'time': Busca cargador óptimo dado un tiempo disponible (minutos)
   * 
   * Flujo:
   * 1. Validar vehículo seleccionado y usuario autenticado
   * 2. Validar según modo (energía necesaria > 0 o tiempo > 0)
   * 3. Construir parámetros de query con ubicación, vehículo y preferencias
   * 4. Llamar API /api/recommendations/recommend
   * 5. Retornar { best, ranking } donde:
   *    - best: cargador recomendado con tiempos y costos
   *    - ranking: array de alternativas ordenadas por puntaje
   * 
   * @param mode - 'charge' para búsqueda por % objetivo, 'time' para tiempo disponible
   * @returns Promise<{best, ranking}> - Mejor opción y lista ranking
   * @throws Error si no hay vehículo, validación falla, o API falla
   */
  const fetchRecommendationData = async (mode: 'charge' | 'time' = 'charge') => {
    if (!selectedVehicle || !user) throw new Error('Selecciona un vehículo primero.');
    const batteryCapacity = selectedVehicle.batteryCapacity;
    const currentChargeLevel = selectedVehicle.currentChargeLevel;

    // Validaciones según modo
    if (mode === 'charge') {
      const energyNeeded = batteryCapacity * ((targetChargeLevel - currentChargeLevel) / 100);
      if (energyNeeded <= 0) throw new Error('El vehículo ya alcanzó o supera el porcentaje objetivo.');
    } else {
      const availableTime = Number((preferences as any).availableTime ?? 0);
      if (!availableTime || availableTime <= 0) throw new Error('Ingresa un tiempo disponible válido (minutos).');
    }

    const latitude = userLocation?.lat ?? -33.4489;
    const longitude = userLocation?.lng ?? -70.6693;
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      vehicleId: selectedVehicle._id,
      currentChargeLevel: currentChargeLevel.toString(),
      distancia: preferences.distancia.toString(),
      costo: preferences.costo.toString(),
      tiempoCarga: preferences.tiempoCarga.toString(),
      demora: preferences.demora.toString()
    });
    // Añadir parámetros específicos según modo
    if (mode === 'charge') {
      params.append('targetChargeLevel', String(targetChargeLevel));
    } else {
      // enviar tanto en inglés como en español para compatibilidad del backend
      params.append('availableTime', String((preferences as any).availableTime ?? 0)); // minutos
      params.append('tiempoDisponible', String((preferences as any).availableTime ?? 0));
      // peso de carga fijo = 1 (máximo)
      params.append('chargeWeight', '1');
      params.append('carga', '1');
    }
    // Añadir modo de recomendación (por carga o por tiempo)
    params.append('mode', mode);

    // llamar a la ruta unificada del backend
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/recommendations/recommend?${params}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'No se pudo obtener recomendación.' }));
      throw new Error(err.error || 'No se pudo obtener recomendación.');
    }
    const data = await res.json();
    console.log('Recomendación recibida:', data);
    return data; // { best, ranking }
  };

  /**
   * Handler: Buscar cargador automático (recomendación inteligente)
   * 
   * Proceso:
   * 1. Llamar fetchRecommendationData según modo seleccionado
   * 2. Procesar respuesta {best, ranking} del backend
   * 3. Normalizar datos (diferentes formatos del API)
   * 4. Calcular tiempos de inicio/fin de la reserva
   * 5. Si modo 'time': calcular % de carga esperado
   * 6. Mostrar propuesta al usuario
   * 7. Centrar mapa en cargador recomendado
   */
  const handleFind = async () => {
     setLoadingFind(true);
     setFeedback(null);
     setProposal(null);
     setShowConfirm(false);
     setShowChargerList(false);
     
     try {
      // PASO 1: Obtener recomendación del backend
      const mode = (preferences as any).searchMode ?? 'charge';
      const data = await fetchRecommendationData(mode);
      
      if (!data?.best) {
        throw new Error('No se encontró un cargador disponible para recomendar.');
      }
      
      // PASO 2: Guardar ranking completo e índice actual
      const rankingList = Array.isArray(data.ranking) ? data.ranking : [];
      setRanking(rankingList);
      setLastRankingIds(rankingList.map((r: any) => r.charger?._id || r.chargerId || ''));
      setCurrentRankingIndex(0);
      
      const best = data.best;
      
      // PASO 3: Normalizar campos (backend puede retornar nombres diferentes)
      const charger = best.charger || best.chargerId || null;
      const tCargaMinutes = (best.tCarga ?? best.windowMinutes ?? 0);
      const tDemoraMinutes = (best.tDemora ?? best.tDemora ?? 0);
      
      // PASO 4: Calcular horarios de la reserva
      const now = new Date();
      const startTime = new Date(now.getTime() + (tDemoraMinutes * 60 * 1000));
      const endTime = new Date(startTime.getTime() + (tCargaMinutes * 60 * 1000));
      
      // PASO 5: Extraer datos de costo y potencia
      const powerVal = charger?.powerOutput ?? charger?.power ?? undefined;
      const costVal = best.cost ?? undefined;
      const unitCostVal = best.unitCost ?? undefined;
      
      // PASO 6: Calcular % de carga esperado (solo modo 'time')
      const energyGiven = best.energyGiven ?? best.energy_given ?? best.energy ?? undefined;
      let expectedChargePercent: number | undefined = undefined;
      try {
        const batteryCapacity = Number(selectedVehicle?.batteryCapacity ?? 0);
        const currentCharge = Number(selectedVehicle?.currentChargeLevel ?? 0);
        if (energyGiven !== undefined && batteryCapacity > 0) {
          const addedPct = (Number(energyGiven) / batteryCapacity) * 100;
          expectedChargePercent = Math.min(100, Math.round((currentCharge + addedPct)));
        }
      } catch {
        expectedChargePercent = undefined;
      }
      
      // PASO 7: Guardar propuesta y mostrar confirmación
      setProposal({
        charger,
        startTime,
        endTime,
        power: powerVal,
        chargeTimeHours: tCargaMinutes / 60,
        cost: costVal,
        unitCost: unitCostVal,
        expectedChargePercent
      });
      setShowConfirm(true);
      
      // PASO 8: Centrar mapa en el cargador recomendado
      const loc = getChargerLatLng(charger);
      if (loc && onCenterCharger) {
        onCenterCharger({ lat: loc.lat, lng: loc.lng, zoom: 17 });
      }
    } catch (e: any) {
      setFeedback(e.message || 'No se pudo realizar la reserva.');
      setTimeout(() => setFeedback(null), 2500);
    } finally {
      setLoadingFind(false);
    }
  };

  /**
   * Handler: Mostrar lista completa de cargadores para selección manual
   * 
   * Proceso:
   * 1. Obtener cargadores cercanos según ubicación del usuario
   * 2. Cargar favoritos del usuario desde API
   * 3. Marcar cargadores favoritos en la lista
   * 4. Ordenar: favoritos primero, luego resto
   * 5. Mostrar lista al usuario
   */
  const handleManual = async () => {
    setLoadingReserve(true);
    setProposal(null);
    setShowConfirm(false);
    setFeedback(null);
    
    try {
      // PASO 1: Obtener cargadores cercanos (radio amplio: 100km)
      const latitude = userLocation?.lat ?? -33.4489;
      const longitude = userLocation?.lng ?? -70.6693;
      const chargersRes = await fetch(`${import.meta.env.VITE_API_URL}/api/chargers/nearby?latitude=${latitude}&longitude=${longitude}&maxDistance=100000`);
      const chargers = await chargersRes.json();

      // PASO 2: Obtener favoritos del usuario para marcarlos
      let favIds: string[] = [];
      try {
        const token = localStorage.getItem('token');
        if (user && user._id && token) {
          const favRes = await fetch(`${import.meta.env.VITE_API_URL}/api/favourites/${user._id}`, {
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
          });
          if (favRes.ok) {
            const favData = await favRes.json();
            favIds = Array.isArray(favData.favoriteStations) ? favData.favoriteStations.map((s:any) => String(s._id || s)) : [];
          }
        }
      } catch (e) {
        // No bloquear si falla obtener favoritos
        console.warn('No se pudieron obtener favoritos al listar cargadores:', e);
        favIds = [];
      }

      // PASO 3 y 4: Marcar favoritos y ordenar (favoritos al inicio)
      const mapped = Array.isArray(chargers) ? chargers.map((c:any) => ({
        ...c,
        isFavorite: favIds.includes(String(c._id))
      })).sort((a:any,b:any) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0)) : [];

      // PASO 5: Mostrar lista
      setChargersList(mapped);
      setShowChargerList(true);
    } catch {
      setFeedback('No se pudieron cargar los cargadores.');
    } finally {
      setLoadingReserve(false);
    }
  };

  /**
   * Handler: Confirmar y crear reserva en el backend
   * 
   * Proceso:
   * 1. Validar que hay propuesta activa
   * 2. Extraer datos de cargador y horarios
   * 3. Enviar POST a /api/reservations
   * 4. Actualizar lista de reservas del vehículo
   * 5. Mostrar feedback y cerrar modal
   */
  const confirmReservation = async () => {
    if (!proposal) return;
    setLoadingReserve(true);
    setFeedback(null);
    
    try {
      // PASO 1: Extraer datos de la propuesta
      const { charger, startTime, endTime } = proposal;
      
      // PASO 2: Crear reserva en el backend
      const reservationRes = await fetch(`${import.meta.env.VITE_API_URL}/api/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: selectedVehicle._id,
          chargerId: charger._id,
          startTime,
          endTime
        })
      });
      
      // PASO 3: Manejar respuesta
      if (reservationRes.ok) {
        // Actualizar lista de reservas
        await fetchReservations(selectedVehicle._id);
        setFeedback('¡Reserva realizada exitosamente!');
        setShowConfirm(false);
        setProposal(null);
        
        // PASO 4: Cerrar modal después de mostrar mensaje
        setTimeout(() => {
          setFeedback(null);
          onClose();
        }, 1800);
      } else {
        const err = await reservationRes.json().catch(() => null);
        setFeedback(err?.error || 'No se pudo realizar la reserva.');
      }
    } catch {
      setFeedback('No se pudo realizar la reserva.');
    } finally {
      setLoadingReserve(false);
    }
  };

  /**
   * Handler: Obtener siguiente recomendación del ranking
   * 
   * Estrategia de 2 niveles:
   * 1. Si hay más opciones en ranking local: usar siguiente
   * 2. Si ranking agotado: pedir nueva recomendación excluyendo ya mostrados
   * 
   * Esto evita mostrar la misma opción repetidamente y mejora la experiencia
   * cuando el usuario quiere explorar alternativas.
   */
  const handleAnotherRecommendation = async () => {
    // NIVEL 1: Si hay siguiente opción en ranking local, usarla
    if (ranking && currentRankingIndex + 1 < ranking.length) {
      const nextIndex = currentRankingIndex + 1;
      const next = ranking[nextIndex];
      setCurrentRankingIndex(nextIndex);
      
      // Normalizar campos del ranking (mismo proceso que handleFind)
      const charger = next.charger || next.chargerId || null;
      const tCargaMinutes = (next.tCarga ?? next.windowMinutes ?? 0);
      const tDemoraMinutes = (next.tDemora ?? next.tDemora ?? 0);
      const now = new Date();
      const startTime = new Date(now.getTime() + (tDemoraMinutes * 60 * 1000));
      const endTime = new Date(startTime.getTime() + (tCargaMinutes * 60 * 1000));
      const powerVal = charger?.powerOutput ?? charger?.power ?? undefined;
      const costVal = next.cost ?? undefined;
      const unitCostVal = next.unitCost ?? undefined;
      
      // Calcular expectedChargePercent si viene energyGiven
      const energyGivenNext = next.energyGiven ?? next.energy_given ?? next.energy ?? undefined;
      let expectedChargePercentNext: number | undefined = undefined;
      try {
        const batteryCapacity = Number(selectedVehicle?.batteryCapacity ?? 0);
        const currentCharge = Number(selectedVehicle?.currentChargeLevel ?? 0);
        if (energyGivenNext !== undefined && batteryCapacity > 0) {
          const addedPct = (Number(energyGivenNext) / batteryCapacity) * 100;
          expectedChargePercentNext = Math.min(100, Math.round((currentCharge + addedPct)));
        }
      } catch {
        expectedChargePercentNext = undefined;
      }
      setProposal({
        charger,
        startTime,
        endTime,
        power: powerVal,
        chargeTimeHours: tCargaMinutes / 60,
        cost: costVal,
        unitCost: unitCostVal,
        expectedChargePercent: expectedChargePercentNext
      });
      setShowConfirm(true);
      // Centrar el mapa en la estación propuesta (si se proporcionó la función)
      const loc = getChargerLatLng(charger);
      if (loc && onCenterCharger) {
        onCenterCharger({ lat: loc.lat, lng: loc.lng, zoom: 17 });
      }
      return;
    }

    // Si no hay siguiente, volver a pedir recomendaciones y comparar
    setLoadingFind(true);
    setFeedback(null);
    try {
      const mode = (preferences as any).searchMode ?? 'charge';
      const data = await fetchRecommendationData(mode);
      const newRanking = Array.isArray(data.ranking) ? data.ranking : [];
      const newIds = newRanking.map((r: any) => r.charger?._id || r.chargerId || '');
      const prevIds = lastRankingIds ?? [];
      const listsEqual = prevIds.length === newIds.length && prevIds.every((id, idx) => id === newIds[idx]);

      if (!newRanking.length) {
        setFeedback('No se encontraron recomendaciones adicionales.');
        setTimeout(() => setFeedback(null), 2500);
      } else if (!listsEqual) {
        // Nueva lista distinta: usar la primera de la nueva lista
        setRanking(newRanking);
        setLastRankingIds(newIds);
        setCurrentRankingIndex(0);
        const first = newRanking[0];
        const charger = first.charger || first.chargerId || null;
        const tCargaMinutes = (first.tCarga ?? first.windowMinutes ?? 0);
        const tDemoraMinutes = (first.tDemora ?? first.tDemora ?? 0);
        const now = new Date();
        const startTime = new Date(now.getTime() + (tDemoraMinutes * 60 * 1000));
        const endTime = new Date(startTime.getTime() + (tCargaMinutes * 60 * 1000));
        const powerVal = charger?.powerOutput ?? charger?.power ?? undefined;
        const costVal = first.cost ?? undefined;
        const unitCostVal = first.unitCost ?? undefined;
        // calcular expectedChargePercent para el primer resultado (si aplica)
        const energyGivenFirst = first.energyGiven ?? first.energy_given ?? first.energy ?? undefined;
        let expectedChargePercentFirst: number | undefined = undefined;
        try {
          const batteryCapacity = Number(selectedVehicle?.batteryCapacity ?? 0);
          const currentCharge = Number(selectedVehicle?.currentChargeLevel ?? 0);
          if (energyGivenFirst !== undefined && batteryCapacity > 0) {
            const addedPct = (Number(energyGivenFirst) / batteryCapacity) * 100;
            expectedChargePercentFirst = Math.min(100, Math.round((currentCharge + addedPct)));
          }
        } catch {
          expectedChargePercentFirst = undefined;
        }
        setProposal({
          charger,
          startTime,
          endTime,
          power: powerVal,
          chargeTimeHours: tCargaMinutes / 60,
          cost: costVal,
          unitCost: unitCostVal,
          expectedChargePercent: expectedChargePercentFirst
        });
        setShowConfirm(true);
        const loc2 = getChargerLatLng(charger);
        if (loc2 && onCenterCharger) {
          onCenterCharger({ lat: loc2.lat, lng: loc2.lng, zoom: 17 });
        }
      } else {
        // Lista igual: no hay nuevas recomendaciones
        setFeedback('No hay nuevas recomendaciones.');
        setTimeout(() => setFeedback(null), 2500);
      }
    } catch (e: any) {
      setFeedback(e.message || 'No se pudo obtener nuevas recomendaciones.');
      setTimeout(() => setFeedback(null), 2500);
    } finally {
      setLoadingFind(false);
    }
  };

  // Renderizado
  return (
    // Integrado como bloque: quitar borde/sombra/fondo tipo modal y eliminar la "X"
    <div className="bg-transparent dark:bg-transparent p-0">
      <div className="mb-4">
        <h2 className="text-xl item-title">Reservar Cargador</h2>
        {/* botón de cierre eliminado intencionalmente para integración en layout */}
      </div>
      {/* Botones de acción */}
      <div className="flex gap-2 mb-4">
        <button
          className="btn btn-primary btn-block"
          onClick={handleFind}
          disabled={loadingFind}
        >
          {loadingFind ? 'Buscando...' : 'Reserva Rápida'}
        </button>
        <button
          className="btn btn-outline btn-block"
          onClick={() => { handleManual(); setShowPreferences(false); }}
          disabled={loadingReserve}
        >{loadingReserve ? 'Cargando...' : 'Reserva Específica'}</button>
      </div>
      {/* Preferencias embebidas debajo de los botones */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <button className="text-sm text-indigo-600 dark:text-indigo-300 underline" onClick={() => setShowPreferences(p => !p)}>
            {showPreferences ? 'Ocultar preferencias' : 'Mostrar preferencias'}
          </button>
          <div className="relative group">
            <span className="help-icon">?</span>
            <div className="tooltip-hover">
              <b>¿Qué son las preferencias?</b><br />
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
            <div className="md:col-span-2">
              {/* Mostrar input distinto según modo de búsqueda */}
              {(preferences as any).searchMode === 'charge' ? (
                <>
                  <label className="form-label">Porcentaje objetivo de batería (%)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={Math.max(0, selectedVehicle?.currentChargeLevel ?? 0)}
                      max={100}
                      step={1}
                      value={targetChargeLevel}
                      onChange={e => setTargetChargeLevel(Number(e.target.value))}
                      className="range-indigo"
                    />
                    <input
                      type="number"
                      min={Math.max(0, selectedVehicle?.currentChargeLevel ?? 0)}
                      max={100}
                      value={targetChargeLevel}
                      onChange={e => {
                        const v = Number(e.target.value);
                        if (!isNaN(v)) setTargetChargeLevel(Math.max(0, Math.min(100, v)));
                      }}
                      className="input-xnarrow"
                    />
                  </div>
                </>
              ) : (
                <>
                  <label className="form-label">Tiempo disponible (minutos)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={(preferences as any).availableTime ?? 30}
                      onChange={e => setPreferences(p => ({ ...p, availableTime: Math.max(0, Number(e.target.value) || 0) }))}
                      className="input-narrow"
                    />
                  </div>
                </>
              )}
            </div>
            <div>
              <label className="form-label">Distancia</label>
              <div className="flex items-center gap-2">
                <button type="button" className="pref-adjust-btn" onClick={() => setPreferences(p => ({ ...p, distancia: Math.max(0, +(p.distancia - 0.05).toFixed(2)) }))}>-</button>
                <input type="range" min={0} max={1} step={0.01} value={preferences.distancia} onChange={e => setPreferences(p => ({ ...p, distancia: Number(e.target.value) }))} className="range-indigo" />
                <button type="button" className="pref-adjust-btn" onClick={() => setPreferences(p => ({ ...p, distancia: Math.min(1, +(p.distancia + 0.05).toFixed(2)) }))}>+</button>
              </div>
            </div>
            <div>
              <label className="form-label">Costo</label>
              <div className="flex items-center gap-2">
                <button type="button" className="pref-adjust-btn" onClick={() => setPreferences(p => ({ ...p, costo: Math.max(0, +(p.costo - 0.05).toFixed(2)) }))}>-</button>
                <input type="range" min={0} max={1} step={0.01} value={preferences.costo} onChange={e => setPreferences(p => ({ ...p, costo: Number(e.target.value) }))} className="range-indigo" />
                <button type="button" className="pref-adjust-btn" onClick={() => setPreferences(p => ({ ...p, costo: Math.min(1, +(p.costo + 0.05).toFixed(2)) }))}>+</button>
              </div>
            </div>
            <div>
              <label className="form-label">Tiempo de carga</label>
              <div className="flex items-center gap-2">
                <button type="button" className="pref-adjust-btn" onClick={() => setPreferences(p => ({ ...p, tiempoCarga: Math.max(0, +(p.tiempoCarga - 0.05).toFixed(2)) }))}>-</button>
                <input type="range" min={0} max={1} step={0.01} value={preferences.tiempoCarga} onChange={e => setPreferences(p => ({ ...p, tiempoCarga: Number(e.target.value) }))} className="range-indigo" />
                <button type="button" className="pref-adjust-btn" onClick={() => setPreferences(p => ({ ...p, tiempoCarga: Math.min(1, +(p.tiempoCarga + 0.05).toFixed(2)) }))}>+</button>
              </div>
            </div>
            <div>
              <label className="form-label">Demora</label>
              <div className="flex items-center gap-2">
                <button type="button" className="pref-adjust-btn" onClick={() => setPreferences(p => ({ ...p, demora: Math.max(0, +(p.demora - 0.05).toFixed(2)) }))}>-</button>
                <input type="range" min={0} max={1} step={0.01} value={preferences.demora} onChange={e => setPreferences(p => ({ ...p, demora: Number(e.target.value) }))} className="range-indigo" />
                <button type="button" className="pref-adjust-btn" onClick={() => setPreferences(p => ({ ...p, demora: Math.min(1, +(p.demora + 0.05).toFixed(2)) }))}>+</button>
              </div>
            </div>
            {/* Nueva opción en preferencias: modo de búsqueda */}
            <div className="md:col-span-2">
              <label className="form-label">Modo de búsqueda</label>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="searchMode"
                    value="charge"
                    checked={(preferences as any).searchMode === 'charge'}
                    onChange={() => setPreferences(p => ({ ...p, searchMode: 'charge' }))}
                  />
                  <span className="text-sm">Por Carga</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="searchMode"
                    value="time"
                    checked={(preferences as any).searchMode === 'time'}
                    onChange={() => setPreferences(p => ({ ...p, searchMode: 'time' }))}
                  />
                  <span className="text-sm">Por Tiempo</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Selección manual */}
      {showChargerList && (
        <div className="pref-box">
          <div className="mb-2 font-semibold">Selecciona una estación de carga:</div>
          <select
            className="select mb-4"
            value={selectedCharger?._id || ''}
            onChange={e => {
              const charger = chargersList.find(c => c._id === e.target.value);
              setSelectedCharger(charger);
              // Centrar mapa en la estación seleccionada si la función fue provista
              if (charger) {
                const loc = getChargerLatLng(charger);
                if (loc && onCenterCharger) {
                  onCenterCharger({ lat: loc.lat, lng: loc.lng, zoom: 17 });
                }
              }
            }}
          >
            <option value="">Selecciona una estación...</option>
            {chargersList.map((charger:any) => (
              <option key={charger._id} value={charger._id}>
                {charger.isFavorite ? '★ ' : ''}{charger.name} ({charger.powerOutput || charger.power} kW)
              </option>
            ))}
          </select>
          <div className="flex gap-2 mt-2">
            <button
              className="btn btn-primary btn-block"
              disabled={!selectedCharger}
              onClick={() => {
                if (selectedCharger) {
                  onReserveCharger(selectedCharger._id);
                  onClose();
                }
              }}
            >
              Ir a calendario de reserva
            </button>
            <button
              className="btn btn-secondary btn-block"
              onClick={() => { setShowChargerList(false); setSelectedCharger(null); }}
              disabled={loadingReserve}
            >Cancelar</button>
          </div>
        </div>
      )}
      {/* Propuesta de reserva */}
      {proposal && showConfirm && (
        <div className="proposal-box">
          <div className="mb-2 font-semibold">Propuesta de reserva:</div>
          {proposal.expectedChargePercent !== undefined && (
            <div><b>Carga hasta:</b> {proposal.expectedChargePercent}%</div>
          )}
          <div><b>Inicio:</b> {proposal.startTime.toLocaleString()}</div>
          <div><b>Fin:</b> {proposal.endTime.toLocaleString()}</div>
          <div><b>Tiempo estimado de carga:</b> {Math.round(proposal.chargeTimeHours * 60)} minutos</div>
          <div><b>Estación:</b> {proposal.charger.name}</div>
          <div><b>Potencia:</b> {Math.floor(proposal.power * 100)/100} kW</div>
          <div>
            <b>Costo estimado de la carga:</b>{' '}
            {proposal.cost !== undefined
              ? `CLP$ ${Math.ceil(Number(proposal.cost)).toLocaleString()}`
              : proposal.unitCost !== undefined
                ? `CLP$ ${Math.ceil(Number(proposal.unitCost)).toLocaleString()} / kWh`
                : 'N/A'}
          </div>
          <div className="flex gap-2 mt-4">
            <button className="btn btn-success btn-block" onClick={confirmReservation} disabled={loadingReserve}>Aceptar</button>
            <button className="btn btn-secondary btn-block" onClick={() => { setProposal(null); setShowConfirm(false); }}>Cancelar</button>
            <button
              className="btn btn-warning btn-block"
              onClick={handleAnotherRecommendation}
              disabled={loadingFind}
            >
              Otra Recomendación
            </button>
          </div>
        </div>
      )}
      {feedback && <div className="feedback-success">{feedback}</div>}
    </div>
  );
};

export default ChargerOptionsModal;