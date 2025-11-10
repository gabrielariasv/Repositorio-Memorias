const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Importar rutas
const { router: authRoutes } = require('./routes/auth');
const statsRoutes = require('./routes/stats');
const realtimeRoutes = require('./routes/realtime');
const vehiclesRoutes = require('./routes/vehicles');
const chargersRoutes = require('./routes/chargers');
const calendarRoutes = require('./routes/calendar');
const simulatorRoutes = require('./routes/simulator');
const usersRoutes = require('./routes/users');
const notificationsRoutes = require('./routes/notifications');
const reservationsRoutes = require('./routes/reservations');
const recommendationsRoutes = require('./routes/recommendations');
const favouritesRoutes = require('./routes/favourites');
const chargingSessionsRoutes = require('./routes/chargingSessions');

const app = express();
const PORT = process.env.PORT || 3000;
const http = require('http');
const server = http.createServer(app);
const { init: initSocket } = require('./utils/socket');
const { startReservationScheduler } = require('./utils/reservationScheduler');

// Middleware para habilitar CORS (Cross-Origin Resource Sharing)
// Permite que el frontend se comunique con el backend desde diferentes orígenes
app.use(cors());

// Middleware para parsear cuerpos de peticiones JSON
app.use(express.json());

// Conexión a MongoDB
// Usa la URI de la variable de entorno o localhost como alternativa
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ev_charging_db')
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => {
    console.error('Error conectando a MongoDB:', err);
    process.exit(1); // Salir si no puede conectar a la BD (crítico)
  });

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/realtime', realtimeRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/chargers', chargersRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/simulator', simulatorRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/favourites', favouritesRoutes);
app.use('/api/charging-sessions', chargingSessionsRoutes);

// Ruta de bienvenida
app.get('/', (req, res) => {
  res.json({ 
    message: 'API para Sistema de Carga de Vehículos Eléctricos',
    endpoints: {
      stats: '/api/stats',
      realtime: '/api/realtime',
      vehicles: '/api/vehicles',
      chargers: '/api/chargers',
      calendar: '/api/calendar'
    }
  });
});


// Middleware de manejo de errores global
// Captura errores no controlados en las rutas
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo salió mal!' });
});

// Middleware para rutas no encontradas (404)
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Inicializar Socket.IO para comunicación en tiempo real
// Permite notificaciones push y actualizaciones instantáneas
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';
initSocket(server, FRONTEND_ORIGIN);

// Iniciar el scheduler de recordatorios de reservas
// Envía notificaciones automáticas 15 minutos antes de cada reserva
startReservationScheduler();

// Iniciar servidor HTTP
server.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
});