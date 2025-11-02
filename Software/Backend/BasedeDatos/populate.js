const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const csv = require('csv-parser');
const fs = require('fs');
const turf = require('@turf/turf');
require('dotenv').config();

let valpoPolygon = null;

try {
  // Opción A: archivo ya con la geometría de la región (recomendado)
  const data = JSON.parse(fs.readFileSync('valparaiso_region.geojson', 'utf8'));
  // Soportar FeatureCollection o Feature/Polygon/MultiPolygon
  if (data.type === 'FeatureCollection') {
    // si vienen varias features, unirlas en una sola geometría
    valpoPolygon = data.features.length === 1 ? data.features[0] : turf.union(...data.features);
  } else {
    valpoPolygon = data;
  }
  console.log('Cargado valparaiso_region.geojson');
} catch (e1) {
  try {
    // Opción B: cargar archivo completo de comunas y filtrar por propiedad que contenga "valpara"
    const chile = JSON.parse(fs.readFileSync('chile_comunas.geojson', 'utf8'));
    const features = chile.features.filter(f => {
      const propsStr = JSON.stringify(f.properties || {}).toLowerCase();
      return propsStr.includes('valpara'); // coincidir "valparaiso", "valparaíso", etc.
    });

    if (!features || features.length === 0) throw new Error('No se encontró la Región de Valparaíso en chile_comunas.geojson');

    valpoPolygon = features.length === 1 ? features[0] : turf.union(...features);
    console.log('Extraída la geometría de Valparaíso desde chile_comunas.geojson');
  } catch (e2) {
    console.warn('No se encontró GeoJSON de la Región de Valparaíso en el proyecto. Se usará fallback bbox (menos preciso).');
    valpoPolygon = null;
  }
}

// Función para generar coordenadas aleatorias
function generateRandomCoordinates() {
  // Fallback simple si no cargó el polígono (mantengo tu bbox aproximado)
  if (!valpoPolygon) {
    const latMin = -33.95;
    const latMax = -32.033333;
    const lonMin = -72.0;
    const lonMax = -70.0;
    const randomLat = latMin + Math.random() * (latMax - latMin);
    const randomLon = lonMin + Math.random() * (lonMax - lonMin);
    return [randomLon, randomLat];
  }

  const bbox = turf.bbox(valpoPolygon); // [minX, minY, maxX, maxY] => [lonMin, latMin, lonMax, latMax]
  const maxAttempts = 10000;
  let attempts = 0;

  while (attempts++ < maxAttempts) {
    const lon = bbox[0] + Math.random() * (bbox[2] - bbox[0]);
    const lat = bbox[1] + Math.random() * (bbox[3] - bbox[1]);
    const pt = turf.point([lon, lat]);

    if (turf.booleanPointInPolygon(pt, valpoPolygon)) {
      return [lon, lat];
    }
  }

  // Si por alguna razón no encontramos punto en X intentos, devolvemos el centro del bbox
  return [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2];
}

// Función para generar nombres aleatorios
function generateRandomName() {
  const names = ['Juan Pérez', 'María González', 'Carlos López', 'Ana Rodríguez', 'Pedro Martínez', 
                 'Laura Sánchez', 'Diego Fernández', 'Sofía Ramírez', 'Jorge Díaz', 'Carmen Torres'];
  return names[Math.floor(Math.random() * names.length)];
}

// Generar costo de energía (media ~340, rango 300-500)
function randomNormal(mean, std) {
  // Box-Muller
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + std * num;
}

function generateEnergyCost() {
  const min = 300;
  const max = 500;
  const mean = 340;
  const std = 40; // desviación típica razonable

  // Intentar muestrear una normal truncada; si no entra en rango en varios intentos, usar uniforme de fallback
  for (let i = 0; i < 10; i++) {
    const v = Math.round(randomNormal(mean, std));
    if (v >= min && v <= max) return v;
  }

  // Fallback: uniforme en rango
  return Math.round(min + Math.random() * (max - min));
}

// Generar costo de estacionamiento (por minuto) — media 28, rango 22-30
function generateParkingCost() {
  const min = 22;
  const max = 30;
  const mean = 28;
  const std = 2; // pequeña desviación

  for (let i = 0; i < 10; i++) {
    const v = Math.round(randomNormal(mean, std));
    if (v >= min && v <= max) return v;
  }
  return Math.round(min + Math.random() * (max - min));
}

