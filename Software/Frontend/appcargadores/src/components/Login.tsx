import React, { useState } from 'react';
import { useAuth } from '../contexts/useAuth';
import SignUp from './SignUp';

// Componente: formulario de login con opción de registro
const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const [showSignUp, setShowSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Limpiar y validar entradas
    const cleanedEmail = email.trim();
    const cleanedPassword = password.trim();

    if (!cleanedEmail || !cleanedPassword) {
      setError('Por favor, completa todos los campos');
      setIsLoading(false);
      return;
    }

    const success = await login(cleanedEmail, cleanedPassword);
    if (!success) {
      setError('Credenciales inválidas. Por favor, intenta de nuevo.');
    }
    
    setIsLoading(false);
  };

  // Si el usuario abre el registro, mostrar el componente SignUp
  if (showSignUp) {
    return (
      <SignUp
        onCancel={() => setShowSignUp(false)}
        onRegistered={async (registeredEmail: string, registeredPassword: string) => {
          // intentar login automático después del registro
          const ok = await login(registeredEmail, registeredPassword);
          if (!ok) {
            // si falla, volver al login con mensaje (usar setError que sí existe)
            setError('Registro exitoso. Por favor inicia sesión.');
            setShowSignUp(false);
          } else {
            // login exitoso, cerrar modal / vista
            setShowSignUp(false);
          }
        }}
      />
    );
  }

  return (
    <div className="auth-screen">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="auth-title">
            Iniciar sesión en ECCODe
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Correo electrónico
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input-sm"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="input-sm"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary btn-block"
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </div>
          <div className="text-sm">
              <button type="button" onClick={() => setShowSignUp(true)} className="link-accent">
                Registrarse
              </button>
            </div>
          <div className="flex items-center justify-between">
            <div className="text-center">
              <p className="text-secondary">Credenciales de prueba:</p>
              <p className="text-xs text-secondary">Admin: admin@evcharging.com / admin123</p>
              <p className="text-xs text-secondary">Station Admin: stationadmin@evcharging.com / stationadmin123</p>
              <p className="text-xs text-secondary">Usuario: user[ID]@evcharging.com / user123</p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;