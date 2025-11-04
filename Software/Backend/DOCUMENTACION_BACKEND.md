# Documentación del Backend - API Sistema de Carga de Vehículos Eléctricos

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Configuración y Ejecución](#configuración-y-ejecución)
4. [Modelos de Datos](#modelos-de-datos)
5. [Endpoints de la API](#endpoints-de-la-api)
6. [Autenticación y Autorización](#autenticación-y-autorización)
7. [WebSockets y Tiempo Real](#websockets-y-tiempo-real)
8. [Utilidades](#utilidades)
9. [Simulador de Vehículos](#simulador-de-vehículos)

---

## 🎯 Visión General

La API del Sistema de Carga de Vehículos Eléctricos es un backend RESTful construido con **Node.js**, **Express** y **MongoDB**. Proporciona funcionalidades completas para:

- **Gestión de usuarios** con tres roles: `app_admin`, `station_admin` y `ev_user`
- **Gestión de estaciones de carga** (cargadores)
- **Sistema de reservas** con validación de conflictos
- **Notificaciones en tiempo real** mediante WebSockets
- **Estadísticas y análisis** de uso energético
- **Simulador de vehículos eléctricos** para pruebas
- **Sistema de favoritos** para usuarios

### Tecnologías Principales

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Node.js | - | Runtime del servidor |
| Express | 4.18.2 | Framework web |
| MongoDB | - | Base de datos NoSQL |
| Mongoose | 8.18.1 | ODM para MongoDB |
| Socket.IO | 4.8.1 | Comunicación en tiempo real |
| JWT | 9.0.2 | Autenticación basada en tokens |
| bcryptjs | 3.0.2 | Encriptación de contraseñas |

---

## 🏗️ Arquitectura del Sistema

### Estructura de Carpetas

```
Backend/
├── Api/
│   ├── app.js                    # Punto de entrada principal
│   ├── package.json
│   ├── .env                      # Variables de entorno
│   ├── models/                   # Modelos de datos (Mongoose)
│   │   ├── User.js
│   │   ├── Vehicle.js
│   │   ├── Charger.js
│   │   ├── ChargingSession.js
│   │   ├── Reservation.js
│   │   └── Notification.js
│   ├── routes/                   # Rutas de la API
│   │   ├── auth.js              # Autenticación y perfil
│   │   ├── users.js             # Gestión de usuarios
│   │   ├── vehicles.js          # Gestión de vehículos
│   │   ├── chargers.js          # Gestión de cargadores
│   │   ├── reservations.js      # Sistema de reservas
│   │   ├── notifications.js     # Notificaciones
│   │   ├── stats.js             # Estadísticas
│   │   ├── calendar.js          # Calendario de reservas
│   │   ├── simulator.js         # Simulador de vehículos
│   │   ├── realtime.js          # Datos en tiempo real
│   │   ├── recommendations.js   # Recomendaciones
│   │   └── favourites.js        # Favoritos
│   ├── utils/                   # Utilidades
│   │   ├── socket.js            # Configuración de Socket.IO
│   │   ├── reservationScheduler.js  # Recordatorios de reservas
│   │   └── calcularDistancia.js     # Cálculo de distancias
│   └── simulator/               # Simulador EV
│       ├── ev-simulator.js      # Lógica del simulador
│       └── simulator-controller.js  # Controlador del simulador
└── BasedeDatos/
    ├── populate.js              # Script de población de datos
    ├── station_data_dataverse.csv
    └── valparaiso_region.geojson
```

### Flujo de Datos

```
Cliente (Frontend)
    ↓
Express Middleware (CORS, JSON)
    ↓
Autenticación (JWT) [si se requiere]
    ↓
Rutas/Controladores
    ↓
Modelos (Mongoose)
    ↓
MongoDB
    ↓
Respuesta JSON / WebSocket Event
```

---

## ⚙️ Configuración y Ejecución

### Variables de Entorno

Crear archivo `.env` en `Backend/Api/`:

```env
# Base de datos
MONGODB_URI=

# Autenticación
JWT_SECRET=

# Servidor
PORT=3000

# Frontend (CORS y WebSockets)
FRONTEND_ORIGIN=http://localhost:5173
```

### Instalación y Ejecución

```bash
# Navegar al directorio de la API
cd Software/Backend/Api

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo (con nodemon)
nodemon app.js

# O ejecutar directamente
node app.js
```

### Población de Datos Iniciales

```bash
cd Software/Backend/BasedeDatos
node populate.js
```

Este script crea:
- Usuarios de prueba (admin, station_admin, ev_user)
- Estaciones de carga basadas en `station_data_dataverse.csv`
- Vehículos de ejemplo
- Sesiones de carga históricas

---

## 💾 Modelos de Datos

### User (Usuario)

**Archivo:** `models/User.js`

**Esquema:**

```javascript
{
  originalId: Number,           // ID original (de migración)
  name: String,                 // Nombre completo
  email: String,                // Email único
  password: String,             // Hash bcrypt
  role: String,                 // 'app_admin' | 'station_admin' | 'ev_user'
  ownedStations: [ObjectId],    // Referencias a Charger
  vehicles: [ObjectId],         // Referencias a Vehicle
  favoriteStations: [ObjectId], // Referencias a Charger (favoritos)
  createdAt: Date              // Fecha de creación
}
```

**Roles:**
- `app_admin`: Administrador de la aplicación (acceso total)
- `station_admin`: Propietario de estaciones (gestiona sus cargadores)
- `ev_user`: Usuario con vehículo eléctrico (hace reservas)

### Vehicle (Vehículo)

**Archivo:** `models/Vehicle.js`

**Esquema:**

```javascript
{
  userId: ObjectId,             // Propietario del vehículo (ref: User)
  model: String,                // Modelo del vehículo
  chargerType: String,          // Tipo de conector compatible
  batteryCapacity: Number,      // Capacidad en kWh
  currentChargeLevel: Number,   // Nivel actual de carga (0-100%)
  createdAt: Date              // Fecha de creación
}
```

**Tipos de cargadores compatibles:**
- `Type1` (J1772)
- `Type2` (Mennekes)
- `CCS` (Combined Charging System)
- `CHAdeMO`
- `Tesla`

### Charger (Estación de Carga)

**Archivo:** `models/Charger.js`

**Esquema:**

```javascript
{
  name: String,                 // Nombre de la estación
  chargerType: String,          // Tipo de conector
  powerOutput: Number,          // Potencia en kW
  status: String,               // 'available' | 'occupied' | 'maintenance'
  location: {
    type: 'Point',
    coordinates: [Number, Number]  // [longitud, latitud] (GeoJSON)
  },
  ownerId: ObjectId,            // Propietario (ref: User)
  energy_cost: Number,          // Costo por kWh (opcional)
  parking_cost: Number,         // Costo de estacionamiento (opcional)
  chargingHistory: [{           // Historial de sesiones
    vehicleId: ObjectId,
    startTime: Date,
    endTime: Date,
    energyDelivered: Number
  }],
  reservations: [ObjectId],     // Referencias a Reservation
  createdAt: Date
}
```

**Índice geoespacial:** Permite búsquedas por proximidad

### Reservation (Reserva)

**Archivo:** `models/Reservation.js`

**Esquema:**

```javascript
{
  vehicleId: ObjectId,          // Vehículo (ref: Vehicle)
  chargerId: ObjectId,          // Cargador (ref: Charger)
  userId: ObjectId,             // Usuario que reserva (ref: User)
  startTime: Date,              // Inicio de la reserva
  endTime: Date,                // Fin estimado
  calculatedEndTime: Date,      // Fin calculado basado en carga
  status: String,               // 'upcoming' | 'active' | 'completed' | 'cancelled'
  acceptanceStatus: String,     // 'pending' | 'accepted' | 'rejected'
  cancellationReason: String,   // Motivo de cancelación
  cancelledBy: String,          // 'user' | 'owner' | 'system'
  createdAt: Date
}
```

**Estados:**
- `upcoming`: Reserva futura no iniciada
- `active`: Reserva en curso
- `completed`: Reserva finalizada
- `cancelled`: Reserva cancelada

**Motivos de cancelación:**
- `indisponibilidad`: Estación no disponible
- `mantenimiento`: En mantenimiento
- `falta_tiempo`: Usuario sin tiempo
- `otro`: Otro motivo

### ChargingSession (Sesión de Carga)

**Archivo:** `models/ChargingSession.js`

**Esquema:**

```javascript
{
  vehicleId: ObjectId,          // Vehículo (ref: Vehicle)
  chargerId: ObjectId,          // Cargador (ref: Charger)
  startTime: Date,              // Inicio de la sesión
  endTime: Date,                // Fin de la sesión
  energyDelivered: Number,      // Energía entregada (kWh)
  cost: Number,                 // Costo total
  duration: Number,             // Duración en minutos
  createdAt: Date
}
```

### Notification (Notificación)

**Archivo:** `models/Notification.js`

**Esquema:**

```javascript
{
  user: ObjectId,               // Usuario destinatario (ref: User)
  title: String,                // Título de la notificación
  message: String,              // Mensaje
  type: String,                 // 'info' | 'success' | 'warning' | 'error'
  read: Boolean,                // ¿Leída? (default: false)
  data: Object,                 // Datos adicionales (opcional)
  createdAt: Date
}
```

---

## 🔌 Endpoints de la API

### Base URL

```
http://localhost:3000/api
```

### 1. Autenticación (`/api/auth`)

#### POST `/api/auth/login`

Iniciar sesión con email y contraseña.

**Request Body:**
```json
{
  "email": "usuario@example.com",
  "password": "contraseña123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "65f...",
    "name": "Juan Pérez",
    "email": "usuario@example.com",
    "role": "ev_user",
    "vehicles": [...],
    "ownedStations": [...]
  }
}
```

**Errores:**
- `400`: Credenciales inválidas
- `500`: Error del servidor

---

#### POST `/api/auth/registerEvUser`

Registrar un nuevo usuario con vehículo eléctrico.

**Request Body:**
```json
{
  "name": "María González",
  "email": "maria@example.com",
  "password": "Contraseña123!",
  "vehicleId": "65f...",  // O proporcionar objeto vehicle
  "vehicle": {            // Alternativa: crear vehículo manual
    "name": "Tesla Model 3",
    "chargerType": "Tesla",
    "batteryCapacity": 75,
    "currentChargeLevel": 80
  }
}
```

**Validaciones:**
- Email único
- Contraseña: mínimo 8 caracteres, mayúsculas, minúsculas, números y carácter especial
- Si se proporciona `vehicle`, se crea automáticamente

**Response (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "65f...",
    "name": "María González",
    "email": "maria@example.com",
    "role": "ev_user",
    "vehicles": [...]
  }
}
```

---

#### GET `/api/auth/profile`

Obtener perfil del usuario autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "_id": "65f...",
  "name": "Juan Pérez",
  "email": "usuario@example.com",
  "role": "ev_user",
  "vehicles": [...],
  "ownedStations": [...],
  "favoriteStations": [...]
}
```

---

#### PUT `/api/auth/profile`

Actualizar perfil (nombre y/o contraseña).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body (cambiar nombre):**
```json
{
  "name": "Juan Carlos Pérez"
}
```

**Request Body (cambiar contraseña):**
```json
{
  "currentPassword": "Vieja123!",
  "newPassword": "Nueva123!",
  "confirmNewPassword": "Nueva123!"
}
```

**Response (200):**
```json
{
  "message": "Perfil actualizado correctamente.",
  "user": {...}
}
```

---

### 2. Cargadores (`/api/chargers`)

#### GET `/api/chargers`

Obtener lista de cargadores (con filtros opcionales).

**Query Parameters:**
- `status`: Filtrar por estado (`available`, `occupied`, `maintenance`)
- `chargerType`: Filtrar por tipo de conector

**Response (200):**
```json
[
  {
    "_id": "65f...",
    "name": "Estación Centro",
    "chargerType": "Type2",
    "powerOutput": 22,
    "status": "available",
    "location": {
      "type": "Point",
      "coordinates": [-71.6138, -33.0366]
    },
    "ownerId": {...},
    "hasActiveReservation": false
  },
  ...
]
```

**Nota:** El estado `status` se calcula en tiempo real basándose en reservas activas.

---

#### GET `/api/chargers/:id`

Obtener detalles de un cargador específico.

**Response (200):**
```json
{
  "_id": "65f...",
  "name": "Estación Centro",
  "chargerType": "Type2",
  "powerOutput": 22,
  "status": "available",
  "location": {...},
  "ownerId": {...},
  "chargingHistory": [...],
  "reservations": [...],
  "hasActiveReservation": false
}
```

---

#### POST `/api/chargers`

Crear un nuevo cargador (requiere autenticación).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Estación Sur",
  "chargerType": "CCS",
  "powerOutput": 50,
  "status": "available",
  "location": {
    "type": "Point",
    "coordinates": [-71.6200, -33.0450]
  },
  "ownerId": "65f..."  // Opcional (usa userId del token)
}
```

**Validaciones:**
- Solo `app_admin` puede crear cargadores para otros usuarios
- `station_admin` puede crear sus propios cargadores
- Coordenadas en formato GeoJSON: `[longitud, latitud]`

**Response (201):**
```json
{
  "_id": "65f...",
  "name": "Estación Sur",
  ...
}
```

---

#### GET `/api/chargers/nearby`

Buscar cargadores cercanos a una ubicación.

**Query Parameters:**
- `longitude`: Longitud (requerido)
- `latitude`: Latitud (requerido)
- `maxDistance`: Distancia máxima en metros (default: 5000)

**Ejemplo:**
```
GET /api/chargers/nearby?longitude=-71.6138&latitude=-33.0366&maxDistance=3000
```

**Response (200):**
```json
[
  {
    "_id": "65f...",
    "name": "Estación Centro",
    "location": {...},
    ...
  }
]
```

---

#### PATCH `/api/chargers/:id/name`

Actualizar el nombre de un cargador.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Estación Centro - Renovada"
}
```

**Permisos:**
- Propietario del cargador
- `app_admin`

**Response (200):**
```json
{
  "message": "Nombre del cargador actualizado correctamente",
  "charger": {...}
}
```

---

#### DELETE `/api/chargers/:id`

Eliminar un cargador.

**Headers:**
```
Authorization: Bearer <token>
```

**Permisos:**
- Propietario del cargador
- `app_admin`

**Response (200):**
```json
{
  "message": "Cargador eliminado correctamente"
}
```

**Nota:** También elimina la referencia del cargador en `ownedStations` del usuario.

---

#### GET `/api/chargers/:id/usage-history`

Obtener historial de uso de un cargador.

**Query Parameters:**
- `startDate`: Fecha inicio (ISO 8601)
- `endDate`: Fecha fin (ISO 8601)

**Response (200):**
```json
[
  {
    "_id": "65f...",
    "chargerId": "65f...",
    "vehicleId": {
      "model": "Nissan Leaf"
    },
    "startTime": "2025-01-15T10:00:00Z",
    "endTime": "2025-01-15T12:30:00Z",
    "energyDelivered": 35.5,
    "cost": 12.5
  },
  ...
]
```

---

#### GET `/api/chargers/:id/usage-stats`

Obtener estadísticas de uso de un cargador.

**Query Parameters:**
- `period`: Agrupación (`day`, `week`, `month`, `year`)

**Response (200):**
```json
{
  "usageStats": [
    {
      "_id": {"year": 2025, "month": 1},
      "totalEnergy": 1250.5,
      "sessionCount": 45,
      "totalDuration": 3200,
      "avgDuration": 71.1,
      "revenue": 450.0
    }
  ],
  "occupancyRate": 65
}
```

---

### 3. Reservas (`/api/reservations`)

#### POST `/api/reservations`

Crear una nueva reserva.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "vehicleId": "65f...",
  "chargerId": "65f...",
  "startTime": "2025-11-05T10:00:00Z",
  "endTime": "2025-11-05T12:00:00Z"
}
```

**Validaciones:**
- No hay conflictos con otras reservas del mismo cargador
- No hay conflictos con otras reservas del mismo vehículo
- `endTime` > `startTime`

**Response (201):**
```json
{
  "message": "Reserva creada",
  "reservation": {
    "_id": "65f...",
    "vehicleId": "65f...",
    "chargerId": "65f...",
    "userId": "65f...",
    "startTime": "2025-11-05T10:00:00Z",
    "endTime": "2025-11-05T12:00:00Z",
    "status": "upcoming"
  }
}
```

**Errores:**
- `409`: Conflicto de reservas
- `400`: Fechas inválidas

---

#### GET `/api/reservations`

Obtener reservas del usuario autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
[
  {
    "_id": "65f...",
    "vehicleId": {...},
    "chargerId": {...},
    "startTime": "2025-11-05T10:00:00Z",
    "endTime": "2025-11-05T12:00:00Z",
    "status": "upcoming",
    "acceptanceStatus": "pending"
  },
  ...
]
```

---

#### DELETE `/api/reservations/:id`

Cancelar una reserva.

**Headers:**
```
Authorization: Bearer <token>
```

**Restricciones:**
- No se pueden cancelar reservas con estado `completed` o `cancelled`

**Response (200):**
```json
{
  "message": "Reserva cancelada exitosamente",
  "reservation": {...}
}
```

---

#### POST `/api/reservations/:id/accept`

Aceptar una reserva (usuario o propietario de estación).

**Headers:**
```
Authorization: Bearer <token>
```

**Permisos:**
- Usuario que creó la reserva
- Propietario del cargador
- `app_admin`

**Response (200):**
```json
{
  "message": "Reserva aceptada",
  "reservation": {...}
}
```

**Nota:** Envía notificaciones en tiempo real a ambas partes.

---

#### POST `/api/reservations/:id/cancel`

Cancelar una reserva con motivo.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "reason": "mantenimiento"
}
```

**Motivos válidos:**
- `indisponibilidad`
- `mantenimiento`
- `falta_tiempo`
- `otro`

**Response (200):**
```json
{
  "message": "Reserva cancelada",
  "reservation": {
    "status": "cancelled",
    "cancellationReason": "mantenimiento",
    "cancelledBy": "owner"
  }
}
```

---

#### POST `/api/reservations/update-statuses`

Actualizar estados de reservas basándose en la hora actual.

**Acciones:**
- `upcoming` → `active` (si `startTime` ≤ ahora < `endTime`)
- `active` → `completed` (si `endTime` ≤ ahora)

**Response (200):**
```json
{
  "message": "Estados de reservas actualizados"
}
```

**Nota:** Este endpoint se llama automáticamente por el scheduler.

---

### 4. Notificaciones (`/api/notifications`)

#### GET `/api/notifications`

Obtener notificaciones del usuario autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `onlyUnread`: `true` para solo no leídas

**Response (200):**
```json
[
  {
    "_id": "65f...",
    "user": "65f...",
    "title": "Reserva aceptada",
    "message": "Tu reserva ha sido aceptada por el dueño de la estación.",
    "type": "success",
    "read": false,
    "data": {
      "reservationId": "65f...",
      "chargerName": "Estación Centro"
    },
    "createdAt": "2025-11-04T15:30:00Z"
  },
  ...
]
```

---

#### POST `/api/notifications`

Crear una notificación (requiere autenticación).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "userId": "65f...",
  "title": "Mantenimiento programado",
  "message": "La estación estará en mantenimiento el 10/11",
  "type": "warning",
  "data": {
    "chargerId": "65f..."
  }
}
```

**Tipos válidos:**
- `info`
- `success`
- `warning`
- `error`

**Response (201):**
```json
{
  "_id": "65f...",
  "user": "65f...",
  "title": "Mantenimiento programado",
  ...
}
```

**Nota:** También emite la notificación en tiempo real vía WebSocket.

---

#### POST `/api/notifications/:id/read`

Marcar una notificación como leída.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "_id": "65f...",
  "read": true,
  ...
}
```

---

#### POST `/api/notifications/read-all`

Marcar todas las notificaciones como leídas.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true
}
```

---

#### DELETE `/api/notifications/:id`

Eliminar una notificación.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Notificación eliminada"
}
```

---

### 5. Vehículos (`/api/vehicles`)

#### GET `/api/vehicles`

Obtener todos los vehículos o filtrar por usuario.

**Query Parameters:**
- `userId`: Filtrar por propietario

**Response (200):**
```json
[
  {
    "_id": "65f...",
    "userId": "65f...",
    "model": "Tesla Model 3",
    "chargerType": "Tesla",
    "batteryCapacity": 75,
    "currentChargeLevel": 80
  },
  ...
]
```

---

#### POST `/api/vehicles`

Crear un nuevo vehículo (requiere autenticación).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "model": "Nissan Leaf",
  "chargerType": "Type2",
  "batteryCapacity": 40,
  "currentChargeLevel": 60
}
```

**Response (201):**
```json
{
  "_id": "65f...",
  "userId": "65f...",
  "model": "Nissan Leaf",
  ...
}
```

---

#### PATCH `/api/vehicles/:id`

Actualizar un vehículo.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body (ejemplo):**
```json
{
  "currentChargeLevel": 90
}
```

**Campos actualizables:**
- `model`
- `chargerType`
- `batteryCapacity`
- `currentChargeLevel`

**Response (200):**
```json
{
  "message": "Vehículo actualizado",
  "vehicle": {...}
}
```

---

#### DELETE `/api/vehicles/:id`

Eliminar un vehículo.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Vehículo eliminado correctamente"
}
```

---

### 6. Estadísticas (`/api/stats`)

#### GET `/api/stats/overview`

Estadísticas generales del sistema.

**Response (200):**
```json
{
  "totalVehicles": 125,
  "totalChargers": 48,
  "totalSessions": 3420,
  "totalEnergy": 125680.5,
  "totalReservations": 1850
}
```

---

#### GET `/api/stats/charger-types`

Estadísticas por tipo de cargador.

**Response (200):**
```json
[
  {
    "_id": "Type2",
    "count": 25,
    "avgPower": 22
  },
  {
    "_id": "CCS",
    "count": 15,
    "avgPower": 50
  },
  ...
]
```

---

#### GET `/api/stats/energy-monthly`

Consumo energético por mes.

**Response (200):**
```json
[
  {
    "_id": {"year": 2025, "month": 1},
    "totalEnergy": 12500.5,
    "sessionCount": 450
  },
  ...
]
```

---

#### GET `/api/stats/top-energy-vehicles`

Top 5 vehículos con mayor consumo.

**Response (200):**
```json
[
  {
    "_id": "65f...",
    "totalEnergy": 1250.5,
    "sessionCount": 45,
    "vehicle": {
      "model": "Tesla Model S"
    }
  },
  ...
]
```

---

#### GET `/api/stats/usage-by-hour`

Uso de cargadores por hora del día.

**Response (200):**
```json
[
  {
    "_id": 10,  // Hora (0-23)
    "sessionCount": 45,
    "totalEnergy": 320.5
  },
  ...
]
```

---

### 7. Calendario (`/api/calendar`)

#### GET `/api/calendar/:chargerId`

Obtener disponibilidad de un cargador en un rango de fechas.

**Query Parameters:**
- `startDate`: Fecha inicio (YYYY-MM-DD)
- `endDate`: Fecha fin (YYYY-MM-DD)

**Response (200):**
```json
[
  {
    "date": "2025-11-05",
    "reservations": [
      {
        "startTime": "2025-11-05T10:00:00Z",
        "endTime": "2025-11-05T12:00:00Z",
        "status": "upcoming"
      }
    ],
    "available": true
  },
  ...
]
```

---

### 8. Favoritos (`/api/favourites`)

#### GET `/api/favourites`

Obtener estaciones favoritas del usuario.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
[
  {
    "_id": "65f...",
    "name": "Estación Centro",
    "location": {...},
    ...
  }
]
```

