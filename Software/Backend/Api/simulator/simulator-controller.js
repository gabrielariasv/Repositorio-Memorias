const Charger = require('../models/Charger');
const EVChargingSimulator = require('./ev-simulator');

class SimulatorController {
    constructor() {
        this.activeSimulations = new Map();
    }

    async startNewSession(chargerId, vehicleId) {
        try {
            // Obtener datos del cargador
            const charger = await Charger.findById(chargerId);
            if (!charger) throw new Error('Cargador no encontrado');

            // Crear instancia del simulador
            const simulator = new EVChargingSimulator(
                chargerId, 
                vehicleId, 
                charger.powerOutput
            );
            
            // Almacenar referencia
            this.activeSimulations.set(chargerId, simulator);
            
            // Iniciar carga
            await simulator.startCharging();
            
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

    async stopSession(chargerId) {
        const simulator = this.activeSimulations.get(chargerId);
        if (simulator) {
            await simulator.stopCharging();
            this.activeSimulations.delete(chargerId);
            
            const sessionData = simulator.getSessionData();
            return { 
                success: true, 
                message: 'Simulación detenida',
                sessionData: sessionData
            };
        }
        return { success: false, error: 'No se encontró sesión activa' };
    }

    forceStopSession(chargerId) {
        const simulator = this.activeSimulations.get(chargerId);
        if (simulator) {
            simulator.stopCharging();
            this.activeSimulations.delete(chargerId);
            return { success: true, message: 'Carga forzada a detener' };
        }
        return { success: false, error: 'No se encontró sesión activa' };
    }

    getActiveSessions() {
        return Array.from(this.activeSimulations.entries()).map(([chargerId, simulator]) => ({
            chargerId,
            vehicleId: simulator.vehicleId,
            energyDelivered: simulator.currentEnergy,
            startTime: simulator.startTime,
            duration: ((new Date() - simulator.startTime) / (1000 * 60)).toFixed(2)
        }));
    }

    getSessionStatus(chargerId) {
        const simulator = this.activeSimulations.get(chargerId);
        if (!simulator) return null;
        
        return {
            isCharging: simulator.isCharging,
            currentEnergy: simulator.currentEnergy,
            startTime: simulator.startTime,
            duration: ((new Date() - simulator.startTime) / (1000 * 60)).toFixed(2),
            realTimeData: simulator.realTimeData.slice(-5) // Últimos 5 puntos
        };
    }
}

module.exports = SimulatorController;