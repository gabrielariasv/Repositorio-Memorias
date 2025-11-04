/**
 * MÓDULO: Sistema de Recomendaciones Inteligentes de Cargadores
 * 
 * Proporciona algoritmos avanzados para recomendar cargadores basándose en:
 * - Modo "charge": Alcanzar un nivel de carga objetivo
 * - Modo "time": Maximizar carga en tiempo disponible
 * 
 * Considera múltiples factores:
 * - Distancia geográfica (búsqueda geoespacial 30km)
 * - Costo de energía
 * - Tiempo de carga requerido
 * - Tiempo de espera (demora por conflictos)
 * - Disponibilidad real (merge de intervalos ocupados)
 * 
 * Algoritmo de performance scoring con pesos configurables
 */
const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');
const Charger = require('../models/Charger');
const Vehicle = require('../models/Vehicle');
const calcularDistancia = require('../utils/calcularDistancia');

/**
 * FUNCIÓN HELPER: recommendByCharge
 * Recomendar cargadores para alcanzar un nivel de carga objetivo
 * 
 * @param {Object} q - Query parameters
 * @param {number} q.latitude - Latitud del usuario
 * @param {number} q.longitude - Longitud del usuario
 * @param {string} q.vehicleId - ID del vehículo
 * @param {number} q.currentChargeLevel - Nivel actual de batería (0-100%)
 * @param {number} q.targetChargeLevel - Nivel objetivo de batería (0-100%)
 * @param {number} q.distancia - Peso para distancia
 * @param {number} q.costo - Peso para costo
 * @param {number} q.tiempoCarga - Peso para tiempo de carga
 * @param {number} q.demora - Peso para tiempo de espera
 * 
 * @returns {Object} {best: charger, ranking: [chargers ordenados por performance]}
 * 
 * ALGORITMO:
 * 1. Búsqueda geoespacial (radio 30km)
 * 2. Cálculo de energía necesaria según capacidad de batería
 * 3. Para cada cargador:
 *    - Calcular distancia, costo, tiempo de carga
 *    - Merge de intervalos ocupados (reservas del cargador + reservas del vehículo)
 *    - Buscar primer gap disponible dentro de 2 días
 *    - Calcular tiempo de demora
 * 4. Performance scoring normalizado con pesos
 * 5. Ordenar por performance (menor = mejor)
 */