---

#### POST `/api/favourites`

Agregar una estación a favoritos.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "chargerId": "65f..."
}
```

**Response (200):**
```json
{
  "message": "Agregado a favoritos",
  "favorites": [...]
}
```

---

#### DELETE `/api/favourites/:chargerId`

Eliminar una estación de favoritos.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Eliminado de favoritos",
  "favorites": [...]
}
```

---

### 9. Simulador (`/api/simulator`)

El simulador permite crear vehículos virtuales que simulan sesiones de carga realistas.

#### POST `/api/simulator/create`

Crear un vehículo simulado.

**Request Body:**
```json
{
  "model": "Vehículo Simulado 1",
  "chargerType": "Type2",
  "batteryCapacity": 60,
  "currentChargeLevel": 20
}
```

**Response (201):**
```json
{
  "message": "Vehículo simulado creado",
  "vehicle": {...}
}
```

---

#### POST `/api/simulator/start`

Iniciar una sesión de carga simulada.

**Request Body:**
```json
{
  "vehicleId": "65f...",
  "chargerId": "65f..."
}
```

**Response (200):**
```json
{
  "message": "Sesión iniciada",
  "session": {...}
}
```

**Nota:** El simulador actualiza el nivel de carga del vehículo cada 5 segundos.

---

#### GET `/api/simulator/status`