// Esquemas
const UserSchema = new mongoose.Schema({
  originalId: Number,
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['app_admin', 'station_admin', 'ev_user'] },
  ownedStations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Charger' }],
  vehicles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' }],
  // Lista de estaciones favoritas (inicialmente vacía)
  favoriteStations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Charger' }],
  createdAt: { type: Date, default: Date.now }
});

const VehicleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  originalId: Number,
  model: String,
  chargerType: { type: String, enum: ['Type1', 'Type2', 'CCS', 'CHAdeMO', 'Tesla'] },
  batteryCapacity: Number,
  currentChargeLevel: Number,
  chargingHistory: [{
    startTime: Date,
    endTime: Date,
    duration: Number,
    energyDelivered: Number,
    chargerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Charger' },
    sessionId: Number
  }]
});

const ChargerSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  originalId: Number,
  name: String,
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number]
  },
  chargerType: { type: String, enum: ['Type1', 'Type2', 'CCS', 'CHAdeMO', 'Tesla'] },
  powerOutput: Number,
  energy_cost: Number,
  parking_cost: Number,
  status: { type: String, enum: ['available', 'occupied', 'maintenance'], default: 'available' },
  occupancyHistory: [{
    start: Date,
    end: Date,
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChargingSession' },
    occupied: Boolean
  }],
  chargingHistory: [{
    startTime: Date,
    endTime: Date,
    duration: Number,
    energyDelivered: Number,
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    sessionId: Number
  }],
  reservations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reservation' }]
});

const ChargingSessionSchema = new mongoose.Schema({
  originalId: Number,
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  chargerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Charger' },
  startTime: Date,
  endTime: Date,
  energyDelivered: Number,
  duration: Number,
  cost: Number,
  realTimeData: [{
    timestamp: Date,
    power: Number,
    energy: Number
  }]
});

const ReservationSchema = new mongoose.Schema({
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  chargerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Charger' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  startTime: Date,
  endTime: Date,
  calculatedEndTime: Date,
  status: { type: String, enum: ['upcoming', 'active', 'completed', 'cancelled'] },
  estimatedChargeTime: Number,
  bufferTime: Number
});

// Modelos
const User = mongoose.model('User', UserSchema);
const Vehicle = mongoose.model('Vehicle', VehicleSchema);
const Charger = mongoose.model('Charger', ChargerSchema);
const ChargingSession = mongoose.model('ChargingSession', ChargingSessionSchema);
const Reservation = mongoose.model('Reservation', ReservationSchema);

// Función para transformar fechas
function transformDate(dateStr) {
  if (!dateStr) return new Date();
  
  let [datePart, timePart] = dateStr.split(' ');
  let [year, month, day] = datePart.split('-');
  
  if (year === '0014') year = '2019';
  else if (year === '0015') year = '2020';
  
  return new Date(`${year}-${month}-${day}T${timePart}`);
}

// Función para generar datos en tiempo real
function generateRealTimeData(startTime, endTime, totalEnergy) {
  const realTimeData = [];
  const start = new Date(startTime);
  const end = new Date(endTime);
  const durationMs = end - start;
  const intervalMs = 60000; // 1 minuto
  const power = totalEnergy / (durationMs / 3600000); // kW
  
  for (let time = start; time <= end; time = new Date(time.getTime() + intervalMs)) {
    const elapsedMs = time - start;
    const elapsedHours = elapsedMs / 3600000;
    const energy = Math.min(totalEnergy, power * elapsedHours);
    
    realTimeData.push({
      timestamp: new Date(time),
      power: power,
      energy: energy
    });
  }
  
  return realTimeData;
}