async function recommendByCharge(q) {
    const { latitude, longitude, vehicleId, distancia, costo, tiempoCarga, demora, currentChargeLevel, targetChargeLevel } = q;
    
    // VALIDACIÓN: Parámetros obligatorios
    if (!latitude || !longitude || !vehicleId || currentChargeLevel === undefined || targetChargeLevel === undefined) {
        throw { status: 400, message: 'Faltan parámetros obligatorios (latitude, longitude, vehicleId, currentChargeLevel, targetChargeLevel)' };
    }
    
    // VALIDACIÓN: Pesos configurables
    if (
        distancia === undefined || costo === undefined || tiempoCarga === undefined || demora === undefined ||
        isNaN(Number(distancia)) || isNaN(Number(costo)) || isNaN(Number(tiempoCarga)) || isNaN(Number(demora))
    ) {
        throw { status: 400, message: 'Faltan o son inválidos los parámetros de pesos (distancia, costo, tiempoCarga, demora)' };
    }

    // VALIDACIÓN: Niveles de carga válidos
    const target = Number(targetChargeLevel);
    const current = Number(currentChargeLevel);
    if (isNaN(target) || target < 0 || target > 100) {
        throw { status: 400, message: 'targetChargeLevel inválido (0-100)' };
    }
    if (isNaN(current) || current < 0 || current > 100) {
        throw { status: 400, message: 'currentChargeLevel inválido (0-100)' };
    }

    // PASO 1: Búsqueda geoespacial de cargadores cercanos (radio 30km)
    const MAX_DISTANCE_METERS = 30000;
    const userLat = parseFloat(latitude);
    const userLng = parseFloat(longitude);

    const chargers = await Charger.find({
        status: 'available',
        location: {
            $near: {
                $geometry: { type: 'Point', coordinates: [userLng, userLat] },
                $maxDistance: MAX_DISTANCE_METERS
            }
        }
    }).populate('reservations');

    // PASO 2: Obtener datos del vehículo y calcular energía necesaria
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) throw { status: 404, message: 'Vehículo no encontrado' };
    const batteryCapacity = vehicle.batteryCapacity;
    const chargeLevel = current;
    const targetLevel = target;
    const energyNeeded = batteryCapacity * ((targetLevel - chargeLevel) / 100);
    if (energyNeeded <= 0) {
        throw { status: 400, message: 'El nivel objetivo debe ser mayor al nivel actual' };
    }

    // PASO 3: Inicializar variables para normalización de factores
    let maxDist = 0, maxCost = 0, maxTime = 0, maxDemora = 0;
    const now = new Date();
    const results = [];
    const daysThreshold = 2 * 24 * 60 * 60 * 1000; // Ventana de 2 días para buscar disponibilidad
    
    // PASO 4: Obtener reservas del vehículo (para detectar conflictos)
    const vehicleReservations = await Reservation.find({
        vehicleId: vehicleId,
        status: { $in: ['upcoming', 'active'] },
        calculatedEndTime: { $gt: now }
    }, 'startTime calculatedEndTime').sort({ startTime: 1 });

    // PASO 5: Evaluar cada cargador
    for (const charger of chargers) {
        // PASO 5.1: Calcular distancia usando fórmula Haversine
        const dist = calcularDistancia(
            parseFloat(latitude),
            parseFloat(longitude),
            charger.location.coordinates[1],
            charger.location.coordinates[0]
        );
        
        // PASO 5.2: Calcular costo total de la carga
        const unitCost = charger.energy_cost || 1;
        const totalCost = unitCost * energyNeeded;
        
        // PASO 5.3: Calcular tiempo de carga necesario (minutos)
        const tCarga = charger.powerOutput ? (energyNeeded / charger.powerOutput) * 60 : null;
        if (!tCarga) continue; // Skip si no hay powerOutput

        let tDemora = null;

        // PASO 5.4: Obtener reservas del cargador
        const chargerReservations = await Reservation.find({
            chargerId: charger._id,
            status: { $in: ['upcoming', 'active'] },
            calculatedEndTime: { $gt: now }
        }, 'startTime calculatedEndTime').sort({ startTime: 1 });

        // PASO 5.5: MERGE DE INTERVALOS - Combinar reservas del cargador y del vehículo
        // Algoritmo: Crear lista de intervalos ocupados y fusionar solapamientos
        const intervals = [];
        const pushInterval = (r) => {
            const s = new Date(r.startTime);
            const e = new Date(r.calculatedEndTime);
            if (e <= now) return; // Ignorar intervalos pasados
            intervals.push({ start: s < now ? new Date(now) : s, end: e });
        };
        chargerReservations.forEach(pushInterval);
        vehicleReservations.forEach(pushInterval);

        // PASO 5.6: Ordenar intervalos por tiempo de inicio
        intervals.sort((a, b) => a.start - b.start);
        
        // PASO 5.7: Fusionar intervalos solapados (merge overlapping intervals)
        const merged = [];
        for (const iv of intervals) {
            if (!merged.length) {
                merged.push({ ...iv });
                continue;
            }
            const last = merged[merged.length - 1];
            // Si el nuevo intervalo se solapa con el último, extender el último
            if (iv.start <= last.end) {
                if (iv.end > last.end) last.end = iv.end;
            } else {
                // No hay solapamiento, agregar como nuevo intervalo
                merged.push({ ...iv });
            }
        }

        // PASO 5.8: BÚSQUEDA DE GAP - Encontrar primer hueco disponible suficientemente grande
        const tCargaMs = tCarga * 60 * 1000; // Convertir minutos a milisegundos
        const limit = new Date(now.getTime() + daysThreshold); // Límite de búsqueda (2 días)
        let gapStart = new Date(now);
        let found = false;

        if (merged.length === 0) {
            // CASO 1: No hay reservas, disponible inmediatamente
            if ((limit - gapStart) >= tCargaMs) {
                tDemora = 0;
                found = true;
            }
        } else {
            // CASO 2: Buscar gaps entre intervalos ocupados
            for (let i = 0; i <= merged.length; i++) {
                const gapEnd = merged[i] ? merged[i].start : limit;
                const gapDurationMs = gapEnd - gapStart;
                
                // Si el gap es suficientemente grande para la carga
                if (gapDurationMs >= tCargaMs) {
                    tDemora = (gapStart - now) / (60 * 1000); // Convertir ms a minutos
                    found = true;
                    break;
                }
                
                // Avanzar al siguiente gap
                if (merged[i]) {
                    gapStart = merged[i].end;
                    if (gapStart > limit) break; // Excede ventana de 2 días
                }
            }
        }

        // VALIDACIÓN: Descartar si no se encontró slot o si la demora excede 2 días
        if (!found || (tDemora !== null && tDemora > (daysThreshold / (60 * 1000)))) continue;

        // PASO 5.9: Actualizar valores máximos para normalización posterior
        maxDist = Math.max(maxDist, dist);
        maxCost = Math.max(maxCost, totalCost);
        maxTime = Math.max(maxTime, tCarga);
        maxDemora = Math.max(maxDemora, tDemora);

        // Agregar resultado con todos los factores calculados
        results.push({ charger, dist, cost: totalCost, unitCost, tCarga, tDemora });
    }

    // CASO ESPECIAL: No hay cargadores disponibles
    if (results.length === 0) return { best: null, ranking: [] };
    
    // PASO 6: PERFORMANCE SCORING - Calcular puntuación normalizada
    // Fórmula: Σ(peso_i / Σpesos) * (valor_i / max_i)
    // Menor puntuación = mejor opción
    const sumaPesos = Number(distancia) + Number(costo) + Number(tiempoCarga) + Number(demora);
    results.forEach(r => {
        r.performance =
            (Number(distancia) / sumaPesos) * (r.dist / (maxDist || 1)) +
            (Number(costo) / sumaPesos) * (r.cost / (maxCost || 1)) +
            (Number(tiempoCarga) / sumaPesos) * (r.tCarga / (maxTime || 1)) +
            (Number(demora) / sumaPesos) * (r.tDemora / (maxDemora || 1));
    });

    // PASO 7: Ordenar por performance (ascendente: mejor primero)
    results.sort((a, b) => a.performance - b.performance);
    return { best: results[0], ranking: results };
}