Obtener estado de todos los vehículos simulados activos.

**Response (200):**
```json
[
  {
    "vehicleId": "65f...",
    "model": "Vehículo Simulado 1",
    "currentCharge": 45,
    "targetCharge": 80,
    "chargerId": "65f...",
    "isCharging": true
  },
  ...
]
```

---

### 10. Tiempo Real (`/api/realtime`)

#### GET `/api/realtime/chargers`

Obtener estado en tiempo real de todos los cargadores.

**Response (200):**
```json
[
  {
    "_id": "65f...",
    "name": "Estación Centro",
    "status": "occupied",
    "activeSession": {
      "vehicleId": "65f...",
      "startTime": "2025-11-04T14:00:00Z",
      "energyDelivered": 15.5
    }
  },
  ...
]
```

---

### 11. Usuarios (`/api/users`)

**Nota:** Requiere rol `app_admin` para la mayoría de endpoints.

#### GET `/api/users`

Obtener todos los usuarios.

**Headers:**
```
Authorization: Bearer <token> (app_admin)
```

**Response (200):**
```json
[
  {
    "_id": "65f...",
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "role": "ev_user",
    "vehicles": [...],
    "ownedStations": [...]
  },
  ...
]
```

---

#### PATCH `/api/users/:id/role`

Cambiar el rol de un usuario.

