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
const reservationsRoutes = require('./routes/reservations');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ev_charging_db')
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => {
    console.error('Error conectando a MongoDB:', err);
    process.exit(1); // Salir si no puede conectar a la BD
  });

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/realtime', realtimeRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/chargers', chargersRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/reservations', reservationsRoutes);

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

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo salió mal!' });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
});