/**
 * FUNCIÓN HELPER: recommendByTime
 * Recomendar cargadores para maximizar carga en tiempo disponible
 * 
 * @param {Object} q - Query parameters
 * @param {number} q.latitude - Latitud del usuario
 * @param {number} q.longitude - Longitud del usuario
 * @param {string} q.vehicleId - ID del vehículo
 * @param {number} q.currentChargeLevel - Nivel actual de batería (0-100%)
 * @param {number} q.availableMinutes - Minutos disponibles para cargar
 * @param {number} [q.distancia=0.20] - Peso para distancia
 * @param {number} [q.costo=0.20] - Peso para costo
 * @param {number} [q.tiempoCarga=0.20] - Peso para ventana de tiempo
 * @param {number} [q.carga=0.20] - Peso para energía entregada (negativo = más es mejor)
 * @param {number} [q.demora=0.20] - Peso para tiempo de espera
 * 
 * @returns {Object} {best: charger, ranking: [chargers ordenados por performance]}
 * 
 * ALGORITMO:
 * 1. Búsqueda geoespacial (radio 30km)
 * 2. Para cada cargador:
 *    - Merge de intervalos ocupados
 *    - Buscar gap más grande dentro del tiempo disponible
 *    - Calcular energía que puede entregar en ese gap
 * 3. Performance scoring con energía como factor negativo (más energía = menor puntuación = mejor)
 * 4. Ordenar por performance
 */
