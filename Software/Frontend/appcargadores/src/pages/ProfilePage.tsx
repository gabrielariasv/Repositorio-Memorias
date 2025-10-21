import { FormEvent, useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/useAuth';

const PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

const passwordHints = [
  'Al menos 8 caracteres',
  'Incluye una letra mayúscula y una minúscula',
  'Añade al menos un número',
  'Incluye un carácter especial (por ejemplo !, @, #, $)'
];

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setName(user?.name ?? '');
  }, [user?.name]);

  if (!user) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow text-gray-700 dark:text-gray-200">
        No se pudo cargar la información del perfil.
      </div>
    );
  }

  const resetPasswordFields = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setStatus('error');
      setMessage('El nombre no puede estar vacío.');
      return;
    }

    const wantsPasswordChange = Boolean(currentPassword || newPassword || confirmNewPassword);

    if (wantsPasswordChange) {
      if (!currentPassword || !newPassword || !confirmNewPassword) {
        setStatus('error');
        setMessage('Completa todos los campos de contraseña para realizar el cambio.');
        return;
      }

      if (newPassword !== confirmNewPassword) {
        setStatus('error');
        setMessage('La nueva contraseña y su confirmación no coinciden.');
        return;
      }

      if (!PASSWORD_POLICY.test(newPassword)) {
        setStatus('error');
        setMessage('La nueva contraseña no cumple con los requisitos de seguridad.');
        return;
      }
    }

    try {
      setStatus('loading');
      setMessage(null);

      const response = await axios.put(`${import.meta.env.VITE_API_URL}/api/auth/profile`, {
        name: trimmedName,
        currentPassword: wantsPasswordChange ? currentPassword : undefined,
        newPassword: wantsPasswordChange ? newPassword : undefined,
        confirmNewPassword: wantsPasswordChange ? confirmNewPassword : undefined,
      });

      if (response.data?.user) {
        updateUser(response.data.user);
      }

      setStatus('success');
      setMessage(response.data?.message ?? 'Perfil actualizado correctamente.');
      resetPasswordFields();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error ?? error?.message ?? 'No se pudo actualizar el perfil.';
      setStatus('error');
      setMessage(errorMessage);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Editar datos de perfil</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Actualiza tu nombre y credenciales de acceso de forma segura.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-8">
          <section>
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Información básica</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre completo
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={event => setName(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  placeholder="Nombre y apellido"
                  maxLength={80}
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Correo electrónico</label>
                <input
                  value={user.email}
                  disabled
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/70 px-4 py-2.5 text-gray-600 dark:text-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rol</label>
                <input
                  value={user.role === 'ev_user' ? 'Conductor EV' : user.role === 'station_admin' ? 'Administrador de estación' : 'Administrador general'}
                  disabled
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/70 px-4 py-2.5 text-gray-600 dark:text-gray-300"
                />
              </div>
            </div>
          </section>

          <section>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Seguridad</h2>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                Opcional
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Si deseas cambiar tu contraseña, completa los siguientes campos. Primero valida tu contraseña actual y luego escribe la nueva contraseña dos veces.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contraseña actual
                </label>
                <input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={event => setCurrentPassword(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nueva contraseña
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={event => setNewPassword(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirmar nueva contraseña
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmNewPassword}
                  onChange={event => setConfirmNewPassword(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  autoComplete="new-password"
                />
              </div>
            </div>
            <ul className="mt-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
              {passwordHints.map(hint => (
                <li key={hint} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400"></span>
                  {hint}
                </li>
              ))}
            </ul>
          </section>

          {message && (
            <div
              className={`rounded-lg px-4 py-3 text-sm ${
                status === 'success'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  : status === 'error'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200'
              }`}
            >
              {message}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setName(user.name);
                resetPasswordFields();
                setMessage(null);
                setStatus('idle');
              }}
              className="px-5 py-2.5 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 transition-colors"
              disabled={status === 'loading'}
            >
              Restablecer cambios
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={status === 'loading'}
            >
              {status === 'loading' ? 'Guardando…' : 'Guardar ajustes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