**Headers:**
```
Authorization: Bearer <token> (app_admin)
```

**Request Body:**
```json
{
  "role": "station_admin"
}
```

**Response (200):**
```json
{
  "message": "Rol actualizado",
  "user": {...}
}
```

---

### 12. Recomendaciones (`/api/recommendations`)

#### POST `/api/recommendations`

Obtener recomendaciones de cargadores basadas en ubicación y vehículo.

**Request Body:**
```json
{
  "userLocation": {
    "latitude": -33.0366,
    "longitude": -71.6138
  },
  "vehicleId": "65f...",
  "targetChargeLevel": 80
}
```

**Response (200):**
```json
{
  "best": {
    "chargerId": "65f...",
    "name": "Estación Centro",
    "score": 95.5,
    "distance": 1.2,
    "estimatedTime": 45,
    "route": {...}
  },
  "ranking": [...]
}
```

---

## 🔐 Autenticación y Autorización

### Middleware `authenticateToken`

**Ubicación:** `routes/auth.js`

Verifica el token JWT en las peticiones protegidas.

**Uso:**
```javascript
router.get('/ruta-protegida', authenticateToken, async (req, res) => {
  // req.user contiene: { userId, role }
  const userId = req.user.userId;
  const userRole = req.user.role;
  ...
});
```