// Función para generar reservaciones ficticias basadas en sesiones de carga
async function generateFictionalReservations(chargersMap, vehiclesMap, usersMap) {
  console.log('Generando reservaciones ficticias...');
  
  const reservations = [];
  const now = new Date();
  
  // Para cada cargador, generar varias reservaciones futuras
  for (const charger of chargersMap.values()) {
    // Obtener vehículos compatibles con este cargador
    const compatibleVehicles = Array.from(vehiclesMap.values()).filter(
      v => v.chargerType === charger.chargerType
    );
    
    if (compatibleVehicles.length === 0) continue;
    
    // Generar entre 5 y 15 reservaciones por cargador
    const numReservations = Math.floor(Math.random() * 11) + 5;
    
    for (let i = 0; i < numReservations; i++) {
      // Seleccionar un vehículo aleatorio compatible
      const vehicle = compatibleVehicles[Math.floor(Math.random() * compatibleVehicles.length)];
      const user = await User.findById(vehicle.userId);
      
      // Generar fecha de inicio aleatoria en los próximos 30 días
      const daysFromNow = Math.floor(Math.random() * 30) + 1;
      const startTime = new Date(now);
      startTime.setDate(now.getDate() + daysFromNow);
      startTime.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60), 0, 0); // Entre 8am y 8pm
      
      // Calcular tiempo de carga estimado (basado en capacidad de batería y potencia del cargador)
      const chargeNeeded = 100 - (Math.floor(Math.random() * 80) + 10); // 10-90% de carga necesaria
      const estimatedHours = (vehicle.batteryCapacity * (chargeNeeded / 100)) / charger.powerOutput;
      const estimatedMinutes = Math.floor(estimatedHours * 60);
      
      // Calcular tiempo final con margen de error (20% adicional)
      const endTime = new Date(startTime);
      endTime.setMinutes(startTime.getMinutes() + estimatedMinutes);

      const bufferMinutes = 20; // 10 minutos de margen
      const calculatedEndTime = new Date(endTime);
      calculatedEndTime.setMinutes(endTime.getMinutes() + bufferMinutes);
      
      // Crear reservación
      const reservation = new Reservation({
        vehicleId: vehicle._id,
        chargerId: charger._id,
        userId: user._id,
        startTime: startTime,
        endTime: endTime,
        calculatedEndTime: calculatedEndTime,
        status: 'upcoming',
        estimatedChargeTime: estimatedMinutes,
        bufferTime: bufferMinutes
      });
      
      await reservation.save();
      reservations.push(reservation);
      
      // Actualizar cargador con referencia a la reservación
      charger.reservations.push(reservation._id);
      await charger.save();
    }
  }
  
  console.log(`Generadas ${reservations.length} reservaciones ficticias`);
  return reservations;
}

