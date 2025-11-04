/**
 * CLASE: SimulatorController
 * Controlador para gestionar múltiples simulaciones de carga activas
 * 
 * Funcionalidades:
 * - Crear y gestionar instancias de EVChargingSimulator
 * - Iniciar/detener sesiones de simulación
 * - Tracking de sesiones activas por chargerId
 * - Consulta de estado en tiempo real
 * 
 * Estructura:
 * - activeSimulations: Map<chargerId, EVChargingSimulator>
 * - Cada cargador puede tener máximo 1 simulación activa
 */
const Charger = require('../models/Charger');
const EVChargingSimulator = require('./ev-simulator');

class SimulatorController {
    /**
     * Constructor
     * Inicializa el Map de simulaciones activas
     */
    constructor() {
        this.activeSimulations = new Map(); // Map: chargerId -> EVChargingSimulator
    }

    /**
     * Iniciar nueva sesión de simulación
     * 
     * @param {string} chargerId - ID del cargador
     * @param {string} vehicleId - ID del vehículo
     * @returns {Object} { success, message, powerOutput, chargerType }
     * 
     * PASO 1: Obtener datos del cargador desde DB
     * PASO 2: Crear instancia del simulador
     * PASO 3: Almacenar en Map de sesiones activas
     * PASO 4: Iniciar carga
     * PASO 5: Retornar confirmación con datos del cargador
     */
    async startNewSession(chargerId, vehicleId) {
        try {
            // PASO 1: Obtener cargador
            const charger = await Charger.findById(chargerId);
            if (!charger) throw new Error('Cargador no encontrado');

            // PASO 2: Crear instancia del simulador con parámetros del cargador
            const simulator = new EVChargingSimulator(
                chargerId, 
                vehicleId, 
                charger.powerOutput // Potencia nominal en kW
            );
            
            // PASO 3: Almacenar referencia (un cargador puede tener solo 1 sesión activa)
            this.activeSimulations.set(chargerId, simulator);
            
            // PASO 4: Iniciar carga (asíncrono - actualiza DB)
            await simulator.startCharging();
            
            // PASO 5: Retornar éxito con info del cargador
            return { 
                success: true, 
                message: 'Simulación iniciada',
                powerOutput: charger.powerOutput,
                chargerType: charger.chargerType
            };
        } catch (error) {
            console.error('Error iniciando simulación:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Detener sesión de simulación
     * 
     * @param {string} chargerId - ID del cargador
     * @returns {Object} { success, message, sessionData }
     * 
     * PASO 1: Buscar simulador activo
     * PASO 2: Detener carga (guarda historial)
     * PASO 3: Obtener datos de la sesión
     * PASO 4: Eliminar de Map de sesiones activas
     * PASO 5: Retornar datos completos de la sesión
     */
    async stopSession(chargerId) {
        // PASO 1: Buscar simulador
        const simulator = this.activeSimulations.get(chargerId);
        
        if (simulator) {
            // PASO 2: Detener carga (asíncrono - actualiza DB)
            await simulator.stopCharging();
            
            // PASO 3: Obtener datos antes de eliminar
            const sessionData = simulator.getSessionData();
            
            // PASO 4: Limpiar referencia
            this.activeSimulations.delete(chargerId);
            
            // PASO 5: Retornar datos de sesión finalizada
            return { 
                success: true, 
                message: 'Simulación detenida',
                sessionData: sessionData
            };
        }
        
        // VALIDACIÓN: No hay sesión activa
        return { success: false, error: 'No se encontró sesión activa' };
    }

    /**
     * Forzar detención de sesión sin esperar (síncrono)
     * Útil para emergencias o limpieza
     * 
     * @param {string} chargerId - ID del cargador
     * @returns {Object} { success, message }
     * 
     * NOTA: No espera a que se guarde el historial
     */
    forceStopSession(chargerId) {
        const simulator = this.activeSimulations.get(chargerId);
        if (simulator) {
            // Detener sin await (puede no guardar historial completo)
            simulator.stopCharging();
            this.activeSimulations.delete(chargerId);
            return { success: true, message: 'Carga forzada a detener' };
        }
        return { success: false, error: 'No se encontró sesión activa' };
    }

    /**
     * Obtener lista de todas las sesiones activas
     * 
     * @returns {Array} Array de objetos con datos de cada sesión
     * 
     * PASO 1: Convertir Map a Array de entries
     * PASO 2: Mapear cada entry a objeto con datos relevantes
     * PASO 3: Calcular duración en tiempo real
     */
    getActiveSessions() {
        return Array.from(this.activeSimulations.entries()).map(([chargerId, simulator]) => ({
            chargerId,
            vehicleId: simulator.vehicleId,
            energyDelivered: simulator.currentEnergy,
            startTime: simulator.startTime,
            duration: ((new Date() - simulator.startTime) / (1000 * 60)).toFixed(2) // Minutos
        }));
    }

    /**
     * Obtener estado de una sesión específica
     * 
     * @param {string} chargerId - ID del cargador
     * @returns {Object|null} Estado de la sesión o null si no existe
     * 
     * PASO 1: Buscar simulador
     * PASO 2: Retornar datos en tiempo real
     * PASO 3: Incluir últimos 5 puntos de datos (para gráficas)
     */
    getSessionStatus(chargerId) {
        // PASO 1: Buscar simulador
        const simulator = this.activeSimulations.get(chargerId);
        if (!simulator) return null;
        
        // PASO 2-3: Retornar estado con últimos puntos de datos
        return {
            isCharging: simulator.isCharging,
            currentEnergy: simulator.currentEnergy,
            startTime: simulator.startTime,
            duration: ((new Date() - simulator.startTime) / (1000 * 60)).toFixed(2), // Minutos
            realTimeData: simulator.realTimeData.slice(-5) // Últimos 5 puntos para gráfica
        };
    }
}

module.exports = SimulatorController;