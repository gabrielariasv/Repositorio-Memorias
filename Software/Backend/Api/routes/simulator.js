const express = require('express');
const router = express.Router();
const SimulatorController = require('../simulator/simulator-controller');

const simulatorController = new SimulatorController();

// Confirmar e iniciar carga
router.post('/start', async (req, res) => {
    try {
        const { chargerId, vehicleId } = req.body;
        
        if (!chargerId || !vehicleId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Se requieren chargerId y vehicleId' 
            });
        }

        const result = await simulatorController.startNewSession(chargerId, vehicleId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Detener carga normalmente
router.post('/stop', async (req, res) => {
    try {
        const { chargerId } = req.body;
        
        if (!chargerId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Se requiere chargerId' 
            });
        }

        const result = await simulatorController.stopSession(chargerId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Forzar detención de carga
router.post('/force-stop', (req, res) => {
    try {
        const { chargerId } = req.body;
        
        if (!chargerId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Se requiere chargerId' 
            });
        }

        const result = simulatorController.forceStopSession(chargerId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener sesiones activas
router.get('/active', (req, res) => {
    try {
        const activeSessions = simulatorController.getActiveSessions();
        res.json({ success: true, activeSessions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener estado de una sesión específica
router.get('/status/:chargerId', (req, res) => {
    try {
        const { chargerId } = req.params;
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