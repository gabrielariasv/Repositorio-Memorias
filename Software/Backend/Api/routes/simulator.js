const express = require('express');
const router = express.Router();
const SimulatorController = require('../simulator/simulator-controller');

const simulatorController = new SimulatorController();

/**
 * POST /api/simulator/start
 * Iniciar una nueva sesión de carga simulada
 * Simula el proceso de carga de un vehículo eléctrico
 */
router.post('/start', async (req, res) => {
    try {
        const { chargerId, vehicleId } = req.body;
        
        // VALIDACIÓN: Verificar parámetros requeridos
        if (!chargerId || !vehicleId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Se requieren chargerId y vehicleId' 
            });
        }

        // PASO 1: Iniciar sesión de carga simulada
        const result = await simulatorController.startNewSession(chargerId, vehicleId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/simulator/stop
 * Detener una sesión de carga activa normalmente
 * Finaliza la simulación y calcula estadísticas finales
 */
router.post('/stop', async (req, res) => {
    try {
        const { chargerId } = req.body;
        
        // VALIDACIÓN: Verificar parámetro requerido
        if (!chargerId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Se requiere chargerId' 
            });
        }

        // PASO 1: Detener sesión de forma controlada
        const result = await simulatorController.stopSession(chargerId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/simulator/force-stop
 * Forzar detención inmediata de una sesión
 * Detiene la simulación sin guardar progreso adicional
 */
router.post('/force-stop', (req, res) => {
    try {
        const { chargerId } = req.body;
        
        // VALIDACIÓN: Verificar parámetro requerido
        if (!chargerId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Se requiere chargerId' 
            });
        }

        // PASO 1: Forzar detención inmediata de la sesión
        const result = simulatorController.forceStopSession(chargerId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/simulator/active
 * Obtener lista de todas las sesiones de carga activas
 * Útil para monitoreo en tiempo real del sistema
 */
router.get('/active', (req, res) => {
    try {
        // PASO 1: Obtener sesiones activas del controlador
        const activeSessions = simulatorController.getActiveSessions();
        res.json({ success: true, activeSessions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/simulator/status/:chargerId
 * Obtener estado actual de una sesión específica
 * Retorna progreso, energía entregada, tiempo restante, etc.
 */
router.get('/status/:chargerId', (req, res) => {
    try {
        const { chargerId } = req.params;
        
        // PASO 1: Consultar estado de la sesión del cargador
        const status = simulatorController.getSessionStatus(chargerId);
        
        if (!status) {
            return res.status(404).json({ 
                success: false, 
                error: 'No se encontró sesión activa para este cargador' 
            });
        }
        
        res.json({ success: true, status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;