async function recommendByTime(q) {
    const latitude = q.latitude;
    const longitude = q.longitude;
    const vehicleId = q.vehicleId;
    const currentChargeLevel = q.currentChargeLevel;
    const availableMinutes = q.tiempoDisponible ?? q.availableTime ?? q.availableMinutes ?? q.available; // aceptar variantes

    // VALIDACIÓN: Parámetros obligatorios
    if (!latitude || !longitude || !vehicleId || currentChargeLevel === undefined || availableMinutes === undefined) {
        throw { status: 400, message: 'Faltan parámetros obligatorios (latitude, longitude, vehicleId, currentChargeLevel, availableMinutes)' };
    }

    // PASO 1: Extraer y validar pesos (con valores por defecto)
    const weightDist = Number(q.distancia ?? 0.20);
    const weightCost = Number(q.costo ?? 0.20);
    const weightWindow = Number(q.tiempoCarga ?? 0.20);
    const weightCarga = Number(q.carga ?? q.chargeWeight ?? 0.20);
    const weightDemora = Number(q.demora ?? 0.20);
    
    // VALIDACIÓN: Pesos válidos
    if ([weightDist, weightCost, weightWindow, weightCarga, weightDemora].every(w => w === 0)) {
        throw { status: 400, message: 'Pesos inválidos' };
    }
    if ([weightDist, weightCost, weightWindow, weightCarga, weightDemora].some(w => isNaN(w) || w < 0)) {
        throw { status: 400, message: 'Pesos inválidos' };
    }

    // VALIDACIÓN: Parámetros numéricos
    const current = Number(currentChargeLevel);
    const availMin = Number(availableMinutes);
    if (isNaN(current) || isNaN(availMin)) {
        throw { status: 400, message: 'Parámetros numéricos inválidos' };
    }

    // PASO 2: Calcular límite de tiempo (cap de 7 días)
    const MAX_DISTANCE_METERS = 30000;
    const now = new Date();
    const capMs = 7 * 24 * 60 * 60 * 1000;
    console.log('Limit for available time calculation:', Math.min(availMin * 60 * 1000, capMs));
    const limit = new Date(now.getTime() + Math.min(availMin * 60 * 1000, capMs));
    // Tiempo total realmente disponible en ms (tope por lo que envio el frontend)
    const availableMs = limit.getTime() - now.getTime();

    // PASO 3: Búsqueda geoespacial de cargadores cercanos
    const userLat = parseFloat(latitude);
    const userLng = parseFloat(longitude);
    const chargers = await Charger.find({
        status: 'available',
        location: {
            $near: {
                $geometry: { type: 'Point', coordinates: [userLng, userLat] },
                $maxDistance: MAX_DISTANCE_METERS
            }
        }
    });

    // PASO 4: Obtener datos del vehículo
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) throw { status: 404, message: 'Vehículo no encontrado' };
    const batteryCapacity = vehicle.batteryCapacity;
    const energyNeeded = batteryCapacity * ((100 - current) / 100);

    // PASO 5: Obtener reservas del vehículo (para detectar conflictos)
    const vehicleReservations = await Reservation.find({
        vehicleId,
        status: { $in: ['upcoming', 'active'] },
        calculatedEndTime: { $gt: now }
    }, 'startTime calculatedEndTime').sort({ startTime: 1 });

    // PASO 6: Inicializar variables para normalización
    const results = [];
    let maxDist = 0, maxCost = 0, maxWindow = 0, maxEnergy = 0, maxDemora = 0;

    // PASO 7: Evaluar cada cargador
    for (const charger of chargers) {
        // PASO 7.1: Calcular distancia
        const dist = calcularDistancia(userLat, userLng, charger.location.coordinates[1], charger.location.coordinates[0]);
        const unitCost = charger.energy_cost || 1;
        
        // VALIDACIÓN: Verificar que el cargador tenga potencia
        if (charger.powerOutput <= 0) continue;
        
        // PASO 7.2: Calcular tiempo necesario para carga completa
        const time_needed_hours = ((100 - current) / 100) * (batteryCapacity / charger.powerOutput);
        const time_needed_minutes = time_needed_hours * 60;
        const time_needed_ms = time_needed_minutes * 60 * 1000;
        
        // PASO 7.3: Determinar ventana deseada (menor entre tiempo necesario y tiempo disponible)
        const desiredMs = Math.min(time_needed_ms, availableMs);

        // PASO 7.4: Obtener reservas del cargador
        const chargerReservations = await Reservation.find({
            chargerId: charger._id,
            status: { $in: ['upcoming', 'active'] },
            calculatedEndTime: { $gt: now }
        }, 'startTime calculatedEndTime').sort({ startTime: 1 });

        // PASO 7.5: MERGE DE INTERVALOS (igual que en recommendByCharge)
        const intervals = [];
        const pushInterval = (r) => {
            const s = new Date(r.startTime);
            const e = new Date(r.calculatedEndTime);
            if (e <= now) return;
            intervals.push({ start: s < now ? new Date(now) : s, end: e });
        };
        chargerReservations.forEach(pushInterval);
        vehicleReservations.forEach(pushInterval);
        intervals.sort((a, b) => a.start - b.start);
        
        // Fusionar intervalos solapados
        const merged = [];
        for (const iv of intervals) {
            if (!merged.length) { merged.push({ ...iv }); continue; }
            const lastInterval = merged[merged.length - 1];
            if (iv.start <= lastInterval.end) {
                if (iv.end > lastInterval.end) lastInterval.end = iv.end;
            } else merged.push({ ...iv });
        }

        // PASO 7.6: BÚSQUEDA DEL GAP MÁS GRANDE
        // Objetivo: Encontrar el intervalo libre más largo dentro del tiempo disponible
        let gapStart = new Date(now);
        let largestGapMs = 0;
        let largestGapStart = null;

        if (merged.length === 0) {
            // CASO 1: No hay reservas, todo el tiempo está disponible
            const totalMs = limit - gapStart;
            if (totalMs > 0) {
                // PASO 7.6.1: Limitar la ventana máxima al tiempo necesario pero no exceder lo disponible
                largestGapMs = Math.min(totalMs, desiredMs);
                largestGapStart = new Date(gapStart);
            }
        } else {
            // CASO 2: Hay reservas, buscar el gap más grande entre ellas
            for (let i = 0; i <= merged.length; i++) {
                const gapEnd = merged[i] ? merged[i].start : limit;
                const gapMs = gapEnd - gapStart;
                
                // PASO 7.6.2: Si el hueco es >= tiempo necesario, usarlo (limitado a desiredMs)
                if (gapMs >= desiredMs) {
                    largestGapMs = desiredMs;
                    largestGapStart = new Date(gapStart);
                    break; // Encontramos un gap perfecto, no seguir buscando
                }
                
                // PASO 7.6.3: Registrar el gap más grande encontrado hasta ahora
                if (gapMs > largestGapMs) { 
                    largestGapMs = gapMs; 
                    largestGapStart = new Date(gapStart); 
                }
                
                // Avanzar al siguiente gap
                if (merged[i]) gapStart = merged[i].end;
                if (gapStart > limit) break; // Excede límite de tiempo
            }
        }

        // VALIDACIÓN: Descartar si no hay gap disponible
        if (!largestGapStart || largestGapMs <= 0) continue;

        // PASO 7.7: Calcular métricas del cargador
        const windowMinutes = largestGapMs / (60 * 1000);
        const tDemora = Math.max(0, (largestGapStart.getTime() - now.getTime()) / (60 * 1000));
        const hoursAvailable = windowMinutes / 60;
        
        // PASO 7.8: Calcular energía que puede entregar en la ventana disponible
        const energyCapKwh = charger.powerOutput * hoursAvailable;
        const energyGiven = Math.min(energyNeeded, energyCapKwh); // No exceder lo necesario
        
        // VALIDACIÓN: Descartar si no puede entregar energía
        if (energyGiven <= 0) continue;

        // PASO 7.9: Calcular costo
        const cost = energyGiven * unitCost;

        // PASO 7.10: Actualizar valores máximos para normalización
        maxDist = Math.max(maxDist, dist);
        maxCost = Math.max(maxCost, cost);
        maxWindow = Math.max(maxWindow, windowMinutes);
        maxEnergy = Math.max(maxEnergy, energyGiven);
        maxDemora = Math.max(maxDemora, tDemora);

        // Agregar resultado con todas las métricas
        results.push({
            charger,
            dist,
            cost,
            unitCost,
            windowMinutes,
            energyGiven,
            tDemora
        });
    }

    // CASO ESPECIAL: No hay cargadores con gaps disponibles
    if (!results.length) return { best: null, ranking: [] };

    // PASO 8: PERFORMANCE SCORING - Con energía como factor negativo
    // Más energía = mejor, por lo tanto se resta en lugar de sumar
    const sumaPesos = (weightDist + weightCost + weightWindow + weightCarga + weightDemora) || 1;
    results.forEach(r => {
        const dNorm = (r.dist / (maxDist || 1));
        const cNorm = (r.cost / (maxCost || 1));
        const wNorm = (r.windowMinutes / (maxWindow || 1));
        const chNorm = (r.energyGiven / (maxEnergy || 1));
        const demNorm = (r.tDemora / (maxDemora || 1));
        
        // Fórmula: suma ponderada - energía (más energía reduce el score = mejor)
        r.performance =
            (weightDist / sumaPesos) * dNorm +
            (weightCost / sumaPesos) * cNorm +
            (weightWindow / sumaPesos) * wNorm +
            (weightDemora / sumaPesos) * demNorm -
            (weightCarga / sumaPesos) * chNorm; // NOTA: Resta energía (más energía = menor score = mejor)
    });

    // PASO 9: Ordenar por performance (ascendente: menor score = mejor)
    results.sort((a, b) => a.performance - b.performance);
    return { best: results[0], ranking: results };
}