// Función principal para importar datos
async function importCSVData(filePath) {
  try {
    console.log('Iniciando importación de datos...');
    
    // Conectar a MongoDB sin opciones obsoletas
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ev_charging_db';
    await mongoose.connect(mongoUri);
    console.log('Conectado a MongoDB');

    // Eliminar la base de datos existente para evitar duplicados
    await mongoose.connection.dropDatabase();
    console.log('Base de datos eliminada');
    
    // Crear algunos usuarios administradores
    const adminPassword = await bcrypt.hash('admin123', 10);
    const appAdmin = new User({
      originalId: 999999,
      name: 'Administrador Principal',
      email: 'admin@evcharging.com',
      password: adminPassword,
      role: 'app_admin',
      favoriteStations: []
    });
    await appAdmin.save();
    
    const stationAdminPassword = await bcrypt.hash('stationadmin123', 10);
    const stationAdmin = new User({
      originalId: 888888,
      name: 'Administrador de Estaciones',
      email: 'stationadmin@evcharging.com',
      password: stationAdminPassword,
      role: 'station_admin',
      favoriteStations: []
    });
    await stationAdmin.save();
    
    // Mapeos para almacenar referencias
    const usersMap = new Map();
    const vehiclesMap = new Map();
    const chargersMap = new Map();
    
    // Leer y procesar el archivo CSV
    const results = [];
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });
    
    console.log(`CSV leído con ${results.length} registros`);
    
    // Procesar cada registro
    for (const [index, row] of results.entries()) {
      try {
        if (index % 100 === 0) console.log(`Procesando registro ${index + 1} de ${results.length}`);
        
        // Obtener o crear usuario
        let user = usersMap.get(row.userId);
        if (!user) {
          const hashedPassword = await bcrypt.hash('user123', 10);
          user = new User({
            originalId: parseInt(row.userId),
            name: generateRandomName(),
            email: `user${row.userId}@evcharging.com`,
            password: hashedPassword,
            role: 'ev_user',
            favoriteStations: []
          });
          await user.save();
          usersMap.set(row.userId, user);
        }
        
        // Obtener o crear vehículo (usando userId como vehicleId)
        let vehicle = vehiclesMap.get(row.userId);
        if (!vehicle) {
          // Asignar tipo de cargador aleatorio
          const chargerTypes = ['Type1', 'Type2', 'CCS', 'CHAdeMO', 'Tesla'];
          const chargerType = chargerTypes[Math.floor(Math.random() * chargerTypes.length)];
          
          vehicle = new Vehicle({
            userId: user._id,
            originalId: parseInt(row.userId),
            model: `Vehículo ${row.userId}`,
            chargerType: chargerType,
            batteryCapacity: Math.floor(Math.random() * 70) + 30, // 30-100 kWh
            currentChargeLevel: Math.floor(Math.random() * 100)
          });
          await vehicle.save();
          
          // Actualizar usuario con referencia al vehículo
          user.vehicles.push(vehicle._id);
          await user.save();
          vehiclesMap.set(row.userId, vehicle);
        }
        
        // Obtener o crear cargador/estación
        let charger = chargersMap.get(row.stationId);
        if (!charger) {
          // Calcular velocidad de carga basada en datos históricos
          const stationSessions = results.filter(r => r.stationId === row.stationId);
          let totalPower = 0;
          let count = 0;
          
          for (const session of stationSessions) {
            if (session.kwhTotal && session.chargeTimeHrs && parseFloat(session.chargeTimeHrs) > 0) {
              totalPower += parseFloat(session.kwhTotal) / parseFloat(session.chargeTimeHrs);
              count++;
            }
          }
          
          const avgPower = count > 0 ? totalPower / count : 7; // Valor por defecto 7 kW
          
          charger = new Charger({
            ownerId: stationAdmin._id,
            originalId: parseInt(row.stationId),
            name: `Cargador ${row.stationId}`,
            location: {
              coordinates: generateRandomCoordinates()
            },
            chargerType: vehicle.chargerType, // Mismo tipo que el vehículo
            powerOutput: avgPower,
            energy_cost: generateEnergyCost(),
            parking_cost: generateParkingCost(),
            status: 'available'
          });
          await charger.save();
          
          // Actualizar administrador de estación con referencia al cargador
          stationAdmin.ownedStations.push(charger._id);
          await stationAdmin.save();
          chargersMap.set(row.stationId, charger);
        }
        
        // Transformar fechas
        const startTime = transformDate(row.created);
        const endTime = transformDate(row.ended);
        const duration = parseFloat(row.chargeTimeHrs) * 60; // Convertir a minutos
        const energyDelivered = parseFloat(row.kwhTotal);
        const cost = parseFloat(row.dollars) || 0;
        
        // Generar datos en tiempo real
        const realTimeData = generateRealTimeData(startTime, endTime, energyDelivered);
        
        // Crear sesión de carga
        const session = new ChargingSession({
          originalId: parseInt(row.sessionId),
          vehicleId: vehicle._id,
          chargerId: charger._id,
          startTime: startTime,
          endTime: endTime,
          energyDelivered: energyDelivered,
          duration: duration,
          cost: cost,
          realTimeData: realTimeData
        });
        await session.save();
        
        // Actualizar historial del vehículo
        vehicle.chargingHistory.push({
          startTime: startTime,
          endTime: endTime,
          duration: duration,
          energyDelivered: energyDelivered,
          chargerId: charger._id,
          sessionId: parseInt(row.sessionId)
        });
        await vehicle.save();
        
        // Actualizar historial del cargador
        charger.chargingHistory.push({
          startTime: startTime,
          endTime: endTime,
          duration: duration,
          energyDelivered: energyDelivered,
          vehicleId: vehicle._id,
          sessionId: parseInt(row.sessionId)
        });
        
        // Actualizar historial de ocupación del cargador
        charger.occupancyHistory.push({
          start: startTime,
          end: endTime,
          sessionId: session._id,
          occupied: true
        });
        
        await charger.save();
        
      } catch (error) {
        console.error(`Error procesando fila ${index + 1}:`, error.message);
      }
    }
    
    // Generar reservaciones ficticias basadas en los datos importados
    await generateFictionalReservations(chargersMap, vehiclesMap, usersMap);
    
    console.log('Importación completada con éxito');
    
  } catch (error) {
    console.error('Error en la importación:', error);
  } finally {
    await mongoose.connection.close();
  }
}

// Ejecutar la importación
const csvFilePath = process.argv[2] || 'station_data_dataverse.csv';
importCSVData(csvFilePath);