import { FormEvent, useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/useAuth';

// Política de contraseña: mínimo 8 caracteres, mayúscula, minúscula, número y especial
const PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

// Sugerencias de contraseña mostradas al usuario
const passwordHints = [
  'Al menos 8 caracteres',
  'Incluye una letra mayúscula y una minúscula',
  'Añade al menos un número',
  'Incluye un carácter especial (por ejemplo !, @, #, $)'
];

// Componente: página de perfil de usuario con edición de nombre y contraseña
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
      <div className="card text-body">
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
      <div className="card card--2xl overflow-hidden">
        <div className="section-header flex items-center justify-between">
          <div>
            <h1 className="heading-page-2xl">Editar datos de perfil</h1>
            <p className="text-sm text-secondary mt-1">Actualiza tu nombre y credenciales de acceso de forma segura.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-8">
          <section>
            <h2 className="subheading mb-4">Información básica</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="profile-name" className="form-label">
                  Nombre completo
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={event => setName(event.target.value)}
                  className="input"
                  placeholder="Nombre y apellido"
                  maxLength={80}
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="form-label">Correo electrónico</label>
                <input
                  value={user.email}
                  disabled
                  className="input"
                />
              </div>
              <div>
                <label className="form-label">Rol</label>
                <input
                  value={user.role === 'ev_user' ? 'Conductor EV' : user.role === 'station_admin' ? 'Administrador de estación' : 'Administrador general'}
                  disabled
                  className="input"
                />
              </div>
            </div>
          </section>

          <section>
            <div className="header-row mb-4">
              <h2 className="subheading">Seguridad</h2>
              <span className="badge badge-blue">
                Opcional
              </span>
            </div>
            <p className="text-sm text-secondary mb-4">
              Si deseas cambiar tu contraseña, completa los siguientes campos. Primero valida tu contraseña actual y luego escribe la nueva contraseña dos veces.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="current-password" className="form-label">
                  Contraseña actual
                </label>
                <input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={event => setCurrentPassword(event.target.value)}
                  className="input"
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label htmlFor="new-password" className="form-label">
                  Nueva contraseña
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={event => setNewPassword(event.target.value)}
                  className="input"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="form-label">
                  Confirmar nueva contraseña
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmNewPassword}
                  onChange={event => setConfirmNewPassword(event.target.value)}
                  className="input"
                  autoComplete="new-password"
                />
              </div>
            </div>
            <ul className="mt-3 text-xs text-muted space-y-1">
              {passwordHints.map(hint => (
                <li key={hint} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400"></span>
                  {hint}
                </li>
              ))}
            </ul>
          </section>

          {message && (
            <div className={status === 'error' ? 'alert alert-error' : 'alert'}>{message}</div>
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
              className="btn btn-secondary"
              disabled={status === 'loading'}
            >
              Restablecer cambios
            </button>
            <button
              type="submit"
              className="btn btn-primary"
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