/**
 * GET /api/recommendations/charge
 * Recomendar cargadores para alcanzar un nivel de carga objetivo
 * 
 * Query params:
 * - latitude, longitude: Ubicación del usuario
 * - vehicleId: ID del vehículo
 * - currentChargeLevel, targetChargeLevel: Niveles de batería (0-100)
 * - distancia, costo, tiempoCarga, demora: Pesos para scoring
 * 
 * Retorna: { best: charger, ranking: [chargers] }
 */
router.get('/charge', async (req, res) => {
    try {
        const data = await recommendByCharge(req.query);
        res.json(data);
    } catch (err) {
        const status = err && err.status ? err.status : 500;
        const message = err && err.message ? err.message : (err && err.error) || 'Error interno';
        res.status(status).json({ error: message });
    }
});

/**
 * GET /api/recommendations/time
 * Recomendar cargadores para maximizar carga en tiempo disponible
 * 
 * Query params:
 * - latitude, longitude: Ubicación del usuario
 * - vehicleId: ID del vehículo
 * - currentChargeLevel: Nivel actual de batería (0-100)
 * - availableMinutes: Tiempo disponible para cargar
 * - distancia, costo, tiempoCarga, carga, demora: Pesos para scoring
 * 
 * Retorna: { best: charger, ranking: [chargers con energyGiven, windowMinutes] }
 */
