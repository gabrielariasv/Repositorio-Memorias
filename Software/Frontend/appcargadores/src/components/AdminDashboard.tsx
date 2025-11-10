import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import ChargerForm from './ChargerForm';
import VerticalNavbar from './VerticalNavbar';
import { Charger, ChargerType, CHARGER_TYPE_LABELS } from '../models/Charger';
import NotificationBell from './NotificationBell';

interface AdminVehicle {
  _id: string;
  model: string;
  chargerType: string;
  batteryCapacity?: number;
  currentChargeLevel?: number;
}

interface AdminCharger {
  _id: string;
  name: string;
  chargerType: string;
  powerOutput?: number;
  status?: string;
  location?: {
    type?: string;
    coordinates?: [number, number];
  };
}

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: 'app_admin' | 'station_admin' | 'ev_user';
  vehicles: AdminVehicle[];
  ownedStations: AdminCharger[];
  createdAt?: string;
}

interface AdminReservation {
  _id: string;
  startTime?: string;
  endTime?: string;
  calculatedEndTime?: string;
  status?: string;
  vehicleId?: {
    _id: string;
    model?: string;
    chargerType?: string;
  } | null;
  chargerId?: {
    _id: string;
    name?: string;
    location?: {
      coordinates?: [number, number];
    } | null;
  } | null;
}

interface AdminSessionHistory {
  _id: string;
  startTime?: string;
  endTime?: string;
  energyDelivered?: number;
  duration?: number;
  vehicleId?: {
    _id: string;
    model?: string;
    chargerType?: string;
  } | null;
  chargerId?: {
    _id: string;
    name?: string;
    location?: {
      coordinates?: [number, number];
    } | null;
  } | null;
}

interface FeedbackMessage {
  type: 'success' | 'error';
  text: string;
}

type SectionKey = 'userData' | 'stations' | 'vehicles' | 'reservations' | 'history';

type SectionExpansionState = Record<SectionKey, boolean>;

// Crea estado inicial con todas las secciones colapsadas
const createDefaultExpandedSections = (): SectionExpansionState => ({
  userData: false,
  stations: false,
  vehicles: false,
  reservations: false,
  history: false
});

// Mapeo de claves de sección a IDs de contenido DOM para accesibilidad
const sectionContentIds: Record<SectionKey, string> = {
  userData: 'admin-section-user-data',
  stations: 'admin-section-stations',
  vehicles: 'admin-section-vehicles',
  reservations: 'admin-section-reservations',
  history: 'admin-section-history'
};

