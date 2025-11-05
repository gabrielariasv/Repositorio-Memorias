import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/useAuth';

// Tipos de cargador soportados por la plataforma
const CHARGER_TYPES = ['CCS', 'CHAdeMO', 'Type2', 'Tesla'];

interface SignUpProps {
  onCancel: () => void;
  onRegistered?: (email: string, password: string) => void;
}

// Componente: formulario de registro de nuevos usuarios con selección de vehículo
const SignUp: React.FC<SignUpProps> = ({ onCancel, onRegistered }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  // Vehículos: lista, selección y entrada manual
  const [vehicleOptions, setVehicleOptions] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [manualVehicleName, setManualVehicleName] = useState<string>('');
  const [manualBatteryCapacity, setManualBatteryCapacity] = useState<number | ''>('');
  const [manualChargerType, setManualChargerType] = useState<string>('');
  const [manualChargerOther, setManualChargerOther] = useState<string>('');
  // mostrar/ocultar contraseñas
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    // Intentar cargar lista de vehículos (endpoint puede ajustarse)
    const fetchVehicles = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/vehicles`);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) setVehicleOptions(data);
      } catch {
        // Ignorar errores silenciosamente
      }
    };
    fetchVehicles();
  }, []);

  const selectedVehicleObj = vehicleOptions.find(v => v._id === selectedVehicleId) ?? null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const n = name.trim();
    const em = email.trim();
    const cem = confirmEmail.trim();
    const pw = password.trim();
    const cf = confirm.trim();
    if (!n || !em || !pw || !cf) {
      setError('Completa todos los campos.');
      return;
    }
    if (!cem) {
      setError('Confirma tu correo electrónico.');
      return;
    }
    if (pw !== cf) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (em !== cem) {
      setError('Correo y confirmar correo no coinciden.');
      return;
    }

    // Validar vehículo: o seleccionó existente o completó manualmente
    let vehiclePayload: any = {};
    if (selectedVehicleId && selectedVehicleId !== 'manual') {
      vehiclePayload = { vehicleId: selectedVehicleId };
    } else {
      // manual
      const mv = manualVehicleName.trim();
      const mb = Number(manualBatteryCapacity);
      const mt = manualChargerType.trim();
      if (!mv || !mb || !mt || isNaN(mb) || mb <= 0) {
        setError('Completa los datos del vehículo (nombre, capacidad de batería y tipo de cargador).');
        return;
      }
      vehiclePayload = { vehicle: { name: mv, batteryCapacity: mb, chargerType: mt } };
    }

    setLoading(true);
    try {
      const body = { name: n, email: em, password: pw, ...vehiclePayload };
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/registerEvUser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error || 'No se pudo registrar el usuario.');
        setLoading(false);
        return;
      }
      // Registro exitoso
      if (onRegistered) {
        onRegistered(em, pw);
      } else {
        // si no hay callback, intentar login automático y luego cerrar
        try {
          await login(em, pw);
        } catch {
          // Ignorar errores
        }
        onCancel();
      }
    } catch (err: any) {
      setError(err?.message || 'Error durante el registro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="max-w-md w-full space-y-8">
        <div className="flex items-center justify-center gap-2">
          <h2 className="mt-6 text-center text-2xl font-extrabold text-gray-900 dark:text-white">Crear cuenta</h2>
          <div className="relative group inline-flex mt-6">
            <span className="auth-help-icon">?</span>
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-72 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-xs rounded shadow-lg p-3 z-50 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity border border-gray-200 dark:border-gray-700">
              Este formulario solo sirve para registrarte como dueño de vehículo eléctrico. Si lo que buscas es publicar tu estación de carga, debes contactarte con soporte de la plataforma.
            </div>
          </div>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="rounded-md shadow-sm">
            <div className="grid-form">
              <label className="col-span-4 label-muted label-right">Nombre completo</label>
              <div className="col-span-8">
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="input-sm"
                />
              </div>

              <label className="col-span-4 label-muted label-right">Correo</label>
              <div className="col-span-8">
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  type="email"
                  className="input-sm"
                />
              </div>

              <label className="col-span-4 label-muted label-right">Confirmar correo</label>
              <div className="col-span-8">
                <input
                  value={confirmEmail}
                  onChange={e => setConfirmEmail(e.target.value)}
                  type="email"
                  className="input-sm"
                />
              </div>

              <label className="col-span-4 label-muted label-right">Contraseña</label>
              <div className="col-span-8 flex items-center gap-2">
                <input
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  className="input-sm flex-1"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="btn btn-ghost btn-xs"
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>

              <label className="col-span-4 label-muted label-right">Confirmar contraseña</label>
              <div className="col-span-8 flex items-center gap-2">
                <input
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="input-sm flex-1"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(s => !s)}
                  className="btn btn-ghost btn-xs"
                >
                  {showConfirmPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>
          </div>

          {/* Selección / entrada de vehículo */}
          <div className="mt-3">
            <label className="form-label">Vehículo</label>
            <div className="relative">
              <select
                value={selectedVehicleId}
                onChange={e => setSelectedVehicleId(e.target.value)}
                className="select"
              >
               <option value="">Selecciona un vehículo...</option>
               {vehicleOptions.map(v => (
                 <option key={v._id} value={v._id}>{v.name} — {v.model ?? ''}</option>
               ))}
               <option value="manual">Otro (ingresar manualmente)</option>
              </select>
              {/* Ícono incorporado en .select; flecha adicional removida para evitar duplicado */}
            </div>

            {selectedVehicleId && selectedVehicleId !== 'manual' && selectedVehicleObj && (
              <div className="auth-info-card">
                <div><b>Capacidad batería:</b> {selectedVehicleObj.batteryCapacity ?? 'N/A'} kWh</div>
                <div><b>Tipo cargador:</b> {selectedVehicleObj.chargerType ?? selectedVehicleObj.charger?.type ?? 'N/A'}</div>
              </div>
            )}

            {selectedVehicleId === 'manual' && (
              <div className="grid-form-tight">
                <label className="col-span-4 label-muted label-right">Vehículo</label>
                <div className="col-span-8">
                  <input value={manualVehicleName} onChange={e => setManualVehicleName(e.target.value)} className="input-sm" />
                </div>

                <label className="col-span-4 label-muted label-right">Capacidad (kWh)</label>
                <div className="col-span-8">
                  <input value={manualBatteryCapacity} onChange={e => setManualBatteryCapacity(e.target.value === '' ? '' : Number(e.target.value))} type="number" className="input-sm" />
                </div>

                <label className="col-span-4 label-muted label-right">Tipo cargador</label>
                <div className="col-span-8">
                  <select value={manualChargerType} onChange={e => setManualChargerType(e.target.value)} className="select">
                    <option value="">Selecciona tipo...</option>
                    {CHARGER_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                    <option value="Other">Otro</option>
                  </select>
                  {manualChargerType === 'Other' && (
                    <input
                      value={manualChargerOther}
                      onChange={e => setManualChargerOther(e.target.value)}
                      placeholder="Especifica tipo de cargador"
                      className="mt-2 input-sm"
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-block"
            >
              {loading ? 'Creando...' : 'Crear cuenta'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary btn-block"
            >
              Volver
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignUp;
