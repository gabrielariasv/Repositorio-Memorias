# Documentación Frontend - ECCODe (Estaciones de Carga Compartidas On Demmand)

## Tabla de Contenidos
1. [Descripción General](#descripción-general)
2. [Tecnologías y Bibliotecas](#tecnologías-y-bibliotecas)
3. [Arquitectura del Proyecto](#arquitectura-del-proyecto)
4. [Estructura de Directorios](#estructura-de-directorios)
5. [Interfaces de Usuario](#interfaces-de-usuario)
6. [Componentes Principales](#componentes-principales)
7. [Contextos y Gestión de Estado](#contextos-y-gestión-de-estado)
8. [Modelos y Tipos](#modelos-y-tipos)
9. [Utilidades y Hooks](#utilidades-y-hooks)
10. [Capacitor y Mobile](#capacitor-y-mobile)
11. [Compilación y Despliegue](#compilación-y-despliegue)

---

## Descripción General

**ECCODe** es una aplicación web y móvil (Android/iOS) desarrollada con React + TypeScript que permite a los usuarios:
- Buscar y reservar estaciones de carga para vehículos eléctricos
- Visualizar cargadores en un mapa interactivo
- Gestionar vehículos eléctricos personales
- Recibir notificaciones sobre reservas
- Administrar estaciones de carga (para propietarios)
- Ver estadísticas y gráficas de uso

La aplicación soporta dos tipos de interfaz:
- **Interfaz de Escritorio**: Layout completo con sidebar navigation
- **Interfaz Móvil**: Layout optimizado para pantallas pequeñas con navegación adaptativa

---

## Tecnologías y Bibliotecas

### Core Framework
- **React 19.1.0**: Framework principal para UI
- **TypeScript 5.8.3**: Tipado estático
- **Vite 6.3.5**: Build tool y dev server
- **React Router DOM 7.6.2**: Navegación y routing

### UI y Estilos
- **Tailwind CSS 4.1.11**: Framework de estilos utility-first
- **@tailwindcss/vite**: Plugin de Vite para Tailwind
- **PostCSS + Autoprefixer**: Procesamiento de CSS

### Mapas y Geolocalización
- **Leaflet 1.9.4**: Biblioteca de mapas interactivos
- **React Leaflet 5.0.0**: Integración de Leaflet con React
- **@types/leaflet**: Tipos para TypeScript

### Gráficas y Visualización
- **Chart.js 4.5.0**: Biblioteca de gráficas
- **react-chartjs-2 5.3.0**: Wrapper de Chart.js para React
- **chartjs-adapter-date-fns 3.0.0**: Adaptador para escalas de tiempo
- **chartjs-plugin-zoom 2.2.0**: Plugin para zoom/pan en gráficas
- **date-fns 4.1.0**: Manipulación de fechas

### Búsqueda y Filtrado
- **Fuse.js 7.1.0**: Búsqueda difusa (fuzzy search)

### Comunicación
- **Axios 1.11.0**: Cliente HTTP
- **socket.io-client 4.8.1**: WebSocket para notificaciones en tiempo real

### Mobile (Capacitor)
- **@capacitor/core 7.4.0**: Core de Capacitor
- **@capacitor/cli 7.4.0**: CLI de Capacitor
- **@capacitor/android 7.4.0**: Plataforma Android
- **@capacitor/ios 7.4.0**: Plataforma iOS
- **@capacitor/geolocation 7.1.5**: Plugin de geolocalización
- **@capacitor/local-notifications 7.0.3**: Notificaciones locales
- **@capacitor/network 7.0.2**: Estado de red
- **@capacitor/push-notifications 7.0.3**: Notificaciones push
- **@capacitor/assets 3.0.5**: Generación de iconos y splash screens

### Notificaciones UI
- **@mantine/notifications 8.3.5**: Sistema de toasts/notificaciones

---

## Arquitectura del Proyecto

El proyecto sigue una arquitectura **Component-Based** con separación de responsabilidades:

```
Frontend (React + TypeScript)
│
├── Presentación (Components)
│   ├── Layout Components (Navbar, Sidebar)
│   ├── Feature Components (ChargerList, ChargerMap, Calendar)
│   └── Common Components (Modal, Toast, Search)
│
├── Estado Global (Contexts)
│   ├── AuthContext (autenticación)
│   ├── EvVehicleContext (vehículos)
│   └── NotificationsContext (notificaciones)
│
├── Lógica de Negocio (Hooks + Utils)
│   ├── Custom Hooks (useAuth, useEvVehicle)
│   └── Utilidades (cálculos, formateo)
│
└── Datos (Models + Types)
    ├── Interfaces (Charger, Vehicle, Reservation)
    └── Tipos (enums, type aliases)
```

### Flujo de Datos

```
API Backend (REST + WebSocket)
        ↓
    Contexts (Estado Global)
        ↓
    Custom Hooks
        ↓
    Components (Props)
        ↓
    UI (Render)
```

---

## Estructura de Directorios

```
src/
├── assets/                    # Recursos estáticos (imágenes, iconos)
│
├── components/                # Componentes React
│   ├── AdminDashboard.tsx         # Dashboard para administradores
│   ├── ChargerDetail.tsx          # Detalle de un cargador
│   ├── ChargerForm.tsx            # Formulario crear/editar cargador
│   ├── ChargerList.tsx            # Lista de cargadores (Desktop + Mobile)
│   ├── ChargerMap.tsx             # Mapa interactivo con marcadores
│   ├── ChargerOccupancyChart.tsx  # Gráfica de ocupación
│   ├── ChargerOptionsModal.tsx    # Modal de búsqueda/reserva inteligente
│   ├── ChargerSearch.tsx          # Barra de búsqueda
│   ├── ChargingSessionsChart.tsx  # Gráfica de sesiones de carga
│   ├── ConfirmCancelModal.tsx     # Modal de confirmación
│   ├── Dashboard.tsx              # Dashboard principal con router
│   ├── DropdownSearch.tsx/css     # Búsqueda con dropdown
│   ├── Event/                     # Componentes de eventos de calendario
│   ├── LocationSelector.tsx       # Selector de ubicación en mapa
│   ├── Login.tsx                  # Pantalla de login
│   ├── MapPicker.tsx              # Selector de ubicación
│   ├── MonthlyCalendar/           # Calendario mensual
│   ├── MyFavourites.tsx           # Lista de favoritos
│   ├── NotificationBell.tsx       # Campana de notificaciones
│   ├── PermissionsModal.tsx       # Modal de permisos
│   ├── ProtectedRoute.tsx         # HOC para rutas protegidas
│   ├── SignUp.tsx                 # Registro de usuarios
│   ├── Toast.tsx                  # Componente de toast
│   ├── VehicleDashboard.tsx       # Dashboard de vehículos (Desktop + Mobile)
│   ├── VerticalNavbar.tsx         # Barra de navegación lateral
│   └── WeeklyView/                # Vista semanal de calendario
│
├── contexts/                  # Contextos de React (estado global)
│   ├── AuthContext.tsx            # Contexto de autenticación
│   ├── EvVehicleContext.tsx       # Contexto de vehículos eléctricos
│   └── NotificationsContext.tsx   # Contexto de notificaciones
│
├── hooks/                     # Custom Hooks
│   ├── useAuth.ts                 # Hook para autenticación
│   └── useEvVehicle.ts            # Hook para vehículos
│
├── models/                    # Modelos de datos
│   ├── Charger.ts                 # Interface Charger, ChargerType enum
│   ├── ThingSpeakChart.tsx        # Componente de gráfica ThingSpeak
│   └── [otros modelos]
│
├── pages/                     # Páginas de la aplicación
│   ├── ChargerCalendarPage.tsx    # Página de calendario
│   ├── ChargerHistoryPage.tsx     # Historial de cargas
│   ├── ChargerReservationPage.tsx # Reservas
│   └── ProfilePage.tsx            # Perfil de usuario
│
├── types/                     # Tipos TypeScript adicionales
│
├── utils/                     # Funciones utilitarias
│   ├── calcularDistancia.ts       # Cálculo de distancia haversine
│   ├── getTravelTimeORS.ts        # Obtener tiempo de viaje (OpenRouteService)
│   └── [otras utilidades]
│
├── App.tsx                    # Componente raíz de la app
├── main.tsx                   # Punto de entrada
├── index.css                  # Estilos globales + Tailwind
└── vite-env.d.ts              # Tipos de ambiente Vite
```

---

## Interfaces de Usuario

### Interfaz de Escritorio

**Características:**
- Sidebar izquierdo fijo con navegación vertical (`VerticalNavbar`)
- Content principal ocupa `lg:pl-64` (offset por sidebar)
- Layout de 2 columnas en vistas de lista + mapa
- Gráficas con tooltips y zoom
- Modals para formularios y confirmaciones

**Componentes Desktop-Specific:**
- `DesktopChargerList` en `ChargerList.tsx`
- Layout horizontal en `VehicleDashboard.tsx` con mapa fijo
- Sidebar siempre visible (≥1024px)

**Clases Tailwind típicas:**
```css
lg:pl-64        /* Offset por sidebar */
lg:grid-cols-2  /* 2 columnas en desktop */
hidden lg:block /* Solo visible en desktop */
```

### Interfaz Móvil

**Características:**
- Navegación de pestañas en la parte superior
- Mapa colapsable/expandible
- Listas scrolleables verticales
- Botones flotantes (FAB)
- Gestos touch optimizados

**Componentes Mobile-Specific:**
- `MobileChargerList` en `ChargerList.tsx`
- Layout vertical en `VehicleDashboard.tsx`
- Mapa minimizable

**Clases Tailwind típicas:**
```css
lg:hidden       /* Solo visible en móvil */
touch-manipulation /* Optimización touch */
fixed bottom-4  /* Botones flotantes */
```

### Adaptación Responsive

El punto de quiebre principal es `lg` (1024px):

```typescript
// Detección de tamaño
const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

useEffect(() => {
  const handleResize = () => setIsMobile(window.innerWidth < 1024);
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

---

## Componentes Principales

### 1. Dashboard.tsx

**Descripción:** Router principal de la aplicación con navegación por roles.

**Funcionalidades:**
- Detecta rol del usuario (`app_admin`, `station_owner`, `vehicle_user`)
- Renderiza sidebar vertical (`VerticalNavbar`)
- Define rutas protegidas con React Router
- Gestiona navegación entre secciones

**Rutas principales:**
```typescript
/                          → VehicleDashboard (usuario)
/admin                     → AdminDashboard (admin)
/station/:stationId/...    → Gestión de estaciones (propietario)
/charging-history          → Historial de cargas
/reservations              → Reservas
/profile                   → Perfil
```

---

### 2. VehicleDashboard.tsx

**Descripción:** Dashboard principal para usuarios de vehículos eléctricos.

**Funcionalidades:**
- Vista Desktop: Layout horizontal con mapa fijo + lista scrolleable
- Vista Mobile: Layout vertical con mapa minimizable + lista
- Integración con `ChargerOptionsModal` para búsqueda inteligente
- Gestión de favoritos
- Ver historial de cargas
- Gestionar reservas activas

**Estados principales:**
```typescript
const [allChargers, setAllChargers] = useState<any[]>([]);
const [userLocation, setUserLocation] = useState<{lat, lng} | null>(null);
const [reservations, setReservations] = useState<Reservation[]>([]);
const [chargingHistory, setChargingHistory] = useState<ChargingSession[]>([]);
```

**Funciones complejas:**
- `fetchAllChargers()`: Obtiene cargadores del backend
- `handleReserveCharger()`: Navega a reserva con contexto
- `fetchUserLocation()`: Geolocalización del usuario

---

### 3. ChargerList.tsx

**Descripción:** Componente dual (Desktop/Mobile) para mostrar lista de cargadores.

**Funcionalidades:**
- Búsqueda difusa con Fuse.js
- Filtros por tipo, estado, distancia
- Expansión/colapso de detalles
- Clic en mapa → scroll y highlight en lista
- Gestión de favoritos
- Renombrar cargadores (propietarios)

**Estructura:**
```typescript
ChargerList
├── Desktop Layout (≥1024px)
│   └── DesktopChargerList
│       ├── Sidebar de búsqueda/filtros
│       └── Grid de cards de cargadores
│
└── Mobile Layout (<1024px)
    └── MobileChargerList
        ├── Barra de búsqueda superior
        └── Lista vertical de cargadores
```

**Funciones destacadas:**
```typescript
// Manejo de clic desde mapa
const handleChargerClickFromMap = (chargerId: string) => {
  setExpandedChargerId(chargerId);
  setHighlightedChargerId(chargerId);
  setTimeout(() => {
    const element = chargerRefs.current[chargerId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 100);
  setTimeout(() => setHighlightedChargerId(null), 2000);
};
```

---

### 4. ChargerMap.tsx

**Descripción:** Mapa interactivo con Leaflet mostrando cargadores y usuario.

**Funcionalidades:**
- Marcadores de cargadores con popups informativos
- Marcador de ubicación del usuario
- Modo oscuro/claro automático
- Clic en marcador → callback a parent
- Gestión de favoritos desde popups
- Método `flyTo` para centrar vista programáticamente

**Props:**
```typescript
interface ChargerMapProps {
  chargers: ChargerWithLatLng[];
  userLocation?: { lat: number, lng: number } | null;
  center?: { lat: number, lng: number } | null;
  onReserveCharger?: (chargerId: string) => void;
  onChargerClick?: (chargerId: string) => void;
  currentUser?: any;
  onFavoritesChange?: (favIds: string[]) => void;
}
```

**Ref Methods:**
```typescript
const mapRef = useRef<ChargerMapHandle>(null);
mapRef.current?.flyTo({ lat: -33.4, lng: -70.6, zoom: 15 });
```

---

### 5. ChargerOptionsModal.tsx

**Descripción:** Modal inteligente para búsqueda y recomendación de cargadores.

**Funcionalidades:**
- Dos modos de búsqueda:
  - **Modo Charge**: Busca por nivel de carga objetivo (%)
  - **Modo Time**: Busca por tiempo disponible (minutos)
- Algoritmo de ranking multi-criterio:
  - Distancia al usuario
  - Costo de energía
  - Tiempo de carga estimado
  - Demora por reservas futuras
- Preferencias ajustables (sliders de peso)
- Recomendaciones sucesivas (siguiente mejor opción)
- Centrado en mapa del cargador recomendado

**Algoritmo de Ranking:**
```typescript
// Normalización min-max
const normalize = (value: number, min: number, max: number) => 
  (max - min === 0) ? 0 : (value - min) / (max - min);

// Puntaje total ponderado
const score = 
  weights.distancia * (1 - normalizedDist) +
  weights.costo * (1 - normalizedCost) +
  weights.tiempoCarga * (1 - normalizedChargeTime) +
  weights.demora * (1 - normalizedDelay);
```

---

### 6. ChargingSessionsChart.tsx

**Descripción:** Gráfica de barras mostrando energía entregada por día.

**Funcionalidades:**
- Chart.js con eje X categórico (fechas)
- Zoom horizontal con rueda/pinch
- Pan horizontal para desplazar
- Límites para no exceder datos
- Botón de reset zoom
- Tooltips con información detallada
- Touch optimizado para móvil

**Configuración:**
```typescript
{
  aspectRatio: 2,  // Relación 2:1
  plugins: {
    zoom: {
      limits: { x: { min: 0, max: dates.length - 1 } },
      zoom: { wheel: true, pinch: true, mode: 'x' },
      pan: { enabled: true, mode: 'x', threshold: 10 }
    }
  }
}
```

---

### 7. ChargerOccupancyChart.tsx

**Descripción:** Gráfica de línea mostrando ocupación de cargador en el tiempo.

**Funcionalidades:**
- Chart.js con escala de tiempo (date-fns)
- Línea escalonada (stepped: true)
- Zoom/pan en eje temporal
- Límites dinámicos basados en datos
- Reset zoom
- Touch optimizado

---

### 8. NotificationBell.tsx

**Descripción:** Campana de notificaciones con badge contador.

**Funcionalidades:**
- Muestra contador de no leídas
- Lista de notificaciones en dropdown
- Marca como leídas al hacer clic
- WebSocket para notificaciones en tiempo real
- Scroll infinito para historial

---

### 9. VerticalNavbar.tsx

**Descripción:** Barra de navegación lateral para desktop.

**Funcionalidades:**
- Links dinámicos según rol de usuario
- Iconos de Font Awesome
- Estado activo (highlight)
- Logout
- Perfil de usuario
- Colapsable en móvil

---

### 10. Login.tsx & SignUp.tsx

**Descripción:** Pantallas de autenticación.

**Funcionalidades Login:**
- Formulario email/password
- Validación de campos
- Almacenamiento de token JWT
- Redirección post-login
- Toggle de contraseña visible

**Funcionalidades SignUp:**
- Registro con nombre, email, contraseña
- Selección o ingreso manual de vehículo
- Tipos de cargador soportados
- Validaciones (email match, password strength)
- Auto-login post-registro

---

## Contextos y Gestión de Estado

### AuthContext.tsx

**Responsabilidades:**
- Almacenar estado de autenticación
- Gestionar token JWT (localStorage)
- Proveer métodos login/logout
- Verificar token al cargar app
- Refresh automático de sesión

**API:**
```typescript
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const { user, login, logout } = useAuth();
```

---

### EvVehicleContext.tsx

**Responsabilidades:**
- Gestionar lista de vehículos del usuario
- CRUD de vehículos
- Vehículo seleccionado actualmente
- Persistencia en localStorage
- Sincronización con backend

**API:**
```typescript
interface EvVehicleContextType {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  setSelectedVehicle: (vehicle: Vehicle | null) => void;
  addVehicle: (vehicle: Vehicle) => Promise<void>;
  updateVehicle: (id: string, data: Partial<Vehicle>) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  vehiclesLoading: boolean;
}

const { vehicles, selectedVehicle, setSelectedVehicle } = useEvVehicle();
```

---

### NotificationsContext.tsx

**Responsabilidades:**
- Gestionar lista de notificaciones
- Marcar como leídas
- Contador de no leídas
- WebSocket listener para nuevas notificaciones
- Persistencia temporal

**API:**
```typescript
interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  fetchNotifications: () => Promise<void>;
}

const { notifications, unreadCount, markAsRead } = useNotifications();
```

---

## Modelos y Tipos

### Charger.ts

```typescript
export interface Charger {
  _id: string;
  name: string;
  chargerType: string;              // 'CCS', 'CHAdeMO', 'Type2', 'Tesla'
  powerOutput: number;              // kW
  status: 'available' | 'occupied' | 'maintenance';
  location: {
    type: string;
    coordinates: [number, number];  // [lng, lat]
  };
  energy_cost?: number;             // CLP$/kWh
  parking_cost?: number;            // CLP$/min
  createdAt?: Date;
}

export enum ChargerType {
  TYPE1 = 'Type1',
  TYPE2 = 'Type2',
  CCS = 'CCS',
  CHADEMO = 'CHAdeMO',
  TESLA = 'Tesla'
}
```

### Vehicle (implícito en contexto)

```typescript
interface Vehicle {
  _id: string;
  name: string;
  model?: string;
  batteryCapacity: number;          // kWh
  chargerType: string;
  currentBatteryLevel?: number;     // %
  userId: string;
}
```

### Reservation (implícito)

```typescript
interface Reservation {
  _id: string;
  vehicleId: string;
  chargerId: {
    _id: string;
    name: string;
  };
  startTime: string;                // ISO date
  endTime: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  calculatedEndTime?: string;
  bufferTime?: number;              // minutos
}
```

### ChargingSession (implícito)

```typescript
interface ChargingSession {
  _id: string;
  startTime: string;
  endTime: string;
  energyDelivered: number;          // kWh
  duration: number;                 // minutos
  chargerId: {
    name: string;
    location: {
      coordinates: [number, number];
    };
  };
}
```

---

## Utilidades y Hooks

### calcularDistancia.ts

Calcula distancia haversine entre dos coordenadas geográficas.

```typescript
export const calcularDistancia = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  // Fórmula haversine
  // Retorna distancia en km
}
```

### getTravelTimeORS.ts

Obtiene tiempo de viaje desde OpenRouteService API.

```typescript
export const getTravelTimeORS = async (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<number | null> => {
  // Llama a ORS API
  // Retorna tiempo en minutos
}
```

### useAuth.ts

Custom hook que consume AuthContext.

```typescript
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
};
```

### useEvVehicle.ts

Custom hook que consume EvVehicleContext.

```typescript
export const useEvVehicle = () => {
  const context = useContext(EvVehicleContext);
  if (!context) throw new Error('useEvVehicle debe usarse dentro de EvVehicleProvider');
  return context;
};
```

---

## Capacitor y Mobile

### Configuración (capacitor.config.ts)

```typescript
const config: CapacitorConfig = {
  appId: 'com.app.cargadores',
  appName: 'ECCODe',
  webDir: 'dist',
  server: {
    url: 'https://repositorio-memorias.onrender.com',
    cleartext: true
  }
};
```

**Nota:** Para producción offline, comentar `server` para usar assets embebidos.

### Plugins Utilizados

1. **Geolocation**: Obtener ubicación GPS del usuario
2. **Local Notifications**: Notificaciones programadas
3. **Network**: Detectar estado de conectividad
4. **Push Notifications**: Notificaciones push remotas

### Permisos (AndroidManifest.xml)

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />
```

### Generación de Assets

Script automatizado para iconos y splash screens:

```bash
npm run set:icon      # Copia eccode.png a public/ y resources/
npm run gen:assets    # Genera densidades Android
npm run apply:icon    # Pipeline completa + sync
```

### Build Android Release

```bash
# 1. Build web
npm run build

# 2. Sync con Android
npx cap copy android

# 3. Build APK
cd android
./gradlew assembleRelease

# Output: android/app/build/outputs/apk/release/app-release-unsigned.apk
```

---

## Compilación y Despliegue

### Desarrollo Local

```bash
# Instalar dependencias
npm install

# Dev server (hot reload)
npm run dev

# Abrir en navegador: http://localhost:5173
```

### Build de Producción

```bash
# TypeScript check + Vite build
npm run build

# Output: dist/
# - index.html
# - assets/*.js (bundled + minified)
# - assets/*.css
```

### Preview de Build

```bash
npm run preview
# Sirve dist/ en http://localhost:4173
```

### Lint y Formato

```bash
npm run lint
# ESLint con configuración TypeScript
```

### Android Build

Ver sección [Capacitor y Mobile](#capacitor-y-mobile).

### iOS Build (no implementado aún)

Requiere Xcode y configuración adicional.

---

## Optimizaciones y Buenas Prácticas

### Performance

1. **Code Splitting**: Los chunks son grandes (>500KB). Considerar `React.lazy()` para rutas.
2. **Memoization**: Usar `useMemo` y `useCallback` en funciones costosas.
3. **Virtual Scrolling**: Para listas largas de cargadores.
4. **Image Optimization**: Lazy loading de imágenes.

### Accesibilidad

1. **ARIA labels**: Agregar a botones de iconos.
2. **Keyboard navigation**: Mejorar navegación con teclado.
3. **Contrast ratios**: Verificar en modo oscuro.

### Seguridad

1. **Token storage**: JWT en `localStorage` (considerar `httpOnly` cookies).
2. **Input sanitization**: Validar datos de usuario.
3. **HTTPS**: Usar siempre en producción.

### Mantenibilidad

1. **Tipado estricto**: Evitar `any`, usar interfaces concretas.
2. **Comentarios**: Documentar funciones complejas (ver siguiente sección).
3. **Tests**: Implementar tests unitarios (Jest + React Testing Library).
4. **Storybook**: Para desarrollo aislado de componentes.

---

## Próximos Pasos

1. **Tests**: Agregar cobertura de tests
2. **PWA**: Service workers para modo offline
3. **i18n**: Internacionalización (español/inglés)
4. **Analytics**: Integrar Google Analytics o similar
5. **Error Boundary**: Componentes para manejo de errores
6. **Logging**: Sistema de logs para debugging
7. **Performance Monitoring**: Integrar herramientas de monitoreo

---

## Recursos Adicionales

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Capacitor Docs](https://capacitorjs.com/docs)
- [Leaflet Documentation](https://leafletjs.com/)
- [Chart.js Guide](https://www.chartjs.org/docs/latest/)

---

**Última actualización:** Noviembre 2025  
**Versión:** 1.0.0  
**Autores:** Gabriel Arias y Javier Martínez