**Headers requeridos:**
```
Authorization: Bearer <token>
```

**Payload del token:**
```json
{
  "userId": "65f...",
  "role": "ev_user",
  "iat": 1698765432,
  "exp": 1698769032
}
```

**Duración:** 1 hora (configurable en `JWT_SECRET`)

### Niveles de Acceso

| Rol | Permisos |
|-----|----------|
| **app_admin** | Acceso total: gestionar usuarios, cargadores, ver estadísticas globales |
| **station_admin** | Gestionar sus propias estaciones, ver reservas de sus estaciones |
| **ev_user** | Crear reservas, gestionar sus vehículos, favoritos |

---

## 🔌 WebSockets y Tiempo Real

### Configuración Socket.IO

**Archivo:** `utils/socket.js`

**Funciones principales:**

#### `init(server, origin)`

Inicializa Socket.IO en el servidor HTTP.

**Parámetros:**
- `server`: Instancia de `http.Server`
- `origin`: Origen permitido para CORS (default: `'*'`)

**Eventos del cliente:**

```javascript
// Conectar
socket.on('connect', () => {
  console.log('Conectado al servidor WebSocket');
});

// Autenticarse (enviar userId)
socket.emit('authenticate', { userId: '65f...' });

// Recibir notificación
socket.on('notification', (notification) => {
  console.log('Nueva notificación:', notification);
});

// Actualización de cargador
socket.on('charger-update', (charger) => {
  console.log('Cargador actualizado:', charger);
});
```