// Icono de chevron animado para secciones expandibles
const ChevronIcon: React.FC<{ expanded: boolean }> = ({ expanded }) => (
  <svg
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden="true"
    className={`h-4 w-4 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
  >
    <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.672l3.71-3.44a.75.75 0 1 1 1.04 1.08l-4.24 3.928a.75.75 0 0 1-1.04 0L5.21 8.31a.75.75 0 0 1 .02-1.1z" />
  </svg>
);

type VehicleFormState = {
  model: string;
  chargerType: string;
  batteryCapacity: string;
  currentChargeLevel: string;
};

const vehicleTypeOptions = ['Type1', 'Type2', 'CCS', 'CHAdeMO', 'Tesla'];

interface OverviewStats {
  totalVehicles: number;
  totalChargers: number;
  totalSessions: number;
  totalEnergy: number;
  totalReservations: number;
}

interface ChargerTypeStat {
  _id: string;
  count: number;
  avgPower: number;
}

interface EnergyMonthlyStat {
  _id: { year: number; month: number };
  totalEnergy: number;
  sessionCount: number;
}

interface TopVehicleStat {
  _id: string;
  totalEnergy: number;
  sessionCount: number;
  vehicle?: {
    _id: string;
    model?: string;
    chargerType?: string;
  };
}

interface UsageByHourStat {
  _id: number;
  sessionCount: number;
  totalEnergy: number;
}

// Componente: panel de estadísticas generales para administradores
const AdminOverview: React.FC = () => {
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [chargerTypeStats, setChargerTypeStats] = useState<ChargerTypeStat[]>([]);
  const [energyMonthlyStats, setEnergyMonthlyStats] = useState<EnergyMonthlyStat[]>([]);
  const [topVehiclesStats, setTopVehiclesStats] = useState<TopVehicleStat[]>([]);
  const [usageByHourStats, setUsageByHourStats] = useState<UsageByHourStat[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const [overviewRes, chargerTypesRes, energyMonthlyRes, topVehiclesRes, usageByHourRes] = await Promise.all([
        axios.get<OverviewStats>(`${import.meta.env.VITE_API_URL}/api/stats/overview`),
        axios.get<ChargerTypeStat[]>(`${import.meta.env.VITE_API_URL}/api/stats/charger-types`),
        axios.get<EnergyMonthlyStat[]>(`${import.meta.env.VITE_API_URL}/api/stats/energy-monthly`),
        axios.get<TopVehicleStat[]>(`${import.meta.env.VITE_API_URL}/api/stats/top-energy-vehicles`),
        axios.get<UsageByHourStat[]>(`${import.meta.env.VITE_API_URL}/api/stats/usage-by-hour`)
      ]);

      setOverviewStats(overviewRes.data);
      setChargerTypeStats(Array.isArray(chargerTypesRes.data) ? chargerTypesRes.data : []);
      setEnergyMonthlyStats(Array.isArray(energyMonthlyRes.data) ? energyMonthlyRes.data : []);
      setTopVehiclesStats(Array.isArray(topVehiclesRes.data) ? topVehiclesRes.data : []);
      setUsageByHourStats(Array.isArray(usageByHourRes.data) ? usageByHourRes.data : []);
    } catch (error: any) {
      const message = error?.response?.data?.error ?? error.message ?? 'No se pudieron obtener las estadísticas';
      setStatsError(message);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const integerFormatter = useMemo(() => new Intl.NumberFormat('es-CL'), []);
  const decimalFormatter = useMemo(
    () => new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }),
    []
  );

  const chargerTypeBreakdown = useMemo(() => {
    const total = chargerTypeStats.reduce((acc, curr) => acc + (curr.count ?? 0), 0);
    return chargerTypeStats.map((stat) => ({
      ...stat,
      label: CHARGER_TYPE_LABELS[stat._id as ChargerType] ?? stat._id,
      percentage: total ? (stat.count / total) * 100 : 0
    }));
  }, [chargerTypeStats]);

  const recentEnergyMonthly = useMemo(() => {
    const sorted = [...energyMonthlyStats].sort((a, b) => {
      if (a._id.year === b._id.year) {
        return a._id.month - b._id.month;
      }
      return a._id.year - b._id.year;
    });
    return sorted.slice(-6).reverse();
  }, [energyMonthlyStats]);

  const usageByHourComplete = useMemo(() => {
    const map = new Map(usageByHourStats.map((stat) => [stat._id, stat]));
    return Array.from({ length: 24 }, (_, hour) => {
      const stat = map.get(hour);
      return {
        hour,
        sessionCount: stat?.sessionCount ?? 0,
        totalEnergy: stat?.totalEnergy ?? 0
      };
    });
  }, [usageByHourStats]);

  const topVehiclesList = useMemo(() => {
    return topVehiclesStats.map((stat, index) => ({
      ...stat,
      rank: index + 1,
      name: stat.vehicle?.model ?? `Vehículo ${stat._id?.slice(-4) ?? ''}`,
      chargerType: stat.vehicle?.chargerType ?? '—'
    }));
  }, [topVehiclesStats]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="card card--2xl">
        <div className="flex-between-wrap-3">
          <div>
              <h2 className="heading-1">Resumen del sistema</h2>
              <p className="text-secondary">Indicadores globales recopilados desde la API.</p>
          </div>
          <button
            type="button"
            onClick={() => fetchStats()}
            className="btn btn-primary"
            disabled={statsLoading}
          >
            {statsLoading ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>

        {statsError && (
          <div className="mt-4 alert alert-error">
            {statsError}
          </div>
        )}

        {statsLoading && !overviewStats && (
          <div className="loading-state">
            <span className="spinner-inline"></span>
            Cargando estadísticas…
          </div>
        )}

        {overviewStats && (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <div className="card card-muted">
                <p className="stat-label">Vehículos registrados</p>
                <p className="mt-2 stat-value">{integerFormatter.format(overviewStats.totalVehicles ?? 0)}</p>
              </div>
              <div className="card card-muted">
                <p className="stat-label">Estaciones activas</p>
                <p className="mt-2 stat-value">{integerFormatter.format(overviewStats.totalChargers ?? 0)}</p>
              </div>
              <div className="card card-muted">
                <p className="stat-label">Sesiones históricas</p>
                <p className="mt-2 stat-value">{integerFormatter.format(overviewStats.totalSessions ?? 0)}</p>
              </div>
              <div className="card card-muted">
                <p className="stat-label">Energía entregada</p>
                <p className="mt-2 stat-value">{decimalFormatter.format(overviewStats.totalEnergy ?? 0)} kWh</p>
              </div>
              <div className="card card-muted">
                <p className="stat-label">Reservas totales</p>
                <p className="mt-2 stat-value">{integerFormatter.format(overviewStats.totalReservations ?? 0)}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="card">
                <div className="flex items-center justify-between">
                  <h3 className="heading-2">Distribución por tipo de cargador</h3>
                  <span className="text-caption">Top tipos</span>
                </div>
                {chargerTypeBreakdown.length ? (
                  <ul className="mt-4 space-y-3 text-body">
                    {chargerTypeBreakdown.map((stat) => (
                      <li key={stat._id} className="flex items-center justify-between gap-3">
                        <span className="text-primary-medium">{stat.label}</span>
                        <span className="text-secondary">
                          {integerFormatter.format(stat.count)} · {stat.percentage.toFixed(1)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-secondary">Sin datos disponibles.</p>
                )}
              </div>

              <div className="card">
                <h3 className="heading-2">Energía por mes</h3>
                {recentEnergyMonthly.length ? (
                  <div className="mt-4 max-h-56 overflow-y-auto">
                    <table className="min-w-full text-left text-body">
                      <thead className="thead-sticky">
                        <tr>
                          <th className="px-3 py-2">Mes</th>
                          <th className="px-3 py-2 text-right">Energía (kWh)</th>
                          <th className="px-3 py-2 text-right">Sesiones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentEnergyMonthly.map((entry) => {
                          const label = new Date(entry._id.year, entry._id.month - 1).toLocaleString('es-CL', { month: 'short', year: 'numeric' });
                          return (
                            <tr key={`${entry._id.year}-${entry._id.month}`} className="table-row">
                              <td className="px-3 py-2 text-primary-medium capitalize">{label}</td>
                              <td className="px-3 py-2 text-right">{decimalFormatter.format(entry.totalEnergy ?? 0)}</td>
                              <td className="px-3 py-2 text-right">{integerFormatter.format(entry.sessionCount ?? 0)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-4 text-secondary">Sin datos mensuales para mostrar.</p>
                )}
              </div>

              <div className="card">
                <h3 className="heading-2">Vehículos con mayor consumo</h3>
                {topVehiclesList.length ? (
                  <div className="mt-4 max-h-56 overflow-y-auto">
                    <table className="min-w-full text-left text-body">
                      <thead className="thead-sticky">
                        <tr>
                          <th className="px-3 py-2">#</th>
                          <th className="px-3 py-2">Vehículo</th>
                          <th className="px-3 py-2 text-right">Energía (kWh)</th>
                          <th className="px-3 py-2 text-right">Sesiones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topVehiclesList.map((vehicle) => (
                          <tr key={vehicle._id ?? vehicle.rank} className="table-row">
                            <td className="px-3 py-2 text-secondary">{vehicle.rank}</td>
                            <td className="px-3 py-2">
                              <div className="text-primary-medium">{vehicle.name}</div>
                              <div className="text-caption">{vehicle.chargerType}</div>
                            </td>
                            <td className="px-3 py-2 text-right">{decimalFormatter.format(vehicle.totalEnergy ?? 0)}</td>
                            <td className="px-3 py-2 text-right">{integerFormatter.format(vehicle.sessionCount ?? 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-4 text-secondary">Aún no hay consumos registrados.</p>
                )}
              </div>

              <div className="card">
                <h3 className="heading-2">Uso por hora del día</h3>
                <div className="mt-4 max-h-56 overflow-y-auto">
                  <table className="min-w-full text-left text-body">
                    <thead className="thead-sticky">
                      <tr>
                        <th className="px-3 py-2">Hora</th>
                        <th className="px-3 py-2 text-right">Sesiones</th>
                        <th className="px-3 py-2 text-right">Energía (kWh)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usageByHourComplete.map((entry) => (
                        <tr key={entry.hour} className="table-row">
                          <td className="px-3 py-2 text-primary-medium">{entry.hour.toString().padStart(2, '0')}:00</td>
                          <td className="px-3 py-2 text-right">{integerFormatter.format(entry.sessionCount)}</td>
                          <td className="px-3 py-2 text-right">{decimalFormatter.format(entry.totalEnergy)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

// Componente: panel de gestión de usuarios, cargadores, vehículos y reservas
const AdminManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({ name: '', email: '', password: '' });
  const [savingUser, setSavingUser] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);

  const [showChargerForm, setShowChargerForm] = useState(false);
  const [creatingCharger, setCreatingCharger] = useState(false);

  const [vehicleForm, setVehicleForm] = useState<VehicleFormState>({
    model: '',
    chargerType: vehicleTypeOptions[0],
    batteryCapacity: '',
    currentChargeLevel: ''
  });
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [creatingVehicle, setCreatingVehicle] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [reservationsError, setReservationsError] = useState<string | null>(null);
  const [reservationConfirmId, setReservationConfirmId] = useState<string | null>(null);
  const [cancellingReservationId, setCancellingReservationId] = useState<string | null>(null);

  const [history, setHistory] = useState<AdminSessionHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [expandedSections, setExpandedSections] = useState<SectionExpansionState>(() => createDefaultExpandedSections());
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);


  const resetFeedback = useCallback(() => {
    setFeedback(null);
  }, []);


  /**
   * Función: Obtener lista de usuarios con filtros opcionales
   * 
   * Permite búsqueda por:
   * - Término de búsqueda (nombre o email)
   * - Filtro por rol (app_admin, station_admin, ev_user)
   * 
   * Actualiza estado de usuarios para mostrar en tabla.
   */
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      // Construir parámetros de consulta según filtros activos
      const params: Record<string, string> = {};
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      if (roleFilter) {
        params.role = roleFilter;
      }
      const response = await axios.get<AdminUser[]>(`${import.meta.env.VITE_API_URL}/api/users`, { params });
      setUsers(response.data);
    } catch (error: any) {
      const message = error?.response?.data?.error ?? error.message ?? 'Error al buscar usuarios';
      setUsersError(message);
    } finally {
      setUsersLoading(false);
    }
  }, [searchTerm, roleFilter]);

  const fetchUserDetail = useCallback(async (userId: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const response = await axios.get<AdminUser>(`${import.meta.env.VITE_API_URL}/api/users/${userId}`);
      setSelectedUser(response.data);
      setEditForm({ name: response.data.name ?? '', email: response.data.email ?? '', password: '' });
    } catch (error: any) {
      const message = error?.response?.data?.error ?? error.message ?? 'Error al obtener el usuario';
      setDetailError(message);
      setSelectedUser(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const fetchUserReservations = useCallback(async (userId: string) => {
    setReservationsLoading(true);
    setReservationsError(null);
    try {
      const response = await axios.get<AdminReservation[]>(`${import.meta.env.VITE_API_URL}/api/users/${userId}/reservations`);
      setReservations(response.data);
    } catch (error: any) {
      const message = error?.response?.data?.error ?? error.message ?? 'No se pudieron obtener las reservas del usuario';
      setReservationsError(message);
    } finally {
      setReservationsLoading(false);
    }
  }, []);

  const fetchUserHistory = useCallback(async (userId: string) => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await axios.get<AdminSessionHistory[]>(`${import.meta.env.VITE_API_URL}/api/users/${userId}/history`);
      setHistory(response.data ?? []);
    } catch (error: any) {
      const message = error?.response?.data?.error ?? error.message ?? 'No se pudo obtener el historial del usuario';
      setHistoryError(message);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (selectedUserId) {
      fetchUserDetail(selectedUserId);
      fetchUserReservations(selectedUserId);
      fetchUserHistory(selectedUserId);
    } else {
      setSelectedUser(null);
      setReservations([]);
      setHistory([]);
      setReservationsError(null);
      setHistoryError(null);
      setReservationConfirmId(null);
  // (Revert) limpiar sólo estados propios del usuario
    }
  }, [selectedUserId, fetchUserDetail, fetchUserReservations, fetchUserHistory]);


  useEffect(() => {
    setExpandedSections(createDefaultExpandedSections());
    setShowVehicleForm(false);
    setShowChargerForm(false);
  }, [selectedUserId]);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
        setIsMobileDetailOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSearchSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    resetFeedback();
    fetchUsers();
  }, [fetchUsers, resetFeedback]);

  const handleSelectUser = useCallback((userId: string) => {
    resetFeedback();
    setSelectedUserId(userId);
    // Abrir modal en pantallas móviles
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsMobileDetailOpen(true);
    }
  }, [resetFeedback]);

  const handleEditChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Handler: Guardar cambios de usuario editado
   * 
   * Proceso:
   * 1. Validar que hay usuario seleccionado
   * 2. Construir payload (name, email, password opcional)
   * 3. Enviar PUT a /api/users/:id
   * 4. Actualizar estado local (selectedUser + lista)
   * 5. Limpiar campo password por seguridad
   * 6. Mostrar feedback de éxito/error
   * 
   * Permite editar datos básicos de cualquier usuario desde admin.
   */
  const handleSaveUser = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // VALIDACIÓN: Usuario debe estar seleccionado
    if (!selectedUser) {
      return;
    }

    setSavingUser(true);
    resetFeedback();
    
    try {
      // PASO 1: Construir payload (password solo si se ingresó)
      const payload: Record<string, string> = {
        name: editForm.name.trim(),
        email: editForm.email.trim()
      };
      if (editForm.password.trim()) {
        payload.password = editForm.password;
      }

      // PASO 2: Actualizar en backend
      const response = await axios.put<{ user: AdminUser }>(
        `${import.meta.env.VITE_API_URL}/api/users/${selectedUser._id}`,
        payload
      );

      const updated = response.data.user;
      
      // PASO 3 y 4: Actualizar estados locales
      setSelectedUser(updated);
      setEditForm((prev) => ({ ...prev, password: '' })); // Limpiar password
      setUsers((prev) => prev.map((user) => (user._id === updated._id ? updated : user)));
      
      // PASO 5: Feedback visual
      setFeedback({ type: 'success', text: 'Usuario actualizado correctamente.' });
    } catch (error: any) {
      const message = error?.response?.data?.error ?? error.message ?? 'No se pudo actualizar el usuario';
      setFeedback({ type: 'error', text: message });
    } finally {
      setSavingUser(false);
    }
  };

  /**
   * Handler: Eliminar cargador del usuario actual
   * 
   * Proceso:
   * 1. Enviar DELETE a /api/chargers/:id
   * 2. Recargar datos del usuario para actualizar lista
   * 3. Mostrar feedback de confirmación
   * 
   * Elimina cargador de la base de datos y actualiza UI.
   */
  const handleDeleteCharger = async (chargerId: string) => {
    if (!selectedUser) {
      return;
    }
    setDeletingId(chargerId);
    resetFeedback();
    try {
      // PASO 1: Eliminar del backend
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/chargers/${chargerId}`);
      
      // PASO 2: Refrescar lista de cargadores del usuario
      await fetchUserDetail(selectedUser._id);
      
      setFeedback({ type: 'success', text: 'Cargador eliminado correctamente.' });
    } catch (error: any) {
      const message = error?.response?.data?.error ?? error.message ?? 'No se pudo eliminar el cargador';
      setFeedback({ type: 'error', text: message });
    } finally {
      setDeletingId(null);
    }
  };

  /**
   * Handler: Crear nuevo cargador para el usuario actual
   * 
   * Proceso:
   * 1. Agregar ownerId del usuario al objeto cargador
   * 2. Enviar POST a /api/chargers
   * 3. Refrescar datos del usuario (incluye nuevo cargador)
   * 4. Cerrar formulario de creación
   * 5. Mostrar feedback de éxito
   * 
   * Permite agregar cargadores a station_admin desde panel de admin.
   */
  const handleCreateCharger = async (charger: Omit<Charger, '_id' | 'createdAt'>) => {
    if (!selectedUser) {
      return;
    }

    setCreatingCharger(true);
    resetFeedback();

    try {
      // PASO 1 y 2: Crear cargador con ownerId
      await axios.post(`${import.meta.env.VITE_API_URL}/api/chargers`, {
        ...charger,
        ownerId: selectedUser._id
      });
      
      // PASO 3: Refrescar usuario para ver nuevo cargador
      await fetchUserDetail(selectedUser._id);
      
      // PASO 4 y 5: Cerrar form y feedback
      setShowChargerForm(false);
      setFeedback({ type: 'success', text: 'Cargador agregado correctamente.' });
    } catch (error: any) {
      const message = error?.response?.data?.error ?? error.message ?? 'No se pudo agregar el cargador';
      setFeedback({ type: 'error', text: message });
    } finally {
      setCreatingCharger(false);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!selectedUser) {
      return;
    }
    setDeletingId(vehicleId);
    resetFeedback();
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/vehicles/${vehicleId}`);
      await fetchUserDetail(selectedUser._id);
      setFeedback({ type: 'success', text: 'Vehículo eliminado correctamente.' });
    } catch (error: any) {
      const message = error?.response?.data?.error ?? error.message ?? 'No se pudo eliminar el vehículo';
      setFeedback({ type: 'error', text: message });
    } finally {
      setDeletingId(null);
    }
  };

  const handleVehicleFormChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setVehicleForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateVehicle = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedUser) {
      return;
    }

    if (!vehicleForm.model.trim()) {
      setFeedback({ type: 'error', text: 'El modelo del vehículo es obligatorio.' });
      return;
    }

    const batteryCapacity = Number(vehicleForm.batteryCapacity);
    const currentChargeLevel = vehicleForm.currentChargeLevel ? Number(vehicleForm.currentChargeLevel) : 0;

    if (Number.isNaN(batteryCapacity) || batteryCapacity <= 0) {
      setFeedback({ type: 'error', text: 'La capacidad de batería debe ser un número positivo.' });
      return;
    }

    if (Number.isNaN(currentChargeLevel) || currentChargeLevel < 0 || currentChargeLevel > 100) {
      setFeedback({ type: 'error', text: 'El nivel de carga debe estar entre 0 y 100.' });
      return;
    }

    setCreatingVehicle(true);
    resetFeedback();

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/vehicles`, {
        userId: selectedUser._id,
        model: vehicleForm.model.trim(),
        chargerType: vehicleForm.chargerType,
        batteryCapacity,
        currentChargeLevel
      });
      await fetchUserDetail(selectedUser._id);
      setVehicleForm({ model: '', chargerType: vehicleTypeOptions[0], batteryCapacity: '', currentChargeLevel: '' });
      setShowVehicleForm(false);
      setFeedback({ type: 'success', text: 'Vehículo agregado correctamente.' });
    } catch (error: any) {
      const message = error?.response?.data?.error ?? error.message ?? 'No se pudo agregar el vehículo';
      setFeedback({ type: 'error', text: message });
    } finally {
      setCreatingVehicle(false);
    }
  };

  const handleRequestCancelReservation = (reservationId: string) => {
    setReservationConfirmId((current) => (current === reservationId ? null : reservationId));
  };

  const handleConfirmCancelReservation = async (reservationId: string) => {
    if (!selectedUser) {
      return;
    }

    setCancellingReservationId(reservationId);
    resetFeedback();
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/users/${selectedUser._id}/reservations/${reservationId}`);
      setFeedback({ type: 'success', text: 'Reserva cancelada correctamente.' });
      setReservationConfirmId(null);
      await fetchUserReservations(selectedUser._id);
    } catch (error: any) {
      const message = error?.response?.data?.error ?? error.message ?? 'No se pudo cancelar la reserva';
      setFeedback({ type: 'error', text: message });
    } finally {
      setCancellingReservationId(null);
    }
  };

  const handleDismissCancelReservation = () => {
    setReservationConfirmId(null);
  };

  const selectedUserSummary = useMemo(() => {
    if (!selectedUser) {
      return null;
    }
    return {
      chargers: selectedUser.ownedStations?.length ?? 0,
      vehicles: selectedUser.vehicles?.length ?? 0
    };
  }, [selectedUser]);

  const dateTimeFormatter = useMemo(
    () => new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' }),
    []
  );

  const numberFormatter = useMemo(
    () => new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }),
    []
  );

  const toggleSection = (section: SectionKey) => {
    setExpandedSections((prev) => {
      const isExpanded = prev[section];
      if (isExpanded) {
        if (section === 'vehicles') {
          setShowVehicleForm(false);
        }
        if (section === 'stations') {
          setShowChargerForm(false);
        }
        if (section === 'reservations') {
          setReservationConfirmId(null);
        }
      }
      return { ...prev, [section]: !isExpanded };
    });
  };

  const handleCloseMobileDetail = () => {
    setIsMobileDetailOpen(false);
  };

  return (
    <>
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="card card--2xl">
          <form onSubmit={handleSearchSubmit} className="grid gap-4 md:grid-cols-[1.5fr_1fr_auto] md:items-end">
            <div>
              <label className="form-label">Buscar usuarios</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Nombre o correo electrónico"
                className="input"
              />
            </div>
            <div>
              <label className="form-label">Filtrar por rol</label>
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="input"
              >
                <option value="">Todos</option>
                <option value="app_admin">Administrador general</option>
                <option value="station_admin">Dueño de estación</option>
                <option value="ev_user">Dueño de vehículo</option>
              </select>
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-tall"
              disabled={usersLoading}
            >
              {usersLoading ? 'Buscando…' : 'Buscar'}
            </button>
          </form>
          {usersError && (
            <div className="mt-4 alert-error-box">
              {usersError}
            </div>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-[350px_1fr]">
          <div className={`rounded-2xl bg-white shadow dark:bg-gray-800 ${isMobileDetailOpen ? 'hidden' : ''}`}>
            <div className="list-panel">
              <div className="panel-header">
                <h2 className="heading-2">Usuarios</h2>
                <p className="mt-1 text-caption">
                  {usersLoading ? 'Buscando usuarios…' : `${users.length} usuario${users.length === 1 ? '' : 's'} encontrados`}
                </p>
              </div>
              <div className="scroll-content scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                <div className="space-y-3 p-4">
                  {usersLoading && (
                    <div className="info-loading">
                      Cargando usuarios…
                    </div>
                  )}
                  {!usersLoading && users.length === 0 && (
                    <div className="info-box info-box--dashed">
                      No se encontraron usuarios con esos criterios.
                    </div>
                  )}
                  {users.map((user) => {
                    const isSelected = user._id === selectedUserId;
                    return (
                      <button
                        key={user._id}
                        type="button"
                        onClick={() => handleSelectUser(user._id)}
                        className={`w-full rounded-xl border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isSelected
                            ? 'user-item-selected'
                            : 'user-item-default'
                        }`}
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span className="item-title">{user.name}</span>
                          <span className="info-label">
                            {user.role.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="mt-1 text-caption">{user.email}</div>
                        <div className="mt-2 flex gap-3 text-caption">
                          <span>{user.vehicles?.length ?? 0} vehículos</span>
                          <span>{user.ownedStations?.length ?? 0} estaciones</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Vista Desktop - oculta completamente en móvil */}
          <div className="hidden card card--2xl lg:block">
            {!selectedUser && !detailLoading && (
              <div className="center-content">
                Selecciona un usuario para ver y editar su información.
              </div>
            )}

            {detailLoading && (
              <div className="loading-message">
                Cargando detalles del usuario…
              </div>
            )}

            {detailError && (
              <div className="mb-4 alert-error-box">
                {detailError}
              </div>
            )}

            {selectedUser && !detailLoading && (
              <div className="space-y-6">
                <header className="flex-between-wrap-4">
                  <div>
                    <h2 className="stat-value">{selectedUser.name}</h2>
                    <p className="text-secondary">{selectedUser.email}</p>
                  </div>
                  {selectedUserSummary && (
                    <div className="flex gap-4 text-secondary">
                      <div>
                        <div className="text-xl item-title">{selectedUserSummary.vehicles}</div>
                        <div>Vehículos</div>
                      </div>
                      <div>
                        <div className="text-xl item-title">{selectedUserSummary.chargers}</div>
                        <div>Estaciones</div>
                      </div>
                    </div>
                  )}
                </header>

                {feedback && (
                  <div
                    className={`rounded-lg border p-3 text-sm ${
                      feedback.type === 'success'
                        ? 'alert-success-box'
                        : 'alert-red-box'
                    }`}
                  >
                    {feedback.text}
                  </div>
                )}

                <section className="space-y-4">
                  <button
                    type="button"
                    onClick={() => toggleSection('userData')}
                    aria-expanded={expandedSections.userData}
                    aria-controls={sectionContentIds.userData}
                    className="section-toggle"
                  >
                    <span>Datos del usuario</span>
                    <ChevronIcon expanded={expandedSections.userData} />
                  </button>
                  {expandedSections.userData && (
                    <form
                      id={sectionContentIds.userData}
                      onSubmit={handleSaveUser}
                      className="grid gap-4 sm:grid-cols-2"
                    >
                    <div className="sm:col-span-2">
                      <label className="form-label">Nombre</label>
                      <input
                        type="text"
                        name="name"
                        value={editForm.name}
                        onChange={handleEditChange}
                        className="input"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="form-label">Correo electrónico</label>
                      <input
                        type="email"
                        name="email"
                        value={editForm.email}
                        onChange={handleEditChange}
                        className="input"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="form-label">Nueva contraseña</label>
                      <input
                        type="password"
                        name="password"
                        value={editForm.password}
                        onChange={handleEditChange}
                        placeholder="Dejar en blanco para mantener"
                        className="input"
                      />
                    </div>
                    <div className="sm:col-span-2 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (!selectedUser) return;
                          setEditForm({ name: selectedUser.name ?? '', email: selectedUser.email ?? '', password: '' });
                          resetFeedback();
                        }}
                        className="btn btn-outline"
                      >
                        Restablecer
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={savingUser}
                      >
                        {savingUser ? 'Guardando…' : 'Guardar cambios'}
                      </button>
                    </div>
                    </form>
                  )}
                </section>

                {selectedUser.role === 'station_admin' && (
                  <section className="space-y-4">
                    <div className="flex-between-wrap-3">
                      <button
                        type="button"
                        onClick={() => toggleSection('stations')}
                        aria-expanded={expandedSections.stations}
                        aria-controls={sectionContentIds.stations}
                        className="section-toggle-gap"
                      >
                        <span>Estaciones de carga</span>
                        <ChevronIcon expanded={expandedSections.stations} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowChargerForm(true);
                          resetFeedback();
                          setExpandedSections((prev) => ({ ...prev, stations: true }));
                        }}
                        className="btn btn-success"
                      >
                        Agregar estación
                      </button>
                    </div>
                    {expandedSections.stations && (
                      <div id={sectionContentIds.stations} className="space-y-4">
                        {showChargerForm && (
                          <div className="card">
                            <ChargerForm
                              onSubmit={handleCreateCharger}
                              onCancel={() => setShowChargerForm(false)}
                            />
                            {creatingCharger && (
                              <div className="overlay">
                                <div className="info-box info-box--indigo info-box--sm">
                                  Guardando estación…
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="space-y-3">
                          {selectedUser.ownedStations?.length === 0 && (
                            <div className="info-box info-box--dashed">
                              No hay estaciones registradas para este usuario.
                            </div>
                          )}
                          {selectedUser.ownedStations?.map((charger) => (
                            <div
                              key={charger._id}
                              className="detail-card"
                            >
                              <div className="flex-1">
                                <div className="item-title">{charger.name}</div>
                                <div className="text-caption">
                                  {CHARGER_TYPE_LABELS[charger.chargerType as ChargerType] ?? charger.chargerType}
                                </div>
                                {Array.isArray(charger.location?.coordinates) && (
                                  <div className="mt-1 text-caption">
                                    Lat: {charger.location.coordinates[1]?.toFixed?.(4) ?? '--'} · Lng: {charger.location.coordinates[0]?.toFixed?.(4) ?? '--'}
                                  </div>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteCharger(charger._id)}
                                className="btn btn-outline-danger btn-compact"
                                disabled={deletingId === charger._id}
                              >
                                {deletingId === charger._id ? 'Eliminando…' : 'Eliminar'}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {selectedUser.role === 'ev_user' && (
                  <section className="space-y-4">
                    <div className="flex-between-wrap-3">
                      <button
                        type="button"
                        onClick={() => toggleSection('vehicles')}
                        aria-expanded={expandedSections.vehicles}
                        aria-controls={sectionContentIds.vehicles}
                        className="section-toggle-gap"
                      >
                        <span>Vehículos registrados</span>
                        <ChevronIcon expanded={expandedSections.vehicles} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowVehicleForm(true);
                          resetFeedback();
                          setExpandedSections((prev) => ({ ...prev, vehicles: true }));
                        }}
                        className="btn btn-success"
                      >
                        Agregar vehículo
                      </button>
                    </div>
                    {expandedSections.vehicles && (
                      <div id={sectionContentIds.vehicles} className="space-y-4">
                        <div className="space-y-3">
                          {selectedUser.vehicles?.length === 0 && (
                            <div className="info-box info-box--dashed">
                              Este usuario no tiene vehículos registrados.
                            </div>
                          )}
                          {selectedUser.vehicles?.map((vehicle) => (
                            <div
                              key={vehicle._id}
                              className="detail-card"
                            >
                              <div>
                                <div className="item-title">{vehicle.model}</div>
                                <div className="text-caption">Tipo de cargador: {vehicle.chargerType}</div>
                                <div className="text-caption">Capacidad: {vehicle.batteryCapacity ?? '--'} kWh</div>
                                <div className="text-caption">Nivel actual: {vehicle.currentChargeLevel ?? '--'}%</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteVehicle(vehicle._id)}
                                className="btn btn-outline-danger btn-compact"
                                disabled={deletingId === vehicle._id}
                              >
                                {deletingId === vehicle._id ? 'Eliminando…' : 'Eliminar'}
                              </button>
                            </div>
                          ))}
                        </div>

                        {showVehicleForm && (
                          <form
                            onSubmit={handleCreateVehicle}
                            className="space-y-3 card"
                          >
                            <div>
                              <label className="form-label label-xs label-strong">Modelo</label>
                              <input
                                type="text"
                                name="model"
                                value={vehicleForm.model}
                                onChange={handleVehicleFormChange}
                                className="input"
                                required
                              />
                            </div>
                            <div>
                              <label className="form-label label-xs label-strong">Tipo de cargador</label>
                              <select
                                name="chargerType"
                                value={vehicleForm.chargerType}
                                onChange={handleVehicleFormChange}
                                className="input"
                              >
                                {vehicleTypeOptions.map((type) => (
                                  <option key={type} value={type}>
                                    {type}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="form-label label-xs label-strong">Capacidad de batería (kWh)</label>
                              <input
                                type="number"
                                name="batteryCapacity"
                                min="1"
                                step="0.1"
                                value={vehicleForm.batteryCapacity}
                                onChange={handleVehicleFormChange}
                                className="input"
                                required
                              />
                            </div>
                            <div>
                              <label className="form-label label-xs label-strong">Nivel actual (%)</label>
                              <input
                                type="number"
                                name="currentChargeLevel"
                                min="0"
                                max="100"
                                value={vehicleForm.currentChargeLevel}
                                onChange={handleVehicleFormChange}
                                className="input"
                              />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                              <button
                                type="button"
                                onClick={() => setShowVehicleForm(false)}
                                className="btn btn-outline btn-sm"
                              >
                                Cancelar
                              </button>
                              <button
                                type="submit"
                                className="btn btn-primary btn-xs"
                                disabled={creatingVehicle}
                              >
                                {creatingVehicle ? 'Guardando…' : 'Agregar vehículo'}
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    )}
                  </section>
                )}

                <section className="space-y-4">
                  <div className="flex-between-wrap-3">
                    <button
                      type="button"
                      onClick={() => toggleSection('reservations')}
                      aria-expanded={expandedSections.reservations}
                      aria-controls={sectionContentIds.reservations}
                      className="section-toggle-gap"
                    >
                      <span>Reservas del usuario</span>
                      <ChevronIcon expanded={expandedSections.reservations} />
                    </button>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => selectedUser && fetchUserReservations(selectedUser._id)}
                        className="btn btn-secondary btn-xs"
                        disabled={reservationsLoading}
                      >
                        {reservationsLoading ? 'Actualizando…' : 'Actualizar'}
                      </button>
                    </div>
                  </div>

                  {expandedSections.reservations && (
                    <div id={sectionContentIds.reservations} className="space-y-4">
                      {reservationsError && (
                        <div className="alert alert-error">
                          {reservationsError}
                        </div>
                      )}

                      {reservationsLoading && reservations.length === 0 && (
                        <div className="info-box info-box--indigo">
                          Cargando reservas…
                        </div>
                      )}

                      {!reservationsLoading && reservations.length === 0 && !reservationsError && (
                        <div className="info-box info-box--dashed">
                          Este usuario no tiene reservas activas.
                        </div>
                      )}

                      {reservations.length > 0 && (
                        <div className="space-y-3">
                          {reservations.map((reservation) => {
                            const startLabel = reservation.startTime ? dateTimeFormatter.format(new Date(reservation.startTime)) : '--';
                            const endLabel = reservation.calculatedEndTime
                              ? dateTimeFormatter.format(new Date(reservation.calculatedEndTime))
                              : reservation.endTime
                                ? dateTimeFormatter.format(new Date(reservation.endTime))
                                : '--';
                            const statusLabel = reservation.status ? reservation.status.replace(/_/g, ' ') : 'sin estado';
                            return (
                              <div
                                key={reservation._id}
                                className="reservation-item"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <div className="item-title">
                                      {reservation.chargerId?.name ?? 'Cargador desconocido'}
                                    </div>
                                    <div className="text-caption">
                                      {reservation.vehicleId?.model ?? 'Vehículo no asignado'} · {reservation.vehicleId?.chargerType ?? '—'}
                                    </div>
                                    <div className="mt-2 text-caption">
                                      Inicio: {startLabel}
                                    </div>
                                    <div className="text-caption">
                                      Fin estimado: {endLabel}
                                    </div>
                                  </div>
                                  <div className="flex-col-end">
                                    <span className={`badge ${
                                      reservation.status === 'cancelled'
                                        ? 'badge-red'
                                        : reservation.status === 'completed'
                                          ? 'badge-green'
                                          : 'badge-blue'
                                    }`}>
                                      {statusLabel}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleRequestCancelReservation(reservation._id)}
                                      className="btn btn-outline-danger btn-compact"
                                      disabled={cancellingReservationId === reservation._id}
                                    >
                                      {cancellingReservationId === reservation._id
                                        ? 'Cancelando…'
                                        : reservationConfirmId === reservation._id
                                          ? 'Ocultar advertencia'
                                          : 'Cancelar reserva'}
                                    </button>
                                  </div>
                                </div>

                                {reservationConfirmId === reservation._id && (
                                  <div className="info-box info-box--amber info-box--xs">
                                    <p className="font-semibold">¿Deseas cancelar esta reserva?</p>
                                    <p className="mt-1">Esta acción eliminará la reserva permanentemente de la base de datos.</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleConfirmCancelReservation(reservation._id)}
                                        className="btn btn-danger btn-compact"
                                        disabled={cancellingReservationId === reservation._id}
                                      >
                                        {cancellingReservationId === reservation._id ? 'Cancelando…' : 'Sí, cancelar'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={handleDismissCancelReservation}
                                        className="btn btn-outline btn-compact"
                                      >
                                        Mantener reserva
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </section>

                <section className="space-y-4">
                  <div className="flex-between-wrap-3">
                    <button
                      type="button"
                      onClick={() => toggleSection('history')}
                      aria-expanded={expandedSections.history}
                      aria-controls={sectionContentIds.history}
                      className="section-toggle-gap"
                    >
                      <span>Historial de sesiones</span>
                      <ChevronIcon expanded={expandedSections.history} />
                    </button>
                    <button
                      type="button"
                      onClick={() => selectedUser && fetchUserHistory(selectedUser._id)}
                      className="btn btn-secondary btn-xs"
                      disabled={historyLoading}
                    >
                      {historyLoading ? 'Actualizando…' : 'Actualizar'}
                    </button>
                  </div>

                  {expandedSections.history && (
                    <div id={sectionContentIds.history} className="space-y-4">
                      {historyError && (
                        <div className="alert alert-error">
                          {historyError}
                        </div>
                      )}

                      {historyLoading && history.length === 0 && (
                        <div className="info-box info-box--indigo">
                          Cargando historial…
                        </div>
                      )}

                      {!historyLoading && history.length === 0 && !historyError && (
                        <div className="info-box info-box--dashed">
                          Aún no hay sesiones registradas para este usuario.
                        </div>
                      )}

                      {history.length > 0 && (
                        <div className="table-container">
                          <table className="table-divided">
                            <thead className="thead">
                              <tr>
                                <th className="px-4 py-3">Vehículo</th>
                                <th className="px-4 py-3">Cargador</th>
                                <th className="px-4 py-3">Inicio</th>
                                <th className="px-4 py-3">Fin</th>
                                <th className="px-4 py-3 text-right">Energía (kWh)</th>
                                <th className="px-4 py-3 text-right">Duración</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                              {history.map((session) => (
                                <tr key={session._id} className="table-row">
                                  <td className="px-4 py-3">
                                    <div className="item-title">{session.vehicleId?.model ?? '—'}</div>
                                    <div className="text-caption">{session.vehicleId?.chargerType ?? '—'}</div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="item-title">{session.chargerId?.name ?? '—'}</div>
                                  </td>
                                  <td className="px-4 py-3">{session.startTime ? dateTimeFormatter.format(new Date(session.startTime)) : '—'}</td>
                                  <td className="px-4 py-3">{session.endTime ? dateTimeFormatter.format(new Date(session.endTime)) : '—'}</td>
                                  <td className="px-4 py-3 text-right">{session.energyDelivered != null ? numberFormatter.format(session.energyDelivered) : '—'}</td>
                                  <td className="px-4 py-3 text-right">{session.duration != null ? `${session.duration} min` : '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Modal móvil para detalles del usuario */}
      {isMobileDetailOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 lg:hidden">
          <div className="flex h-full flex-col">
            {/* Header del modal */}
            <div className="modal__header">
              <button
                type="button"
                onClick={handleCloseMobileDetail}
                className="btn btn-ghost btn-sm"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium">Volver</span>
              </button>
              <h2 className="heading-2">
                Detalles del Usuario
              </h2>
            </div>

            {/* Contenido scrolleable */}
            <div className="flex-1 overflow-y-auto bg-gray-50 p-4 dark:bg-gray-900">
              {!detailLoading && (
                <div className="space-y-6">
                  <header className="flex-between-wrap-4">
                    <div>
                      <h3 className="stat-value">{selectedUser.name}</h3>
                      <p className="text-secondary">{selectedUser.email}</p>
                    </div>
                    {selectedUserSummary && (
                      <div className="flex gap-4 text-secondary">
                        <div>
                          <div className="text-xl item-title">{selectedUserSummary.vehicles}</div>
                          <div>Vehículos</div>
                        </div>
                        <div>
                          <div className="text-xl item-title">{selectedUserSummary.chargers}</div>
                          <div>Estaciones</div>
                        </div>
                      </div>
                    )}
                  </header>

                  {feedback && (
                    <div
                      className={`rounded-lg border p-3 text-sm ${
                        feedback.type === 'success'
                          ? 'alert-success-box'
                          : 'alert-red-box'
                      }`}
                    >
                      {feedback.text}
                    </div>
                  )}

                  <section className="section-mobile">
                    <button
                      type="button"
                      onClick={() => toggleSection('userData')}
                      aria-expanded={expandedSections.userData}
                      aria-controls={sectionContentIds.userData}
                      className="section-toggle"
                    >
                      <span>Datos del usuario</span>
                      <ChevronIcon expanded={expandedSections.userData} />
                    </button>
                    {expandedSections.userData && (
                      <form
                        id={sectionContentIds.userData}
                        onSubmit={handleSaveUser}
                        className="grid gap-4 sm:grid-cols-2"
                      >
                        <div className="sm:col-span-2">
                          <label className="form-label">Nombre</label>
                          <input
                            type="text"
                            name="name"
                            value={editForm.name}
                            onChange={handleEditChange}
                            className="input"
                            required
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="form-label">Correo electrónico</label>
                          <input
                            type="email"
                            name="email"
                            value={editForm.email}
                            onChange={handleEditChange}
                            className="input"
                            required
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="form-label">Nueva contraseña</label>
                          <input
                            type="password"
                            name="password"
                            value={editForm.password}
                            onChange={handleEditChange}
                            placeholder="Dejar en blanco para mantener"
                            className="input"
                          />
                        </div>
                        <div className="sm:col-span-2 flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              if (!selectedUser) return;
                              setEditForm({ name: selectedUser.name ?? '', email: selectedUser.email ?? '', password: '' });
                              resetFeedback();
                            }}
                            className="btn btn-outline"
                          >
                            Restablecer
                          </button>
                          <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={savingUser}
                          >
                            {savingUser ? 'Guardando…' : 'Guardar cambios'}
                          </button>
                        </div>
                      </form>
                    )}
                  </section>

                  {selectedUser.role === 'station_admin' && (
                    <section className="section-mobile">
                      <div className="flex-between-wrap-3">
                        <button
                          type="button"
                          onClick={() => toggleSection('stations')}
                          aria-expanded={expandedSections.stations}
                          aria-controls={sectionContentIds.stations}
                          className="section-toggle-gap"
                        >
                          <span>Estaciones de carga</span>
                          <ChevronIcon expanded={expandedSections.stations} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowChargerForm(true);
                            resetFeedback();
                            setExpandedSections((prev) => ({ ...prev, stations: true }));
                          }}
                          className="btn btn-success"
                        >
                          Agregar estación
                        </button>
                      </div>
                      {expandedSections.stations && (
                        <div id={sectionContentIds.stations} className="space-y-4">
                          {showChargerForm && (
                            <div className="card">
                              <ChargerForm
                                onSubmit={handleCreateCharger}
                                onCancel={() => setShowChargerForm(false)}
                              />
                              {creatingCharger && (
                                <div className="overlay">
                                  <div className="info-box info-box--indigo info-box--sm">
                                    Guardando estación…
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="space-y-3">
                            {selectedUser.ownedStations?.length === 0 && (
                              <div className="info-box info-box--dashed">
                                No hay estaciones registradas para este usuario.
                              </div>
                            )}
                            {selectedUser.ownedStations?.map((charger) => (
                              <div
                                key={charger._id}
                                className="detail-card"
                              >
                                <div>
                                  <div className="item-title">{charger.name}</div>
                                  <div className="text-caption">
                                    {CHARGER_TYPE_LABELS[charger.chargerType as ChargerType] ?? charger.chargerType}
                                  </div>
                                  {Array.isArray(charger.location?.coordinates) && (
                                    <div className="mt-1 text-caption">
                                      Lat: {charger.location.coordinates[1]?.toFixed?.(4) ?? '--'} · Lng: {charger.location.coordinates[0]?.toFixed?.(4) ?? '--'}
                                    </div>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCharger(charger._id)}
                                  className="btn btn-outline-danger btn-compact"
                                  disabled={deletingId === charger._id}
                                >
                                  {deletingId === charger._id ? 'Eliminando…' : 'Eliminar'}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </section>
                  )}

                  {selectedUser.role === 'ev_user' && (
                    <section className="section-mobile">
                      <div className="flex-between-wrap-3">
                        <button
                          type="button"
                          onClick={() => toggleSection('vehicles')}
                          aria-expanded={expandedSections.vehicles}
                          aria-controls={sectionContentIds.vehicles}
                          className="section-toggle-gap"
                        >
                          <span>Vehículos registrados</span>
                          <ChevronIcon expanded={expandedSections.vehicles} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowVehicleForm(true);
                            resetFeedback();
                            setExpandedSections((prev) => ({ ...prev, vehicles: true }));
                          }}
                          className="btn btn-success"
                        >
                          Agregar vehículo
                        </button>
                      </div>
                      {expandedSections.vehicles && (
                        <div id={sectionContentIds.vehicles} className="space-y-4">
                          <div className="space-y-3">
                            {selectedUser.vehicles?.length === 0 && (
                              <div className="info-box info-box--dashed">
                                Este usuario no tiene vehículos registrados.
                              </div>
                            )}
                            {selectedUser.vehicles?.map((vehicle) => (
                              <div
                                key={vehicle._id}
                                className="detail-card"
                              >
                                <div>
                                  <div className="item-title">{vehicle.model}</div>
                                  <div className="text-caption">Tipo de cargador: {vehicle.chargerType}</div>
                                  <div className="text-caption">Capacidad: {vehicle.batteryCapacity ?? '--'} kWh</div>
                                  <div className="text-caption">Nivel actual: {vehicle.currentChargeLevel ?? '--'}%</div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteVehicle(vehicle._id)}
                                  className="btn btn-outline-danger btn-compact"
                                  disabled={deletingId === vehicle._id}
                                >
                                  {deletingId === vehicle._id ? 'Eliminando…' : 'Eliminar'}
                                </button>
                              </div>
                            ))}
                          </div>

                          {showVehicleForm && (
                            <form
                              onSubmit={handleCreateVehicle}
                              className="space-y-3 card"
                            >
                              <div>
                                <label className="form-label label-xs label-strong">Modelo</label>
                                <input
                                  type="text"
                                  name="model"
                                  value={vehicleForm.model}
                                  onChange={handleVehicleFormChange}
                                  className="input"
                                  required
                                />
                              </div>
                              <div>
                                <label className="form-label label-xs label-strong">Tipo de cargador</label>
                                <select
                                  name="chargerType"
                                  value={vehicleForm.chargerType}
                                  onChange={handleVehicleFormChange}
                                  className="input"
                                >
                                  {vehicleTypeOptions.map((type) => (
                                    <option key={type} value={type}>
                                      {type}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="form-label label-xs label-strong">Capacidad de batería (kWh)</label>
                                <input
                                  type="number"
                                  name="batteryCapacity"
                                  min="1"
                                  step="0.1"
                                  value={vehicleForm.batteryCapacity}
                                  onChange={handleVehicleFormChange}
                                  className="input"
                                  required
                                />
                              </div>
                              <div>
                                <label className="form-label label-xs label-strong">Nivel actual (%)</label>
                                <input
                                  type="number"
                                  name="currentChargeLevel"
                                  min="0"
                                  max="100"
                                  value={vehicleForm.currentChargeLevel}
                                  onChange={handleVehicleFormChange}
                                  className="input"
                                />
                              </div>
                              <div className="flex justify-end gap-3 pt-2">
                                <button
                                  type="button"
                                  onClick={() => setShowVehicleForm(false)}
                                  className="btn btn-outline btn-sm"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="submit"
                                  className="btn btn-primary btn-xs"
                                  disabled={creatingVehicle}
                                >
                                  {creatingVehicle ? 'Guardando…' : 'Agregar vehículo'}
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      )}
                    </section>
                  )}

                  <section className="section-mobile">
                    <div className="flex-between-wrap-3">
                      <button
                        type="button"
                        onClick={() => toggleSection('reservations')}
                        aria-expanded={expandedSections.reservations}
                        aria-controls={sectionContentIds.reservations}
                        className="section-toggle-gap"
                      >
                        <span>Reservas del usuario</span>
                        <ChevronIcon expanded={expandedSections.reservations} />
                      </button>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => selectedUser && fetchUserReservations(selectedUser._id)}
                          className="btn btn-secondary btn-xs"
                          disabled={reservationsLoading}
                        >
                          {reservationsLoading ? 'Actualizando…' : 'Actualizar'}
                        </button>
                      </div>
                    </div>

                    {expandedSections.reservations && (
                      <div id={sectionContentIds.reservations} className="space-y-4">
                        {reservationsError && (
                          <div className="alert alert-error">
                            {reservationsError}
                          </div>
                        )}

                        {reservationsLoading && reservations.length === 0 && (
                          <div className="info-box info-box--indigo">
                            Cargando reservas…
                          </div>
                        )}

                        {!reservationsLoading && reservations.length === 0 && !reservationsError && (
                          <div className="info-box info-box--dashed">
                            Este usuario no tiene reservas activas.
                          </div>
                        )}

                        {reservations.length > 0 && (
                          <div className="space-y-3">
                            {reservations.map((reservation) => {
                              const startLabel = reservation.startTime ? dateTimeFormatter.format(new Date(reservation.startTime)) : '--';
                              const endLabel = reservation.calculatedEndTime
                                ? dateTimeFormatter.format(new Date(reservation.calculatedEndTime))
                                : reservation.endTime
                                  ? dateTimeFormatter.format(new Date(reservation.endTime))
                                  : '--';
                              const statusLabel = reservation.status ? reservation.status.replace(/_/g, ' ') : 'sin estado';
                              return (
                                <div
                                  key={reservation._id}
                                  className="reservation-item"
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                      <div className="item-title">
                                        {reservation.chargerId?.name ?? 'Cargador desconocido'}
                                      </div>
                                      <div className="text-caption">
                                        {reservation.vehicleId?.model ?? 'Vehículo no asignado'} · {reservation.vehicleId?.chargerType ?? '—'}
                                      </div>
                                      <div className="mt-2 text-caption">
                                        Inicio: {startLabel}
                                      </div>
                                      <div className="text-caption">
                                        Fin estimado: {endLabel}
                                      </div>
                                    </div>
                                    <div className="flex-col-end">
                                      <span className={`badge ${
                                        reservation.status === 'cancelled'
                                          ? 'badge-red'
                                          : reservation.status === 'completed'
                                            ? 'badge-green'
                                            : 'badge-blue'
                                      }`}>
                                        {statusLabel}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleRequestCancelReservation(reservation._id)}
                                        className="btn btn-outline-danger btn-compact"
                                        disabled={cancellingReservationId === reservation._id}
                                      >
                                        {cancellingReservationId === reservation._id
                                          ? 'Cancelando…'
                                          : reservationConfirmId === reservation._id
                                            ? 'Ocultar advertencia'
                                            : 'Cancelar reserva'}
                                      </button>
                                    </div>
                                  </div>

                                  {reservationConfirmId === reservation._id && (
                                    <div className="info-box info-box--amber info-box--xs">
                                      <p className="font-semibold">¿Deseas cancelar esta reserva?</p>
                                      <p className="mt-1">Esta acción eliminará la reserva permanentemente de la base de datos.</p>
                                      <div className="mt-3 flex flex-wrap gap-2">
                                        <button
                                          type="button"
                                          onClick={() => handleConfirmCancelReservation(reservation._id)}
                                          className="btn btn-danger btn-compact"
                                          disabled={cancellingReservationId === reservation._id}
                                        >
                                          {cancellingReservationId === reservation._id ? 'Cancelando…' : 'Sí, cancelar'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={handleDismissCancelReservation}
                                          className="btn btn-outline btn-compact"
                                        >
                                          Mantener reserva
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </section>

                  <section className="section-mobile">
                    <div className="flex-between-wrap-3">
                      <button
                        type="button"
                        onClick={() => toggleSection('history')}
                        aria-expanded={expandedSections.history}
                        aria-controls={sectionContentIds.history}
                        className="section-toggle-gap"
                      >
                        <span>Historial de sesiones</span>
                        <ChevronIcon expanded={expandedSections.history} />
                      </button>
                      <button
                        type="button"
                        onClick={() => selectedUser && fetchUserHistory(selectedUser._id)}
                        className="btn btn-secondary btn-xs"
                        disabled={historyLoading}
                      >
                        {historyLoading ? 'Actualizando…' : 'Actualizar'}
                      </button>
                    </div>

                    {expandedSections.history && (
                      <div id={sectionContentIds.history} className="space-y-4">
                        {historyError && (
                          <div className="alert alert-error">
                            {historyError}
                          </div>
                        )}

                        {historyLoading && history.length === 0 && (
                          <div className="info-box info-box--indigo">
                            Cargando historial…
                          </div>
                        )}

                        {!historyLoading && history.length === 0 && !historyError && (
                          <div className="info-box info-box--dashed">
                            Aún no hay sesiones registradas para este usuario.
                          </div>
                        )}

                        {history.length > 0 && (
                          <div className="table-container">
                            <table className="table-divided">
                              <thead className="thead">
                                <tr>
                                  <th className="px-4 py-3">Vehículo</th>
                                  <th className="px-4 py-3">Cargador</th>
                                  <th className="px-4 py-3">Inicio</th>
                                  <th className="px-4 py-3">Fin</th>
                                  <th className="px-4 py-3 text-right">Energía (kWh)</th>
                                  <th className="px-4 py-3 text-right">Duración</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {history.map((session) => (
                                  <tr key={session._id} className="table-row">
                                    <td className="px-4 py-3">
                                      <div className="item-title">{session.vehicleId?.model ?? '—'}</div>
                                      <div className="text-caption">{session.vehicleId?.chargerType ?? '—'}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="item-title">{session.chargerId?.name ?? '—'}</div>
                                    </td>
                                    <td className="px-4 py-3">{session.startTime ? dateTimeFormatter.format(new Date(session.startTime)) : '—'}</td>
                                    <td className="px-4 py-3">{session.endTime ? dateTimeFormatter.format(new Date(session.endTime)) : '—'}</td>
                                    <td className="px-4 py-3 text-right">{session.energyDelivered != null ? numberFormatter.format(session.energyDelivered) : '—'}</td>
                                    <td className="px-4 py-3 text-right">{session.duration != null ? `${session.duration} min` : '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                </div>
              )}

              {detailLoading && (
                <div className="loading-message">
                  Cargando detalles del usuario…
                </div>
              )}

              {detailError && (
                <div className="alert-error-box">
                  {detailError}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </>
  );
};

// Componente: layout principal del dashboard de administrador con navegación
const AdminDashboardLayout: React.FC = () => (
  <div className="min-h-screen bg-gray-100 dark:bg-gray-900 lg:pl-64">
    <VerticalNavbar />
    <div className="flex min-h-screen flex-col overflow-hidden">
      <div className="header-actions">
        <NotificationBell />
      </div>
      <main className="flex-1 overflow-y-auto px-4 py-2 sm:px-6">
        <Routes>
          <Route path="/" element={<AdminOverview />} />
          <Route path="/overview" element={<Navigate to="/" replace />} />
          <Route path="/management" element={<AdminManagement />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  </div>
);

// Componente raíz: dashboard de administrador con enrutador
const AdminDashboard: React.FC = () => (
  <Router>
    <AdminDashboardLayout />
  </Router>
);

export default AdminDashboard;