router.get('/time', async (req, res) => {
    try {
        const data = await recommendByTime(req.query);
        res.json(data);
    } catch (err) {
        const status = err && err.status ? err.status : 500;
        const message = err && err.message ? err.message : (err && err.error) || 'Error interno';
        res.status(status).json({ error: message });
    }
});

/**
 * GET /api/recommendations/recommend?mode=charge|time
 * Endpoint unificado que delega a recommendByCharge o recommendByTime
 * según el parámetro mode
 * 
 * Query params:
 * - mode: "charge" o "time"
 * - [resto de parámetros según el modo elegido]
 * 
 * VALIDACIÓN: mode debe ser "charge" o "time"
 */
router.get('/recommend', async (req, res) => {
    try {
        const mode = (req.query.mode || 'charge').toString().toLowerCase();
        
        // PASO 1: Determinar modo de recomendación
        if (mode === 'charge') {
            const data = await recommendByCharge(req.query);
            return res.json(data);
        } else if (mode === 'time') {
            const data = await recommendByTime(req.query);
            return res.json(data);
        } else {
            // VALIDACIÓN: Modo inválido
            return res.status(400).json({ error: 'Modo inválido. Usa mode=charge o mode=time' });
        }
    } catch (err) {
        const status = err && err.status ? err.status : 500;
        const message = err && err.message ? err.message : (err && err.error) || 'Error interno';
        res.status(status).json({ error: message });
    }
});

module.exports = router;
