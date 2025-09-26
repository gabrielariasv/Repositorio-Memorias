import React, { useState } from 'react';

interface ChargerOptionsModalProps {
  onClose: () => void;
  user: any;
  selectedVehicle: any;
  fetchReservations: (vehicleId: string) => Promise<void>;
  onReserveCharger: () => void;
}



const ChargerOptionsModal: React.FC<ChargerOptionsModalProps> = ({ onClose, user, selectedVehicle, fetchReservations}) => {
  const [loadingFind, setLoadingFind] = useState(false);
  const [loadingReserve, setLoadingReserve] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [proposal, setProposal] = useState<any>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showChargerList, setShowChargerList] = useState(false);
  const [chargersList, setChargersList] = useState<any[]>([]);
  const [selectedCharger, setSelectedCharger] = useState<any>(null);

  // Aquí irá la nueva lógica de búsqueda y confirmación de reserva

  const handleFind = async () => {
    setLoadingFind(true);
    setFeedback(null);
    setProposal(null);
    setShowConfirm(false);
    setShowChargerList(false); // Cierra la lista de cargadores si estaba abierta
    try {
      if (!selectedVehicle || !user) throw new Error('Selecciona un vehículo primero.');
      const batteryCapacity = selectedVehicle.batteryCapacity;
      const currentChargeLevel = selectedVehicle.currentChargeLevel;
      const energyNeeded = batteryCapacity * (1 - currentChargeLevel / 100);
      if (energyNeeded <= 0) throw new Error('El vehículo ya está completamente cargado.');
      let maxDistance = 10000;
      let found = false;
      for (let tries = 0; tries < 20 && !found; tries++) {
        const chargersRes = await fetch(`${import.meta.env.VITE_API_URL}/api/chargers/nearby?latitude=0&longitude=0&maxDistance=${maxDistance}`);
        const chargers = await chargersRes.json();
        if (!chargers.length) {
          maxDistance *= 2;
          continue;
        }
        const now = new Date();
        // Buscar primero por tiempo: para cada offset, probar todas las estaciones
        for (let offset = 0; offset < 24 * 60; offset += 10) {
          const startTime = new Date(now.getTime() + offset * 60 * 1000);
          // Probar todas las estaciones para este tiempo
          for (const charger of chargers) {
            const power = charger.powerOutput;
            if (!power || power <= 0) continue;
            const chargeTimeHours = energyNeeded / power;
            const chargeTimeMs = chargeTimeHours * 60 * 60 * 1000;
            const endTime = new Date(startTime.getTime() + chargeTimeMs);
            const params = new URLSearchParams({
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString()
            });
            const availRes = await fetch(`${import.meta.env.VITE_API_URL}/api/calendar/charger/${charger._id}/availability?${params}`);
            if (!availRes.ok) continue;
            const availData = await availRes.json();
            if (availData.available) {
              setProposal({
                charger,
                startTime,
                endTime,
                power,
                chargeTimeHours
              });
              setShowConfirm(true);
              found = true;
              break;
            }
          }
          if (found) break;
        }
        if (!found) maxDistance *= 2;
      }
      if (!found) throw new Error('No se encontró un bloque disponible para cargar.');
    } catch (e: any) {
      setFeedback(e.message || 'No se pudo realizar la reserva.');
      setTimeout(() => setFeedback(null), 2500);
    } finally {
      setLoadingFind(false);
    }
  };

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 relative flex flex-col items-center" style={{ minWidth: 320 }}>
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-2xl"
          onClick={onClose}
        >&times;</button>
        <h2 className="text-xl font-semibold mb-6 text-gray-800 dark:text-gray-100">¿Qué deseas hacer?</h2>
        <button
          className="w-full mb-4 py-3 px-6 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow transition-colors duration-200 disabled:opacity-60"
          onClick={handleFind}
          disabled={loadingFind}
        >{loadingFind ? 'Buscando...' : 'Encuéntrame un cargador'}</button>
        <button
          className="w-full py-3 px-6 rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-semibold shadow transition-colors duration-200"
          onClick={async () => {
            setShowChargerList(true);
            setProposal(null);
            setShowConfirm(false);
            setLoadingReserve(true);
            setFeedback(null);
            setLoadingFind(false); // Cierra el loading de encontrar si estaba activo
            try {
              let maxDistance = 10000;
              let chargers: any[] = [];
              for (let tries = 0; tries < 20; tries++) {
                const chargersRes = await fetch(`${import.meta.env.VITE_API_URL}/api/chargers/nearby?latitude=0&longitude=0&maxDistance=${maxDistance}`);
                chargers = await chargersRes.json();
                if (chargers.length) break;
                maxDistance *= 2;
              }
              setChargersList(chargers);
              if (!chargers.length) setFeedback('No se encontraron cargadores cercanos.');
            } catch (e) {
              setFeedback('No se pudieron cargar los cargadores.');
            } finally {
              setLoadingReserve(false);
            }
          }}
          disabled={loadingReserve}
        >{loadingReserve ? 'Buscando...' : 'Reservar un cargador'}</button>
  {showChargerList && (
          <div className="mt-6 w-full bg-indigo-50 dark:bg-indigo-800 rounded p-4 text-gray-800 dark:text-gray-100">
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
                className="flex-1 py-2 rounded bg-green-600 hover:bg-green-700 text-white font-semibold"
                disabled={!selectedCharger || loadingReserve}
                onClick={async () => {
                  if (!selectedCharger || !selectedVehicle) return;
                  setLoadingReserve(true);
                  setFeedback(null);
                  try {
                    // Calcular energía faltante y tiempo de carga
                    const batteryCapacity = selectedVehicle.batteryCapacity;
                    const currentChargeLevel = selectedVehicle.currentChargeLevel;
                    const energyNeeded = batteryCapacity * (1 - currentChargeLevel / 100);
                    const power = selectedCharger.powerOutput || selectedCharger.power;
                    const chargeTimeHours = energyNeeded / power;
                    const chargeTimeMs = chargeTimeHours * 60 * 60 * 1000;
                    const now = new Date();
                    const startTime = now;
                    const endTime = new Date(now.getTime() + chargeTimeMs);
                    // Proponer reserva inmediata
                    setProposal({
                      charger: selectedCharger,
                      startTime,
                      endTime,
                      power,
                      chargeTimeHours
                    });
                    setShowConfirm(true);
                    setShowChargerList(false);
                  } catch (e) {
                    setFeedback('No se pudo calcular la reserva.');
                  } finally {
                    setLoadingReserve(false);
                  }
                }}
              >Proponer reserva</button>
              <button
                className="flex-1 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold"
                onClick={() => { setShowChargerList(false); setSelectedCharger(null); }}
                disabled={loadingReserve}
              >Cancelar</button>
            </div>
          </div>
        )}
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
        {feedback && <div className="mt-4 text-center text-green-600 dark:text-green-300">{feedback}</div>}
      </div>
    </div>
  );
};

export default ChargerOptionsModal;
