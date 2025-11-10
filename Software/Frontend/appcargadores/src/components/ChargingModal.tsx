import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/useAuth';

interface ChargingModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservationId: string;
  chargerId: string;
  vehicleId: string;
  adminId: string;
  chargerName?: string;
  vehicleName?: string;
}

interface ChargingSessionData {
  _id: string;
  status: 'waiting_confirmations' | 'admin_confirmed' | 'user_confirmed' | 'ready_to_start' | 'charging' | 'completed' | 'cancelled';
  adminConfirmedAt?: string | null;
  userConfirmedAt?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  energyDelivered: number;
  currentPower: number;
  energyCost: number;
  parkingCost: number;
  totalCost: number;
  createdAt: string;
  chargerId: {
    name: string;
    powerOutput: number;
    energy_cost?: number;
    parking_cost?: number;
  };
  vehicleId: {
    model: string;
  };
}

interface SimulatorStatus {
  isCharging: boolean;
  currentEnergy: number;
  startTime: string;
  duration: string;
  realTimeData: Array<{
    timestamp: string;
    power: number;
    energy: number;
  }>;
}

const ChargingModal: React.FC<ChargingModalProps> = ({
  isOpen,
  onClose,
  reservationId,
  chargerId,
  vehicleId,
  adminId
}) => {
  const { user } = useAuth();
  const [session, setSession] = useState<ChargingSessionData | null>(null);
  const [simulatorStatus, setSimulatorStatus] = useState<SimulatorStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0); // Tiempo desde creación en minutos

  const isAdmin = user?.role === 'station_admin';

  // Función para iniciar sesión de carga
  const initiateChargingSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/charging-sessions/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          reservationId,
          chargerId,
          vehicleId,
          userId: user?._id,
          adminId
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error iniciando sesión de carga');
      }

      const data = await response.json();
      setSession(data.session);
    } catch (err: any) {
      setError(err.message);
      console.error('Error iniciando sesión:', err);
    } finally {
      setLoading(false);
    }
  }, [reservationId, chargerId, vehicleId, adminId, user]);

  // Función para obtener estado de la sesión
  const fetchSessionStatus = useCallback(async (sessionId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/charging-sessions/${sessionId}/status`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) {
        throw new Error('Error obteniendo estado');
      }

      const data = await response.json();
      setSession(data.session);
      setSimulatorStatus(data.simulatorStatus);
    } catch (err: any) {
      console.error('Error obteniendo estado:', err);
    }
  }, []);

  // Función para confirmar participación
  const handleConfirm = useCallback(async () => {
    if (!session) return;

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const userType = isAdmin ? 'admin' : 'user';

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/charging-sessions/${session._id}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ userType })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error confirmando');
      }

      const data = await response.json();
      setSession(data.session);
    } catch (err: any) {
      setError(err.message);
      console.error('Error confirmando:', err);
    } finally {
      setLoading(false);
    }
  }, [session, isAdmin]);

  // Función para iniciar carga real
  const handleStartCharging = useCallback(async () => {
    if (!session) return;

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/charging-sessions/${session._id}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error iniciando carga');
      }

      const data = await response.json();
      setSession(data.session);
    } catch (err: any) {
      setError(err.message);
      console.error('Error iniciando carga:', err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Función para detener carga
  const handleStopCharging = useCallback(async () => {
    if (!session) return;

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const stoppedBy = isAdmin ? 'admin' : 'user';

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/charging-sessions/${session._id}/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ stoppedBy })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error deteniendo carga');
      }

      const data = await response.json();
      setSession(data.session);
    } catch (err: any) {
      setError(err.message);
      console.error('Error deteniendo carga:', err);
    } finally {
      setLoading(false);
    }
  }, [session, isAdmin]);

  // Función para cancelar sesión
  const handleCancel = useCallback(async () => {
    if (!session) return;

    const reason = prompt('¿Por qué deseas cancelar la sesión de carga?');
    if (!reason) return;

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const cancelledBy = isAdmin ? 'admin' : 'user';

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/charging-sessions/${session._id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ cancelledBy, reason })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error cancelando sesión');
      }

      const data = await response.json();
      setSession(data.session);
      
      // Cerrar modal tras cancelar
      setTimeout(() => onClose(), 2000);
    } catch (err: any) {
      setError(err.message);
      console.error('Error cancelando sesión:', err);
    } finally {
      setLoading(false);
    }
  }, [session, isAdmin, onClose]);

  // Efecto: Iniciar sesión cuando se abre el modal
  useEffect(() => {
    if (isOpen && reservationId) {
      // Primero verificar si ya existe una sesión para esta reserva
      const checkExistingSession = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(
            `${import.meta.env.VITE_API_URL}/api/charging-sessions/active/by-reservation/${reservationId}`,
            {
              headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              }
            }
          );

          if (!response.ok) throw new Error('Error verificando sesión');

          const data = await response.json();
          
          if (data.session) {
            // Ya existe una sesión, cargar su estado
            setSession(data.session);
          } else {
            // No existe, iniciar nueva sesión
            initiateChargingSession();
          }
        } catch (err) {
          console.error('Error verificando sesión existente:', err);
          // En caso de error, intentar iniciar nueva sesión
          initiateChargingSession();
        }
      };

      checkExistingSession();
    }
  }, [isOpen, reservationId, initiateChargingSession]);

  // Efecto: Polling para actualizar estado cada 30 segundos
  useEffect(() => {
    if (!session || !isOpen) return;

    const interval = setInterval(() => {
      fetchSessionStatus(session._id);
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [session, isOpen, fetchSessionStatus]);

  // Efecto: Calcular tiempo transcurrido desde creación
  useEffect(() => {
    if (!session) return;

    const calculateTimeElapsed = () => {
      const created = new Date(session.createdAt);
      const now = new Date();
      const diffMs = now.getTime() - created.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      setTimeElapsed(diffMins);
    };

    calculateTimeElapsed();
    const interval = setInterval(calculateTimeElapsed, 60000); // Actualizar cada minuto

    return () => clearInterval(interval);
  }, [session]);

  if (!isOpen) return null;

  // Determinar si el usuario actual ya confirmó
  const currentUserConfirmed = isAdmin ? !!session?.adminConfirmedAt : !!session?.userConfirmedAt;
  const otherUserConfirmed = isAdmin ? !!session?.userConfirmedAt : !!session?.adminConfirmedAt;

  // Mensajes de advertencia por timeout
  const showTimeoutOption = timeElapsed >= 5;
  const showTimeoutWarning = timeElapsed >= 10;
  const showAutoCancel = timeElapsed >= 15;

  return (
    <div className="modal">
      <div className="modal__panel" style={{ maxWidth: '600px', width: '90%' }}>
        {/* Header */}
        <div className="modal__header">
          <h2 className="heading-2">
            <i className="fas fa-bolt mr-2 text-yellow-500"></i>
            Sesión de Carga
          </h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Body */}
        <div className="modal__body">
          {loading && !session && (
            <div className="loading-center">
              <div className="spinner"></div>
              <p className="text-secondary mt-3">Iniciando sesión de carga...</p>
            </div>
          )}

          {error && (
            <div className="alert-error-box mb-4">
              <i className="fas fa-exclamation-circle mr-2"></i>
              {error}
            </div>
          )}

          {session && (
            <>
              {/* Información del cargador y vehículo */}
              <div className="detail-card mb-4">
                <div>
                  <span className="text-secondary">Cargador:</span>
                  <span className="text-primary-medium ml-2">{session.chargerId.name}</span>
                </div>
                <div className="mt-2">
                  <span className="text-secondary">Vehículo:</span>
                  <span className="text-primary-medium ml-2">{session.vehicleId.model}</span>
                </div>
                <div className="mt-2">
                  <span className="text-secondary">Potencia:</span>
                  <span className="text-primary-medium ml-2">{session.chargerId.powerOutput} kW</span>
                </div>
              </div>

              {/* Estado: Esperando confirmaciones */}
              {['waiting_confirmations', 'admin_confirmed', 'user_confirmed'].includes(session.status) && (
                <div className="info-box info-box--indigo mb-4">
                  <h3 className="font-semibold mb-2">
                    <i className="fas fa-clock mr-2"></i>
                    Esperando Confirmaciones
                  </h3>
                  <p className="text-sm mb-3">
                    Ambos usuarios deben confirmar su participación para iniciar la carga.
                  </p>

                  {/* Estado de confirmaciones */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <span>Administrador de estación:</span>
                      {session.adminConfirmedAt ? (
                        <span className="badge badge-green">
                          <i className="fas fa-check mr-1"></i>
                          Confirmado
                        </span>
                      ) : (
                        <span className="badge badge-blue">Pendiente</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Dueño de vehículo:</span>
                      {session.userConfirmedAt ? (
                        <span className="badge badge-green">
                          <i className="fas fa-check mr-1"></i>
                          Confirmado
                        </span>
                      ) : (
                        <span className="badge badge-blue">Pendiente</span>
                      )}
                    </div>
                  </div>

                  {/* Botón de confirmación */}
                  {!currentUserConfirmed && (
                    <button
                      onClick={handleConfirm}
                      disabled={loading}
                      className="btn btn-success btn-block"
                    >
                      <i className="fas fa-check-circle mr-2"></i>
                      Confirmar Participación
                    </button>
                  )}

                  {currentUserConfirmed && !otherUserConfirmed && (
                    <div className="alert alert-success mt-3">
                      <i className="fas fa-check-circle mr-2"></i>
                      Has confirmado. Esperando confirmación del otro usuario...
                    </div>
                  )}

                  {/* Advertencias de timeout */}
                  {showAutoCancel && (
                    <div className="alert alert-error mt-3">
                      <i className="fas fa-exclamation-triangle mr-2"></i>
                      La sesión será cancelada automáticamente por falta de confirmación.
                    </div>
                  )}

                  {showTimeoutWarning && !showAutoCancel && (
                    <div className="alert-error-box mt-3">
                      <i className="fas fa-exclamation-triangle mr-2"></i>
                      Han pasado {timeElapsed} minutos. La sesión se cancelará en {15 - timeElapsed} minutos si no hay confirmación.
                    </div>
                  )}

                  {/* Opción de cancelar después de 5 minutos */}
                  {showTimeoutOption && (
                    <button
                      onClick={handleCancel}
                      disabled={loading}
                      className="btn btn-outline-danger btn-sm btn-block mt-3"
                    >
                      <i className="fas fa-times-circle mr-2"></i>
                      Cancelar Sesión
                    </button>
                  )}
                </div>
              )}

              {/* Estado: Listo para iniciar */}
              {session.status === 'ready_to_start' && (
                <div className="info-box info-box--indigo mb-4">
                  <h3 className="font-semibold mb-2">
                    <i className="fas fa-check-double mr-2"></i>
                    Ambos Usuarios Confirmaron
                  </h3>
                  <p className="text-sm mb-4">
                    La sesión está lista para iniciar. Presiona el botón para comenzar la carga.
                  </p>
                  <button
                    onClick={handleStartCharging}
                    disabled={loading}
                    className="btn btn-success btn-block btn-tall"
                  >
                    <i className="fas fa-play mr-2"></i>
                    Iniciar Carga
                  </button>
                </div>
              )}

              {/* Estado: Cargando */}
              {session.status === 'charging' && simulatorStatus && (
                <div className="card card-indigo mb-4">
                  <h3 className="font-semibold mb-3">
                    <i className="fas fa-charging-station mr-2"></i>
                    Carga en Progreso
                  </h3>

                  {/* Métricas en tiempo real */}
                  <div className="grid grid-2 gap-4 mb-4">
                    <div className="detail-box">
                      <div className="text-secondary text-xs mb-1">Energía Entregada</div>
                      <div className="stat-value-lg text-green-600">
                        {simulatorStatus.currentEnergy.toFixed(2)} kWh
                      </div>
                    </div>
                    <div className="detail-box">
                      <div className="text-secondary text-xs mb-1">Tiempo Transcurrido</div>
                      <div className="stat-value-lg text-blue-600">
                        {Math.floor(parseFloat(simulatorStatus.duration))} min
                      </div>
                    </div>
                  </div>

                  {/* Indicador de progreso animado */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-secondary">Progreso</span>
                      <span className="text-sm font-semibold">
                        {((simulatorStatus.currentEnergy / 10) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
                        style={{ width: `${Math.min((simulatorStatus.currentEnergy / 10) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Botón detener carga */}
                  <button
                    onClick={handleStopCharging}
                    disabled={loading}
                    className="btn btn-danger btn-block"
                  >
                    <i className="fas fa-stop mr-2"></i>
                    Detener Carga
                  </button>
                </div>
              )}

              {/* Estado: Completada */}
              {session.status === 'completed' && (
                <div className="info-box info-box--indigo mb-4">
                  <h3 className="font-semibold mb-2">
                    <i className="fas fa-check-circle mr-2 text-green-500"></i>
                    Carga Completada
                  </h3>
                  <p className="text-sm mb-4">
                    Gracias por cargar con nosotros.
                  </p>

                  {/* Resumen final */}
                  <div className="detail-card">
                    <div className="detail-row">
                      <span className="detail-label">Energía cargada:</span>
                      <span className="detail-value">{session.energyDelivered.toFixed(2)} kWh</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Duración:</span>
                      <span className="detail-value">
                        {session.startedAt && session.endedAt
                          ? Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / (1000 * 60))
                          : 0} minutos
                      </span>
                    </div>
                    {session.totalCost > 0 && (
                      <>
                        <div className="detail-row">
                          <span className="detail-label">Costo energía:</span>
                          <span className="detail-value">${session.energyCost.toFixed(2)}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Costo estacionamiento:</span>
                          <span className="detail-value">${session.parkingCost.toFixed(2)}</span>
                        </div>
                        <div className="detail-row border-t-2 pt-2 mt-2">
                          <span className="detail-label font-bold">Total:</span>
                          <span className="detail-value font-bold text-lg">${session.totalCost.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <button onClick={onClose} className="btn btn-primary btn-block mt-4">
                    Cerrar
                  </button>
                </div>
              )}

              {/* Estado: Cancelada */}
              {session.status === 'cancelled' && (
                <div className="alert-red-box">
                  <i className="fas fa-times-circle mr-2"></i>
                  La sesión de carga fue cancelada.
                  <button onClick={onClose} className="btn btn-secondary btn-sm btn-block mt-3">
                    Cerrar
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChargingModal;
