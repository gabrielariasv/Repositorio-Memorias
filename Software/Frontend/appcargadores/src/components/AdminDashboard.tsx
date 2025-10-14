import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import ChargerForm from './ChargerForm';
import VerticalNavbar from './VerticalNavbar';
import { Charger, ChargerType, CHARGER_TYPE_LABELS } from '../models/Charger';

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

const createDefaultExpandedSections = (): SectionExpansionState => ({
  userData: false,
  stations: false,
  vehicles: false,
  reservations: false,
  history: false
});

const sectionContentIds: Record<SectionKey, string> = {
  userData: 'admin-section-user-data',
  stations: 'admin-section-stations',
  vehicles: 'admin-section-vehicles',
  reservations: 'admin-section-reservations',
  history: 'admin-section-history'
};

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
      <section className="rounded-2xl bg-white p-6 shadow dark:bg-gray-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Resumen del sistema</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Indicadores globales recopilados desde la API.</p>
          </div>
          <button
            type="button"
            onClick={() => fetchStats()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            disabled={statsLoading}
          >
            {statsLoading ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>

        {statsError && (
          <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/60 dark:bg-red-900/20 dark:text-red-200">
            {statsError}
          </div>
        )}

        {statsLoading && !overviewStats && (
          <div className="mt-6 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-300">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></span>
            Cargando estadísticas…
          </div>
        )}

        {overviewStats && (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Vehículos registrados</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">{integerFormatter.format(overviewStats.totalVehicles ?? 0)}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Estaciones activas</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">{integerFormatter.format(overviewStats.totalChargers ?? 0)}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Sesiones históricas</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">{integerFormatter.format(overviewStats.totalSessions ?? 0)}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Energía entregada</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">{decimalFormatter.format(overviewStats.totalEnergy ?? 0)} kWh</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Reservas totales</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">{integerFormatter.format(overviewStats.totalReservations ?? 0)}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Distribución por tipo de cargador</h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Top tipos</span>
                </div>
                {chargerTypeBreakdown.length ? (
                  <ul className="mt-4 space-y-3 text-sm text-gray-700 dark:text-gray-200">
                    {chargerTypeBreakdown.map((stat) => (
                      <li key={stat._id} className="flex items-center justify-between gap-3">
                        <span className="font-medium">{stat.label}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {integerFormatter.format(stat.count)} · {stat.percentage.toFixed(1)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Sin datos disponibles.</p>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Energía por mes</h3>
                {recentEnergyMonthly.length ? (
                  <div className="mt-4 max-h-56 overflow-y-auto">
                    <table className="min-w-full text-left text-sm text-gray-700 dark:text-gray-200">
                      <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
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
                            <tr key={`${entry._id.year}-${entry._id.month}`} className="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-900 dark:even:bg-gray-800/70">
                              <td className="px-3 py-2 font-medium capitalize">{label}</td>
                              <td className="px-3 py-2 text-right">{decimalFormatter.format(entry.totalEnergy ?? 0)}</td>
                              <td className="px-3 py-2 text-right">{integerFormatter.format(entry.sessionCount ?? 0)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Sin datos mensuales para mostrar.</p>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Vehículos con mayor consumo</h3>
                {topVehiclesList.length ? (
                  <div className="mt-4 max-h-56 overflow-y-auto">
                    <table className="min-w-full text-left text-sm text-gray-700 dark:text-gray-200">
                      <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        <tr>
                          <th className="px-3 py-2">#</th>
                          <th className="px-3 py-2">Vehículo</th>
                          <th className="px-3 py-2 text-right">Energía (kWh)</th>
                          <th className="px-3 py-2 text-right">Sesiones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topVehiclesList.map((vehicle) => (
                          <tr key={vehicle._id ?? vehicle.rank} className="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-900 dark:even:bg-gray-800/70">
                            <td className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">{vehicle.rank}</td>
                            <td className="px-3 py-2">
                              <div className="font-medium text-gray-900 dark:text-gray-100">{vehicle.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{vehicle.chargerType}</div>
                            </td>
                            <td className="px-3 py-2 text-right">{decimalFormatter.format(vehicle.totalEnergy ?? 0)}</td>
                            <td className="px-3 py-2 text-right">{integerFormatter.format(vehicle.sessionCount ?? 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Aún no hay consumos registrados.</p>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Uso por hora del día</h3>
                <div className="mt-4 max-h-56 overflow-y-auto">
                  <table className="min-w-full text-left text-sm text-gray-700 dark:text-gray-200">
                    <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      <tr>
                        <th className="px-3 py-2">Hora</th>
                        <th className="px-3 py-2 text-right">Sesiones</th>
                        <th className="px-3 py-2 text-right">Energía (kWh)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usageByHourComplete.map((entry) => (
                        <tr key={entry.hour} className="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-900 dark:even:bg-gray-800/70">
                          <td className="px-3 py-2 font-medium">{entry.hour.toString().padStart(2, '0')}:00</td>
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

  const [showChargerModal, setShowChargerModal] = useState(false);
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

  const resetFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
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
    }
  }, [selectedUserId, fetchUserDetail, fetchUserReservations, fetchUserHistory]);

  useEffect(() => {
    setExpandedSections(createDefaultExpandedSections());
    setShowVehicleForm(false);
  }, [selectedUserId]);

  const handleSearchSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    resetFeedback();
    fetchUsers();
  }, [fetchUsers, resetFeedback]);

  const handleSelectUser = useCallback((userId: string) => {
    resetFeedback();
    setSelectedUserId(userId);
  }, [resetFeedback]);

  const handleEditChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedUser) {
      return;
    }

    setSavingUser(true);
    resetFeedback();
    try {
      const payload: Record<string, string> = {
        name: editForm.name.trim(),
        email: editForm.email.trim()
      };
      if (editForm.password.trim()) {
        payload.password = editForm.password;
      }

      const response = await axios.put<{ user: AdminUser }>(
        `${import.meta.env.VITE_API_URL}/api/users/${selectedUser._id}`,
        payload
      );

      const updated = response.data.user;
      setSelectedUser(updated);
      setEditForm((prev) => ({ ...prev, password: '' }));
      setUsers((prev) => prev.map((user) => (user._id === updated._id ? updated : user)));
      setFeedback({ type: 'success', text: 'Usuario actualizado correctamente.' });
    } catch (error: any) {
      const message = error?.response?.data?.error ?? error.message ?? 'No se pudo actualizar el usuario';
      setFeedback({ type: 'error', text: message });
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteCharger = async (chargerId: string) => {
    if (!selectedUser) {
      return;
    }
    setDeletingId(chargerId);
    resetFeedback();
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/chargers/${chargerId}`);
      await fetchUserDetail(selectedUser._id);
      setFeedback({ type: 'success', text: 'Cargador eliminado correctamente.' });
    } catch (error: any) {
      const message = error?.response?.data?.error ?? error.message ?? 'No se pudo eliminar el cargador';
      setFeedback({ type: 'error', text: message });
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateCharger = async (charger: Omit<Charger, '_id' | 'createdAt'>) => {
    if (!selectedUser) {
      return;
    }

    setCreatingCharger(true);
    resetFeedback();

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/chargers`, {
        ...charger,
        ownerId: selectedUser._id
      });
      await fetchUserDetail(selectedUser._id);
      setShowChargerModal(false);
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
        if (section === 'reservations') {
          setReservationConfirmId(null);
        }
      }
      return { ...prev, [section]: !isExpanded };
    });
  };

  return (
    <>
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl bg-white p-6 shadow dark:bg-gray-800">
          <form onSubmit={handleSearchSubmit} className="grid gap-4 md:grid-cols-[1.5fr_1fr_auto] md:items-end">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">Buscar usuarios</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Nombre o correo electrónico"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">Filtrar por rol</label>
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              >
                <option value="">Todos</option>
                <option value="app_admin">Administrador general</option>
                <option value="station_admin">Dueño de estación</option>
                <option value="ev_user">Dueño de vehículo</option>
              </select>
            </div>
            <button
              type="submit"
              className="h-12 rounded-lg bg-indigo-600 px-6 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
              disabled={usersLoading}
            >
              {usersLoading ? 'Buscando…' : 'Buscar'}
            </button>
          </form>
          {usersError && (
            <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500 dark:bg-red-900/20 dark:text-red-200">
              {usersError}
            </div>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-[350px_1fr]">
          <div className="rounded-2xl bg-white shadow dark:bg-gray-800">
            <div className="flex h-[79vh] min-h-[500px] flex-col overflow-hidden rounded-2xl">
              <div className="flex-shrink-0 border-b border-gray-200 p-4 dark:border-gray-700 dark:bg-gray-800/80">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Usuarios</h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {usersLoading ? 'Buscando usuarios…' : `${users.length} usuario${users.length === 1 ? '' : 's'} encontrados`}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                <div className="space-y-3 p-4">
                  {usersLoading && (
                    <div className="flex items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-indigo-700 dark:border-indigo-800/60 dark:bg-indigo-900/20 dark:text-indigo-200">
                      Cargando usuarios…
                    </div>
                  )}
                  {!usersLoading && users.length === 0 && (
                    <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-600 dark:text-gray-300">
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
                            ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-900/30'
                            : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow dark:border-gray-700 dark:bg-gray-900'
                        }`}
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold text-gray-900 dark:text-gray-100">{user.name}</span>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                            {user.role.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                        <div className="mt-2 flex gap-3 text-xs text-gray-500 dark:text-gray-400">
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

          <div className="rounded-2xl bg-white p-6 shadow dark:bg-gray-800">
            {!selectedUser && !detailLoading && (
              <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-300">
                Selecciona un usuario para ver y editar su información.
              </div>
            )}

            {detailLoading && (
              <div className="flex h-full items-center justify-center text-gray-600 dark:text-gray-300">
                Cargando detalles del usuario…
              </div>
            )}

            {detailError && (
              <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500 dark:bg-red-900/20 dark:text-red-200">
                {detailError}
              </div>
            )}

            {selectedUser && !detailLoading && (
              <div className="space-y-6">
                <header className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{selectedUser.name}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{selectedUser.email}</p>
                  </div>
                  {selectedUserSummary && (
                    <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-300">
                      <div>
                        <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">{selectedUserSummary.vehicles}</div>
                        <div>Vehículos</div>
                      </div>
                      <div>
                        <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">{selectedUserSummary.chargers}</div>
                        <div>Estaciones</div>
                      </div>
                    </div>
                  )}
                </header>

                {feedback && (
                  <div
                    className={`rounded-lg border p-3 text-sm ${
                      feedback.type === 'success'
                        ? 'border-green-300 bg-green-50 text-green-700 dark:border-green-500/60 dark:bg-green-900/20 dark:text-green-200'
                        : 'border-red-300 bg-red-50 text-red-700 dark:border-red-500/60 dark:bg-red-900/20 dark:text-red-200'
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
                    className="flex w-full items-center justify-between text-left text-lg font-semibold text-gray-900 transition hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-gray-100 dark:hover:text-indigo-300"
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
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Nombre</label>
                      <input
                        type="text"
                        name="name"
                        value={editForm.name}
                        onChange={handleEditChange}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Correo electrónico</label>
                      <input
                        type="email"
                        name="email"
                        value={editForm.email}
                        onChange={handleEditChange}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Nueva contraseña</label>
                      <input
                        type="password"
                        name="password"
                        value={editForm.password}
                        onChange={handleEditChange}
                        placeholder="Dejar en blanco para mantener"
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
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
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        Restablecer
                      </button>
                      <button
                        type="submit"
                        className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
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
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => toggleSection('stations')}
                        aria-expanded={expandedSections.stations}
                        aria-controls={sectionContentIds.stations}
                        className="flex items-center gap-2 text-left text-lg font-semibold text-gray-900 transition hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-gray-100 dark:hover:text-indigo-300"
                      >
                        <span>Estaciones a cargo</span>
                        <ChevronIcon expanded={expandedSections.stations} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowChargerModal(true);
                          resetFeedback();
                          setExpandedSections((prev) => ({ ...prev, stations: true }));
                        }}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                      >
                        Agregar estación
                      </button>
                    </div>
                    {expandedSections.stations && (
                      <div id={sectionContentIds.stations} className="space-y-3">
                        {selectedUser.ownedStations?.length === 0 && (
                          <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-600 dark:text-gray-300">
                            No hay estaciones registradas para este usuario.
                          </div>
                        )}
                        {selectedUser.ownedStations?.map((charger) => (
                          <div
                            key={charger._id}
                            className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-200"
                          >
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-gray-100">{charger.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {CHARGER_TYPE_LABELS[charger.chargerType as ChargerType] ?? charger.chargerType}
                              </div>
                              {Array.isArray(charger.location?.coordinates) && (
                                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                  Lat: {charger.location.coordinates[1]?.toFixed?.(4) ?? '--'} · Lng: {charger.location.coordinates[0]?.toFixed?.(4) ?? '--'}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteCharger(charger._id)}
                              className="rounded-lg border border-red-300 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-500/60 dark:text-red-300 dark:hover:bg-red-900/20"
                              disabled={deletingId === charger._id}
                            >
                              {deletingId === charger._id ? 'Eliminando…' : 'Eliminar'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {selectedUser.role === 'ev_user' && (
                  <section className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => toggleSection('vehicles')}
                        aria-expanded={expandedSections.vehicles}
                        aria-controls={sectionContentIds.vehicles}
                        className="flex items-center gap-2 text-left text-lg font-semibold text-gray-900 transition hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-gray-100 dark:hover:text-indigo-300"
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
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                      >
                        Agregar vehículo
                      </button>
                    </div>
                    {expandedSections.vehicles && (
                      <div id={sectionContentIds.vehicles} className="space-y-4">
                        <div className="space-y-3">
                          {selectedUser.vehicles?.length === 0 && (
                            <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-600 dark:text-gray-300">
                              Este usuario no tiene vehículos registrados.
                            </div>
                          )}
                          {selectedUser.vehicles?.map((vehicle) => (
                            <div
                              key={vehicle._id}
                              className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-200"
                            >
                              <div>
                                <div className="font-semibold text-gray-900 dark:text-gray-100">{vehicle.model}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Tipo de cargador: {vehicle.chargerType}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Capacidad: {vehicle.batteryCapacity ?? '--'} kWh</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Nivel actual: {vehicle.currentChargeLevel ?? '--'}%</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteVehicle(vehicle._id)}
                                className="rounded-lg border border-red-300 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-500/60 dark:text-red-300 dark:hover:bg-red-900/20"
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
                            className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
                          >
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">Modelo</label>
                              <input
                                type="text"
                                name="model"
                                value={vehicleForm.model}
                                onChange={handleVehicleFormChange}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                                required
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">Tipo de cargador</label>
                              <select
                                name="chargerType"
                                value={vehicleForm.chargerType}
                                onChange={handleVehicleFormChange}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                              >
                                {vehicleTypeOptions.map((type) => (
                                  <option key={type} value={type}>
                                    {type}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">Capacidad de batería (kWh)</label>
                              <input
                                type="number"
                                name="batteryCapacity"
                                min="1"
                                step="0.1"
                                value={vehicleForm.batteryCapacity}
                                onChange={handleVehicleFormChange}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                                required
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">Nivel actual (%)</label>
                              <input
                                type="number"
                                name="currentChargeLevel"
                                min="0"
                                max="100"
                                value={vehicleForm.currentChargeLevel}
                                onChange={handleVehicleFormChange}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                              />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                              <button
                                type="button"
                                onClick={() => setShowVehicleForm(false)}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                              >
                                Cancelar
                              </button>
                              <button
                                type="submit"
                                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
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
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => toggleSection('reservations')}
                      aria-expanded={expandedSections.reservations}
                      aria-controls={sectionContentIds.reservations}
                      className="flex items-center gap-2 text-left text-lg font-semibold text-gray-900 transition hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-gray-100 dark:hover:text-indigo-300"
                    >
                      <span>Reservas del usuario</span>
                      <ChevronIcon expanded={expandedSections.reservations} />
                    </button>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => selectedUser && fetchUserReservations(selectedUser._id)}
                        className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                        disabled={reservationsLoading}
                      >
                        {reservationsLoading ? 'Actualizando…' : 'Actualizar'}
                      </button>
                    </div>
                  </div>

                  {expandedSections.reservations && (
                    <div id={sectionContentIds.reservations} className="space-y-4">
                      {reservationsError && (
                        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/60 dark:bg-red-900/20 dark:text-red-200">
                          {reservationsError}
                        </div>
                      )}

                      {reservationsLoading && reservations.length === 0 && (
                        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-700 dark:border-indigo-800/60 dark:bg-indigo-900/20 dark:text-indigo-200">
                          Cargando reservas…
                        </div>
                      )}

                      {!reservationsLoading && reservations.length === 0 && !reservationsError && (
                        <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-600 dark:text-gray-300">
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
                                className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-200"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                                      {reservation.chargerId?.name ?? 'Cargador desconocido'}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      {reservation.vehicleId?.model ?? 'Vehículo no asignado'} · {reservation.vehicleId?.chargerType ?? '—'}
                                    </div>
                                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                      Inicio: {startLabel}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      Fin estimado: {endLabel}
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                      reservation.status === 'cancelled'
                                        ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300'
                                        : reservation.status === 'completed'
                                          ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300'
                                          : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300'
                                    }`}>
                                      {statusLabel}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleRequestCancelReservation(reservation._id)}
                                      className="rounded-lg border border-red-300 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-500/60 dark:text-red-300 dark:hover:bg-red-900/20"
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
                                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-500/60 dark:bg-amber-900/20 dark:text-amber-200">
                                    <p className="font-semibold">¿Deseas cancelar esta reserva?</p>
                                    <p className="mt-1">Esta acción eliminará la reserva permanentemente de la base de datos.</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleConfirmCancelReservation(reservation._id)}
                                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                                        disabled={cancellingReservationId === reservation._id}
                                      >
                                        {cancellingReservationId === reservation._id ? 'Cancelando…' : 'Sí, cancelar'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={handleDismissCancelReservation}
                                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
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
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => toggleSection('history')}
                      aria-expanded={expandedSections.history}
                      aria-controls={sectionContentIds.history}
                      className="flex items-center gap-2 text-left text-lg font-semibold text-gray-900 transition hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-gray-100 dark:hover:text-indigo-300"
                    >
                      <span>Historial de sesiones</span>
                      <ChevronIcon expanded={expandedSections.history} />
                    </button>
                    <button
                      type="button"
                      onClick={() => selectedUser && fetchUserHistory(selectedUser._id)}
                      className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                      disabled={historyLoading}
                    >
                      {historyLoading ? 'Actualizando…' : 'Actualizar'}
                    </button>
                  </div>

                  {expandedSections.history && (
                    <div id={sectionContentIds.history} className="space-y-4">
                      {historyError && (
                        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/60 dark:bg-red-900/20 dark:text-red-200">
                          {historyError}
                        </div>
                      )}

                      {historyLoading && history.length === 0 && (
                        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-700 dark:border-indigo-800/60 dark:bg-indigo-900/20 dark:text-indigo-200">
                          Cargando historial…
                        </div>
                      )}

                      {!historyLoading && history.length === 0 && !historyError && (
                        <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-600 dark:text-gray-300">
                          Aún no hay sesiones registradas para este usuario.
                        </div>
                      )}

                      {history.length > 0 && (
                        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                          <table className="min-w-full divide-y divide-gray-200 text-left text-sm text-gray-700 dark:divide-gray-700 dark:text-gray-200">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
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
                                <tr key={session._id} className="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-900 dark:even:bg-gray-800/70">
                                  <td className="px-4 py-3">
                                    <div className="font-semibold text-gray-900 dark:text-gray-100">{session.vehicleId?.model ?? '—'}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">{session.vehicleId?.chargerType ?? '—'}</div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="font-semibold text-gray-900 dark:text-gray-100">{session.chargerId?.name ?? '—'}</div>
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

      {showChargerModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <button
              type="button"
              className="absolute right-4 top-4 text-2xl text-gray-500 transition hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={() => {
                if (!creatingCharger) {
                  setShowChargerModal(false);
                }
              }}
            >
              ×
            </button>
            <ChargerForm
              onSubmit={handleCreateCharger}
              onCancel={() => {
                if (!creatingCharger) {
                  setShowChargerModal(false);
                }
              }}
            />
            {creatingCharger && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/70 dark:bg-gray-900/70">
                <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm text-indigo-700 dark:border-indigo-800/60 dark:bg-indigo-900/40 dark:text-indigo-200">
                  Guardando estación…
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

const AdminDashboardLayout: React.FC = () => (
  <div className="min-h-screen bg-gray-100 dark:bg-gray-900 lg:pl-64">
    <VerticalNavbar />
    <div className="flex min-h-screen flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
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

const AdminDashboard: React.FC = () => (
  <Router>
    <AdminDashboardLayout />
  </Router>
);

export default AdminDashboard;
