import React, { useState } from 'react';

interface ChargerOptionsModalProps {
  onClose: () => void;
  user: any;
  selectedVehicle: any;
  fetchReservations: (vehicleId: string) => Promise<void>;
  onReserveCharger: (chargerId: string) => void;
}

const ChargerOptionsModal: React.FC<ChargerOptionsModalProps> = ({ onClose, user, selectedVehicle, fetchReservations, onReserveCharger }) => {
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
  });
  const [showPreferences, setShowPreferences] = useState(false);

  // Encuéntrame un cargador automático usando el endpoint de recomendación
  const handleFind = async () => {
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
        demora: preferences.demora.toString()
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
    setLoadingReserve(true);
    setProposal(null);
    setShowConfirm(false);
    setFeedback(null);
    try {
      const chargersRes = await fetch(`${import.meta.env.VITE_API_URL}/api/chargers/nearby?latitude=-33.4489&longitude=-70.6693&maxDistance=100000`);
      const chargers = await chargersRes.json();
      setChargersList(chargers);
      setShowChargerList(true);
    } catch (e) {
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

  // Renderizado
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Reservar Cargador</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-2xl font-bold">&times;</button>
      </div>
      {/* Botones de acción */}
      <div className="flex gap-2 mb-4">
        <button
          className="flex-1 py-3 px-6 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow transition-colors duration-200 disabled:opacity-60"
          onClick={handleFind}
          disabled={loadingFind}
        >{loadingFind ? 'Buscando...' : 'Reserva Rápida'}</button>
        <button
          className="flex-1 py-3 px-6 rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-semibold shadow transition-colors duration-200 disabled:opacity-60"
          onClick={handleManual}
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
      {/* Selección manual */}
      {showChargerList && (
        <div className="mt-4 w-full bg-indigo-50 dark:bg-indigo-800 rounded p-4 text-gray-800 dark:text-gray-100">
          <div className="mb-2 font-semibold">Selecciona una estación de carga:</div>
          <select
            className="w-full mb-4 p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
            value={selectedCharger?._id || ''}
            onChange={e => {
              const charger = chargersList.find(c => c._id === e.target.value);
              setSelectedCharger(charger);
            }}
          >
            <option value="">Selecciona una estación...</option>
            {chargersList.map(charger => (
              <option key={charger._id} value={charger._id}>
                {charger.name} ({charger.powerOutput || charger.power} kW)
              </option>
            ))}
          </select>
          <div className="flex gap-2 mt-2">
            <button
              className="flex-1 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
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
              className="flex-1 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold"
              onClick={() => { setShowChargerList(false); setSelectedCharger(null); }}
              disabled={loadingReserve}
            >Cancelar</button>
          </div>
        </div>
      )}
      {/* Propuesta de reserva */}
      {proposal && showConfirm && (
        <div className="mt-6 w-full bg-indigo-50 dark:bg-indigo-800 rounded p-4 text-gray-800 dark:text-gray-100">
          <div className="mb-2 font-semibold">Propuesta de reserva:</div>
          <div><b>Estación:</b> {proposal.charger.name}</div>
          <div><b>Potencia:</b> {proposal.power} kW</div>
          <div><b>Inicio:</b> {proposal.startTime.toLocaleString()}</div>
          <div><b>Fin:</b> {proposal.endTime.toLocaleString()}</div>
          <div><b>Tiempo estimado de carga:</b> {Math.round(proposal.chargeTimeHours * 60)} minutos</div>
          <div className="flex gap-2 mt-4">
            <button className="flex-1 py-2 rounded bg-green-600 hover:bg-green-700 text-white font-semibold" onClick={confirmReservation} disabled={loadingReserve}>Aceptar</button>
            <button className="flex-1 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold" onClick={() => { setProposal(null); setShowConfirm(false); }}>Cancelar</button>
          </div>
        </div>
      )}
      {/* Feedback */}
      {feedback && <div className="mt-4 text-center text-green-600 dark:text-green-300">{feedback}</div>}
    </div>
  );
};

export default ChargerOptionsModal;