/**
 * CLASE: EVChargingSimulator
 * Simulador de sesión de carga de vehículo eléctrico en tiempo real
 * 
 * Funcionalidades:
 * - Simula carga progresiva con variación aleatoria de potencia
 * - Genera datos en tiempo real cada minuto
 * - Actualiza estado del cargador (occupied/available)
 * - Guarda historial de carga
 * - Maneja inicio/detención de sesión
 * 
 * Parámetros de simulación:
 * - Intervalo: 60 segundos (1 minuto)
 * - Variación de potencia: ±10% del powerOutput nominal
 * - Energía objetivo: 5-10 kWh (aleatorio)
 * - Tarifa: 0.15 $/kWh
 */
const mongoose = require('mongoose');
const Charger = require('../models/Charger');

class EVChargingSimulator {
    /**
     * Constructor del simulador
     * 
     * @param {string} chargerId - ID del cargador
     * @param {string} vehicleId - ID del vehículo
     * @param {number} powerOutput - Potencia del cargador (kW)
     */
    constructor(chargerId, vehicleId, powerOutput) {
        this.chargerId = chargerId;
        this.vehicleId = vehicleId;
        this.powerOutput = powerOutput; // Potencia nominal en kW
        this.isCharging = false;
        this.startTime = null;
        this.currentEnergy = 0; // Energía acumulada en kWh
        this.intervalId = null;
        this.realTimeData = []; // Array de puntos de datos (timestamp, power, energy)
        this.intervalDuration = 60000; // 1 minuto en milisegundos
    }

    /**
     * Iniciar sesión de carga
     * 
     * PASO 1: Validar que no esté ya cargando
     * PASO 2: Inicializar estado de la sesión
     * PASO 3: Actualizar estado del cargador a 'occupied'
     * PASO 4: Registrar punto de datos inicial
     * PASO 5: Iniciar intervalo de simulación (cada 1 minuto)
     */
    async startCharging() {
        // VALIDACIÓN: Evitar inicio duplicado
        if (this.isCharging) return;
        
        // PASO 2: Inicializar variables de sesión
        this.isCharging = true;
        this.startTime = new Date();
        this.currentEnergy = 0;
        this.realTimeData = [];
        
        // PASO 3: Actualizar estado del cargador en DB
        await this.updateChargerStatus('occupied');
        
        // PASO 4: Punto de datos inicial (0 kWh, 0 kW)
        this.addDataPoint(0, 0);
        
        // PASO 5: Iniciar simulación con intervalo de 1 minuto
        this.intervalId = setInterval(() => {
            this.simulateChargingInterval();
        }, this.intervalDuration);
        
        console.log(`Carga iniciada para vehículo ${this.vehicleId} en cargador ${this.chargerId}`);
    }

    /**
     * Simular un intervalo de carga (llamado cada minuto)
     * 
     * PASO 1: Calcular energía añadida en este intervalo
     *         - Aplica variación aleatoria ±10% a la potencia
     *         - Energía = Potencia × Tiempo (kWh = kW × h)
     * PASO 2: Acumular energía total
     * PASO 3: Registrar punto de datos
     * PASO 4: Verificar si se alcanzó el objetivo (5-10 kWh)
     */
    simulateChargingInterval() {
        // PASO 1: Calcular energía para este intervalo
        const timeInHours = this.intervalDuration / (1000 * 60 * 60); // Convertir ms a horas
        const variation = 0.9 + (Math.random() * 0.2); // Variación 0.9-1.1 (±10%)
        const energyThisInterval = this.powerOutput * timeInHours * variation;
        
        // PASO 2: Acumular energía
        this.currentEnergy += energyThisInterval;
        
        // PASO 3: Añadir punto de datos con potencia actual
        this.addDataPoint(this.powerOutput * variation, this.currentEnergy);
        
        // PASO 4: Verificar completitud (objetivo aleatorio 5-10 kWh)
        const targetEnergy = 5 + Math.random() * 5;
        if (this.currentEnergy >= targetEnergy) {
            this.completeCharging();
        }
    }

