const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');
const Charger = require('../models/Charger');
const Vehicle = require('../models/Vehicle');
const calcularDistancia = require('../utils/calcularDistancia');

// Función reutilizable para recomendación por "charge"
async function recommendByCharge(q) {
    const { latitude, longitude, vehicleId, distancia, costo, tiempoCarga, demora, currentChargeLevel, targetChargeLevel } = q;
    if (!latitude || !longitude || !vehicleId || currentChargeLevel === undefined || targetChargeLevel === undefined) {
        throw { status: 400, message: 'Faltan parámetros obligatorios (latitude, longitude, vehicleId, currentChargeLevel, targetChargeLevel)' };
    }
    if (
        distancia === undefined || costo === undefined || tiempoCarga === undefined || demora === undefined ||
        isNaN(Number(distancia)) || isNaN(Number(costo)) || isNaN(Number(tiempoCarga)) || isNaN(Number(demora))
    ) {
        throw { status: 400, message: 'Faltan o son inválidos los parámetros de pesos (distancia, costo, tiempoCarga, demora)' };
    }

    const target = Number(targetChargeLevel);
    const current = Number(currentChargeLevel);
    if (isNaN(target) || target < 0 || target > 100) {
        throw { status: 400, message: 'targetChargeLevel inválido (0-100)' };
    }
    if (isNaN(current) || current < 0 || current > 100) {
        throw { status: 400, message: 'currentChargeLevel inválido (0-100)' };
    }

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

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) throw { status: 404, message: 'Vehículo no encontrado' };
    const batteryCapacity = vehicle.batteryCapacity;
    const chargeLevel = current;
    const targetLevel = target;
    const energyNeeded = batteryCapacity * ((targetLevel - chargeLevel) / 100);
    if (energyNeeded <= 0) {
        throw { status: 400, message: 'El nivel objetivo debe ser mayor al nivel actual' };
    }

    let maxDist = 0, maxCost = 0, maxTime = 0, maxDemora = 0;
    const now = new Date();
    const results = [];
    const daysThreshold = 2 * 24 * 60 * 60 * 1000;
    const vehicleReservations = await Reservation.find({
        vehicleId: vehicleId,
        status: { $in: ['upcoming', 'active'] },
        calculatedEndTime: { $gt: now }
    }, 'startTime calculatedEndTime').sort({ startTime: 1 });

    for (const charger of chargers) {
        const dist = calcularDistancia(
            parseFloat(latitude),
            parseFloat(longitude),
            charger.location.coordinates[1],
            charger.location.coordinates[0]
        );
        const unitCost = charger.energy_cost || 1;
        const totalCost = unitCost * energyNeeded;
        const tCarga = charger.powerOutput ? (energyNeeded / charger.powerOutput) * 60 : null;
        if (!tCarga) continue;

        let tDemora = null;

        const chargerReservations = await Reservation.find({
            chargerId: charger._id,
            status: { $in: ['upcoming', 'active'] },
            calculatedEndTime: { $gt: now }
        }, 'startTime calculatedEndTime').sort({ startTime: 1 });

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
        const merged = [];
        for (const iv of intervals) {
            if (!merged.length) {
                merged.push({ ...iv });
                continue;
            }
            const last = merged[merged.length - 1];
            if (iv.start <= last.end) {
                if (iv.end > last.end) last.end = iv.end;
            } else {
                merged.push({ ...iv });
            }
        }

        const tCargaMs = tCarga * 60 * 1000;
        const limit = new Date(now.getTime() + daysThreshold);
        let gapStart = new Date(now);
        let found = false;

        if (merged.length === 0) {
            if ((limit - gapStart) >= tCargaMs) {
                tDemora = 0;
                found = true;
            }
        } else {
            for (let i = 0; i <= merged.length; i++) {
                const gapEnd = merged[i] ? merged[i].start : limit;
                const gapDurationMs = gapEnd - gapStart;
                if (gapDurationMs >= tCargaMs) {
                    tDemora = (gapStart - now) / (60 * 1000);
                    found = true;
                    break;
                }
                if (merged[i]) {
                    gapStart = merged[i].end;
                    if (gapStart > limit) break;
                }
            }
        }

        if (!found || (tDemora !== null && tDemora > (daysThreshold / (60 * 1000)))) continue;

        maxDist = Math.max(maxDist, dist);
        maxCost = Math.max(maxCost, totalCost);
        maxTime = Math.max(maxTime, tCarga);
        maxDemora = Math.max(maxDemora, tDemora);

        results.push({ charger, dist, cost: totalCost, unitCost, tCarga, tDemora });
    }

    if (results.length === 0) return { best: null, ranking: [] };
    const sumaPesos = Number(distancia) + Number(costo) + Number(tiempoCarga) + Number(demora);
    results.forEach(r => {
        r.performance =
            (Number(distancia) / sumaPesos) * (r.dist / (maxDist || 1)) +
            (Number(costo) / sumaPesos) * (r.cost / (maxCost || 1)) +
            (Number(tiempoCarga) / sumaPesos) * (r.tCarga / (maxTime || 1)) +
            (Number(demora) / sumaPesos) * (r.tDemora / (maxDemora || 1));
    });

    results.sort((a, b) => a.performance - b.performance);
    return { best: results[0], ranking: results };
}

