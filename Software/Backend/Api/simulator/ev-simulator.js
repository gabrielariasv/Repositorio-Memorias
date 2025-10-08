const mongoose = require('mongoose');
const Charger = require('../models/Charger');

class EVChargingSimulator {
    constructor(chargerId, vehicleId, powerOutput) {
        this.chargerId = chargerId;
        this.vehicleId = vehicleId;
        this.powerOutput = powerOutput;
        this.isCharging = false;
        this.startTime = null;
        this.currentEnergy = 0;
        this.intervalId = null;
        this.realTimeData = [];
        this.intervalDuration = 60000; // 1 minuto
    }

    async startCharging() {
        if (this.isCharging) return;
        
        this.isCharging = true;
        this.startTime = new Date();
        this.currentEnergy = 0;
        this.realTimeData = [];
        
        // Actualizar estado del cargador
        await this.updateChargerStatus('occupied');
        
        // Punto de datos inicial
        this.addDataPoint(0, 0);
        
        // Iniciar simulación
        this.intervalId = setInterval(() => {
            this.simulateChargingInterval();
        }, this.intervalDuration);
        
        console.log(`Carga iniciada para vehículo ${this.vehicleId} en cargador ${this.chargerId}`);
    }

    simulateChargingInterval() {
        // Calcular energía añadida en este intervalo
        const timeInHours = this.intervalDuration / (1000 * 60 * 60);
        const variation = 0.9 + (Math.random() * 0.2);
        const energyThisInterval = this.powerOutput * timeInHours * variation;
        
        this.currentEnergy += energyThisInterval;
        
        // Añadir punto de datos
        this.addDataPoint(this.powerOutput * variation, this.currentEnergy);
        
        // Verificar si la carga está completa (5-10 kWh como ejemplo)
        const targetEnergy = 5 + Math.random() * 5;
        if (this.currentEnergy >= targetEnergy) {
            this.completeCharging();
        }
    }

    addDataPoint(power, energy) {
        const dataPoint = {
            timestamp: new Date(),
            power: power,
            energy: energy,
            _id: new mongoose.Types.ObjectId()
        };
        
        this.realTimeData.push(dataPoint);
        console.log(`Datos en tiempo real: ${energy.toFixed(2)} kWh, ${power.toFixed(2)} kW`);
    }

    async completeCharging() {
        console.log(`Carga completada para vehículo ${this.vehicleId}`);
        await this.stopCharging();
    }

    async stopCharging() {
        if (!this.isCharging) return;
        
        this.isCharging = false;
        clearInterval(this.intervalId);
        await this.saveChargingHistory();
        await this.updateChargerStatus('available');
        
        console.log(`Carga detenida para vehículo ${this.vehicleId}`);
    }

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

    async saveChargingHistory() {
        const endTime = new Date();
        const duration = (endTime - this.startTime) / (1000 * 60); // minutos

        const chargingRecord = {
            startTime: this.startTime,
            endTime: endTime,
            duration: duration,
            energyDelivered: this.currentEnergy,
            vehicleId: this.vehicleId,
            sessionId: Date.now()
        };

        try {
            await Charger.findByIdAndUpdate(this.chargerId, {
                $push: { chargingHistory: chargingRecord }
            });
            
            console.log(`Historial de carga guardado: ${this.currentEnergy.toFixed(2)} kWh, ${duration.toFixed(2)} minutos`);
        } catch (error) {
            console.error('Error guardando historial de carga:', error);
        }
    }

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

    calculateCost(energy) {
        const ratePerKwh = 0.15;
        return energy * ratePerKwh;
    }
}

module.exports = EVChargingSimulator;