    /**
     * Registrar punto de datos en tiempo real
     * 
     * @param {number} power - Potencia actual (kW)
     * @param {number} energy - Energía acumulada (kWh)
     * 
     * PASO 1: Crear objeto de punto de datos
     * PASO 2: Agregar al array de realTimeData
     * PASO 3: Log para seguimiento
     */
    addDataPoint(power, energy) {
        // PASO 1: Estructura del punto de datos
        const dataPoint = {
            timestamp: new Date(),
            power: power,
            energy: energy,
            _id: new mongoose.Types.ObjectId()
        };
        
        // PASO 2: Agregar a historial en memoria
        this.realTimeData.push(dataPoint);
        
        // PASO 3: Log de progreso
        console.log(`Datos en tiempo real: ${energy.toFixed(2)} kWh, ${power.toFixed(2)} kW`);
    }

    /**
     * Completar sesión de carga
     * Llamado cuando se alcanza el objetivo de energía
     */
    async completeCharging() {
        console.log(`Carga completada para vehículo ${this.vehicleId}`);
        await this.stopCharging();
    }

    /**
     * Detener sesión de carga
     * 
     * PASO 1: Validar que esté cargando
     * PASO 2: Limpiar intervalo de simulación
     * PASO 3: Guardar historial en DB
     * PASO 4: Actualizar estado del cargador a 'available'
     */
    async stopCharging() {
        // VALIDACIÓN: Solo detener si está cargando
        if (!this.isCharging) return;
        
        // PASO 2: Detener simulación
        this.isCharging = false;
        clearInterval(this.intervalId);
        
        // PASO 3: Persistir historial
        await this.saveChargingHistory();
        
        // PASO 4: Liberar cargador
        await this.updateChargerStatus('available');
        
        console.log(`Carga detenida para vehículo ${this.vehicleId}`);
    }

    /**
     * Actualizar estado del cargador en base de datos
     * También registra en occupancyHistory
     * 
     * @param {string} status - 'occupied' o 'available'
     */
    async updateChargerStatus(status) {
        try {
            await Charger.findByIdAndUpdate(this.chargerId, {
                status: status,
                $push: {
                    occupancyHistory: {
                        start: this.startTime,
                        end: new Date(),
                        occupied: status === 'occupied',
                        sessionId: new mongoose.Types.ObjectId()
                    }
                }
            });
        } catch (error) {
            console.error('Error actualizando estado del cargador:', error);
        }
    }

    /**
     * Guardar historial de carga en el modelo Charger
     * 
     * PASO 1: Calcular duración de la sesión
     * PASO 2: Crear registro de carga
     * PASO 3: Persistir en chargingHistory del cargador
     */
    async saveChargingHistory() {
        const endTime = new Date();
        const duration = (endTime - this.startTime) / (1000 * 60); // Convertir ms a minutos

        // PASO 2: Estructura del registro
        const chargingRecord = {
            startTime: this.startTime,
            endTime: endTime,
            duration: duration,
            energyDelivered: this.currentEnergy,
            vehicleId: this.vehicleId,
            sessionId: Date.now()
        };

        // PASO 3: Guardar en DB
        try {
            await Charger.findByIdAndUpdate(this.chargerId, {
                $push: { chargingHistory: chargingRecord }
            });
            
            console.log(`Historial de carga guardado: ${this.currentEnergy.toFixed(2)} kWh, ${duration.toFixed(2)} minutos`);
        } catch (error) {
            console.error('Error guardando historial de carga:', error);
        }
    }

    /**
     * Obtener datos completos de la sesión actual
     * Útil para enviar al frontend o guardar en ChargingSession
     * 
     * @returns {Object} Objeto con todos los datos de la sesión
     */
    getSessionData() {
        const endTime = new Date();
        const duration = (endTime - this.startTime) / (1000 * 60); // minutos

        return {
            originalId: Date.now(),
            vehicleId: this.vehicleId,
            chargerId: this.chargerId,
            startTime: this.startTime,
            endTime: endTime,
            energyDelivered: this.currentEnergy,
            duration: duration,
            cost: this.calculateCost(this.currentEnergy),
            realTimeData: this.realTimeData
        };
    }

    /**
     * Calcular costo de la carga
     * 
     * @param {number} energy - Energía entregada en kWh
     * @returns {number} Costo en $ (tarifa 0.15 $/kWh)
     */
    calculateCost(energy) {
        const ratePerKwh = 0.15; // Tarifa fija
        return energy * ratePerKwh;
    }
}

module.exports = EVChargingSimulator;