// Función reutilizable para recomendación por "time"
async function recommendByTime(q) {
    const latitude = q.latitude;
    const longitude = q.longitude;
    const vehicleId = q.vehicleId;
    const currentChargeLevel = q.currentChargeLevel;
    const availableMinutes = q.tiempoDisponible ?? q.availableTime ?? q.availableMinutes ?? q.available; // aceptar variantes

    if (!latitude || !longitude || !vehicleId || currentChargeLevel === undefined || availableMinutes === undefined) {
        throw { status: 400, message: 'Faltan parámetros obligatorios (latitude, longitude, vehicleId, currentChargeLevel, availableMinutes)' };
    }

    const weightDist = Number(q.distancia ?? 0.20);
    const weightCost = Number(q.costo ?? 0.20);
    const weightWindow = Number(q.tiempoCarga ?? 0.20);
    const weightCarga = Number(q.carga ?? q.chargeWeight ?? 0.20);
    const weightDemora = Number(q.demora ?? 0.20);
    if ([weightDist, weightCost, weightWindow, weightCarga, weightDemora].every(w => w === 0)) {
        throw { status: 400, message: 'Pesos inválidos' };
    }
    if ([weightDist, weightCost, weightWindow, weightCarga, weightDemora].some(w => isNaN(w) || w < 0)) {
        throw { status: 400, message: 'Pesos inválidos' };
    }

    const current = Number(currentChargeLevel);
    const availMin = Number(availableMinutes);
    if (isNaN(current) || isNaN(availMin)) {
        throw { status: 400, message: 'Parámetros numéricos inválidos' };
    }

    const MAX_DISTANCE_METERS = 30000;
    const now = new Date();
    const capMs = 7 * 24 * 60 * 60 * 1000;
    console.log('Limit for available time calculation:', Math.min(availMin * 60 * 1000, capMs));
    const limit = new Date(now.getTime() + Math.min(availMin * 60 * 1000, capMs));
    // Tiempo total realmente disponible en ms (tope por lo que envio el frontend)
    const availableMs = limit.getTime() - now.getTime();

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

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) throw { status: 404, message: 'Vehículo no encontrado' };
    const batteryCapacity = vehicle.batteryCapacity;
    const energyNeeded = batteryCapacity * ((100 - current) / 100);

    const vehicleReservations = await Reservation.find({
        vehicleId,
        status: { $in: ['upcoming', 'active'] },
        calculatedEndTime: { $gt: now }
    }, 'startTime calculatedEndTime').sort({ startTime: 1 });

    const results = [];
    let maxDist = 0, maxCost = 0, maxWindow = 0, maxEnergy = 0, maxDemora = 0;

    for (const charger of chargers) {
        const dist = calcularDistancia(userLat, userLng, charger.location.coordinates[1], charger.location.coordinates[0]);
        const unitCost = charger.energy_cost || 1;
        if (charger.powerOutput <= 0) continue;
        const time_needed_hours = ((100 - current) / 100) * (batteryCapacity / charger.powerOutput);
        const time_needed_minutes = time_needed_hours * 60;
        const time_needed_ms = time_needed_minutes * 60 * 1000;
        // No buscamos ventanas mayores que lo disponible; desired = min(tiempo necesario, tiempo disponible)
        const desiredMs = Math.min(time_needed_ms, availableMs);

        const chargerReservations = await Reservation.find({
            chargerId: charger._id,
            status: { $in: ['upcoming', 'active'] },
            calculatedEndTime: { $gt: now }
        }, 'startTime calculatedEndTime').sort({ startTime: 1 });

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
        const merged = [];
        for (const iv of intervals) {
            if (!merged.length) { merged.push({ ...iv }); continue; }
            const last = merged[merged.length - 1];
            if (iv.start <= last.end) {
                if (iv.end > last.end) last.end = iv.end;
            } else merged.push({ ...iv });
        }

        let gapStart = new Date(now);
        let largestGapMs = 0;
        let largestGapStart = null;

        if (merged.length === 0) {
            const totalMs = limit - gapStart;
            if (totalMs > 0) {
                // Limitar la ventana máxima al tiempo necesario pero no exceder lo disponible
                largestGapMs = Math.min(totalMs, desiredMs);
                largestGapStart = new Date(gapStart);
            }
        } else {
            for (let i = 0; i <= merged.length; i++) {
                const gapEnd = merged[i] ? merged[i].start : limit;
                const gapMs = gapEnd - gapStart;
                // Si el hueco es mayor o igual al tiempo necesario, lo usamos pero lo limitamos al tiempo necesario
                if (gapMs >= desiredMs) {
                    // Hay un hueco suficientemente grande; limitamos al desiredMs (no superar lo disponible)
                    largestGapMs = desiredMs;
                    largestGapStart = new Date(gapStart);
                    break;
                }
                if (gapMs > largestGapMs) { largestGapMs = gapMs; largestGapStart = new Date(gapStart); }
                if (merged[i]) gapStart = merged[i].end;
                if (gapStart > limit) break;
            }
        }

        if (!largestGapStart || largestGapMs <= 0) continue;

        const windowMinutes = largestGapMs / (60 * 1000);
        const tDemora = Math.max(0, (largestGapStart.getTime() - now.getTime()) / (60 * 1000));
        const hoursAvailable = windowMinutes / 60;
        const energyCapKwh = charger.powerOutput * hoursAvailable;
        const energyGiven = Math.min(energyNeeded, energyCapKwh);
        if (energyGiven <= 0) continue;

        const cost = energyGiven * unitCost;

        maxDist = Math.max(maxDist, dist);
        maxCost = Math.max(maxCost, cost);
        maxWindow = Math.max(maxWindow, windowMinutes);
        maxEnergy = Math.max(maxEnergy, energyGiven);
        maxDemora = Math.max(maxDemora, tDemora);

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

    if (!results.length) return { best: null, ranking: [] };

    const sumaPesos = (weightDist + weightCost + weightWindow + weightCarga + weightDemora) || 1;
    results.forEach(r => {
        const dNorm = (r.dist / (maxDist || 1));
        const cNorm = (r.cost / (maxCost || 1));
        const wNorm = (r.windowMinutes / (maxWindow || 1));
        const chNorm = (r.energyGiven / (maxEnergy || 1));
        const demNorm = (r.tDemora / (maxDemora || 1));
        r.performance =
            (weightDist / sumaPesos) * dNorm +
            (weightCost / sumaPesos) * cNorm +
            (weightWindow / sumaPesos) * wNorm +
            (weightDemora / sumaPesos) * demNorm -
            (weightCarga / sumaPesos) * chNorm;
    });

    results.sort((a, b) => a.performance - b.performance);
    return { best: results[0], ranking: results };
}

// Rutas existentes delegando en las funciones (compatibilidad)
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

// Nueva ruta única: /api/recommendations/recommend?mode=charge|time
router.get('/recommend', async (req, res) => {
    try {
        const mode = (req.query.mode || 'charge').toString().toLowerCase();
        if (mode === 'charge') {
            const data = await recommendByCharge(req.query);
            return res.json(data);
        } else if (mode === 'time') {
            const data = await recommendByTime(req.query);
            return res.json(data);
        } else {
            return res.status(400).json({ error: 'Modo inválido. Usa mode=charge o mode=time' });
        }
    } catch (err) {
        const status = err && err.status ? err.status : 500;
        const message = err && err.message ? err.message : (err && err.error) || 'Error interno';
        res.status(status).json({ error: message });
    }
});

module.exports = router;
