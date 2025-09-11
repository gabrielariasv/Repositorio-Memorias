const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');

// Obtener reservas futuras (actuales) de un vehículo
router.get('/actual/:vehicleId', async (req, res) => {
	try {
		const now = new Date();
		const reservations = await Reservation.find({
			vehicleId: req.params.vehicleId,
			endTime: { $gt: now }
		})
			.populate('chargerId', 'name location')
			.sort({ startTime: 1 });
		res.json(reservations);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

module.exports = router;