#### `emitToUser(userId, event, data)`

Emite un evento a un usuario específico.

**Parámetros:**
- `userId`: ID del usuario destinatario (string)
- `event`: Nombre del evento (ej: `'notification'`)
- `data`: Datos a enviar

**Ejemplo:**
```javascript
const { emitToUser } = require('../utils/socket');

emitToUser('65f...', 'notification', {
  title: 'Nueva reserva',
  message: 'Tienes una nueva reserva pendiente'
});
```

### Eventos en Tiempo Real

| Evento | Descripción | Datos |
|--------|-------------|-------|
| `notification` | Nueva notificación para el usuario | Objeto `Notification` |
| `charger-update` | Actualización de estado de cargador | Objeto `Charger` |
| `reservation-update` | Cambio en una reserva | Objeto `Reservation` |

---

## 🛠️ Utilidades

### `calcularDistancia.js`

Calcula la distancia entre dos puntos geográficos usando la fórmula de Haversine.

**Función:**
```javascript
function calcularDistancia(lat1, lon1, lat2, lon2)
```

**Parámetros:**
- `lat1, lon1`: Latitud y longitud del punto 1
- `lat2, lon2`: Latitud y longitud del punto 2

**Retorna:** Distancia en kilómetros

**Ejemplo:**
```javascript
const distancia = calcularDistancia(-33.0366, -71.6138, -33.0450, -71.6200);
console.log(`Distancia: ${distancia.toFixed(2)} km`);
```

---

### `reservationScheduler.js`

Scheduler que envía recordatorios de reservas próximas.

**Función:** `startReservationScheduler()`

**Comportamiento:**
- Se ejecuta cada 5 minutos
- Busca reservas que empiezan en los próximos 15 minutos
- Envía notificación al usuario
- Marca la reserva como recordada (`reminderSent: true`)

**Ejemplo de notificación:**
```
Tu reserva en "Estación Centro" empieza pronto (10:00 AM)
```

---

## 🚗 Simulador de Vehículos

### Componentes

#### `ev-simulator.js`

Lógica del simulador de carga.

**Clase:** `EVSimulator`

**Métodos:**

##### `startCharging(vehicleId, chargerId, targetCharge)`

Inicia una sesión de carga simulada.

**Parámetros:**
- `vehicleId`: ID del vehículo
- `chargerId`: ID del cargador
- `targetCharge`: Nivel objetivo de carga (0-100)

**Comportamiento:**
- Actualiza el nivel de carga cada 5 segundos
- Incremento: `(powerOutput / batteryCapacity) * 5 / 3600 * 100`
- Crea sesión de carga al finalizar
- Emite eventos de progreso

##### `stopCharging(vehicleId)`

Detiene la carga de un vehículo.

##### `getStatus()`

Retorna el estado de todos los vehículos cargando.

---

#### `simulator-controller.js`

Controlador que gestiona múltiples instancias del simulador.

**Métodos:**

- `createSimulatedVehicle(vehicleData)`: Crea un vehículo para simulación
- `startSession(vehicleId, chargerId)`: Inicia sesión simulada
- `stopSession(vehicleId)`: Detiene sesión
- `getActiveSimulations()`: Obtiene simulaciones activas

---

## 📝 Comentarios en el Código

Ahora voy a agregar comentarios detallados a las funciones principales del backend...

