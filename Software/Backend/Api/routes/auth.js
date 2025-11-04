const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const router = express.Router();

/**
 * POST /api/auth/login
 * Endpoint de autenticación de usuarios
 * Valida credenciales y retorna token JWT junto con datos del usuario
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Intento de login para:', email);

    // PASO 1: Buscar usuario por email y popular relaciones
    const user = await User.findOne({ email }).populate('vehicles ownedStations');
    if (!user) {
      console.log('Usuario no encontrado');
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    console.log('Usuario encontrado:', user.email);
    console.log('Contraseña almacenada (hash):', user.password);

    // PASO 2: Verificar contraseña usando bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('¿Coincide la contraseña?', isMatch);

    if (!isMatch) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    // PASO 3: Crear token JWT con userId y rol
    // Token expira en 1 hora por seguridad
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'secreto',
      { expiresIn: '1h' }
    );

    // PASO 4: Preparar datos del usuario sin incluir la contraseña (seguridad)
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      vehicles: user.vehicles,
      ownedStations: user.ownedStations
    };

    res.json({
      token,
      user: userData
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/registerEvUser
 * Registro de nuevos usuarios con vehículo eléctrico
 * Permite asociar un vehículo existente o crear uno nuevo durante el registro
 */
router.post('/registerEvUser', async (req, res) => {
  try {
    const { name, email, password, vehicleId, vehicle } = req.body;

    // VALIDACIÓN 1: Campos obligatorios
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: nombre, email o contraseña.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    
    // VALIDACIÓN 2: Email único
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ error: 'Ya existe un usuario con ese correo.' });
    }

    // VALIDACIÓN 3: Política de contraseña segura
    // Mínimo 8 caracteres, mayúsculas, minúsculas, números y carácter especial
    const passwordPolicy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!passwordPolicy.test(password)) {
      return res.status(400).json({
        error: 'La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas, números y un carácter especial.'
      });
    }

    // PASO 1: Encriptar contraseña con bcrypt (salt de 10 rondas)
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    // PASO 2: Crear usuario base con rol 'ev_user'
    const user = new User({
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashed,
      role: 'ev_user'
    });

    // Guardar usuario primero para obtener su _id
    await user.save();

    // PASO 3: Asociar vehículo (dos métodos posibles)
    
    // Método A: Asociar vehículo existente por ID
    if (vehicleId) {
      try {
        const v = await Vehicle.findById(vehicleId);
        if (v) {
          if (!Array.isArray(user.vehicles)) user.vehicles = [];
          if (!user.vehicles.includes(v._id)) {
            user.vehicles.push(v._id);
            await user.save();
          }
        }
      } catch (err) {
        // Ignorar ID inválido, no bloquear registro
      }
    } 
    // Método B: Crear vehículo nuevo desde objeto
    else if (vehicle && typeof vehicle === 'object') {
      // Normalizar diferentes formatos de campos del frontend
      const vname = String(vehicle.name || '').trim();
      const vcap = Number(vehicle.batteryCapacity || vehicle.battery_capicity || vehicle.battery || 0);
      const vtypeRaw = vehicle.chargerType || vehicle.type || vehicle.otherType || vehicle.charger_type || '';
      const vtype = String(vtypeRaw).trim();
      const vCurrentCharge = Number(vehicle.currentChargeLevel ?? vehicle.current_charge_level ?? vehicle.currentCharge ?? 0);
      
      if (vname && vcap > 0 && vtype) {
        // Crear vehículo asociado al usuario
        const newVehicle = new Vehicle({
          userId: user._id,
          model: vname,
          chargerType: vtype,
          batteryCapacity: vcap,
          currentChargeLevel: isNaN(vCurrentCharge) ? 0 : Math.max(0, Math.min(100, vCurrentCharge))
        });
        try {
          await newVehicle.save();
          if (!Array.isArray(user.vehicles)) user.vehicles = [];
          user.vehicles.push(newVehicle._id);
          await user.save();
        } catch (err) {
          // Si falla crear vehículo, no revertir registro de usuario
          console.error('No se pudo crear vehículo manual durante registro:', err);
        }
      }
    }

    // PASO 4: Generar token JWT para login automático
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'secreto',
      { expiresIn: '1h' }
    );

    // PASO 5: Retornar usuario poblado (sin contraseña) y token
    const safeUser = await User.findById(user._id).populate('vehicles ownedStations').select('-password');
    return res.status(201).json({ token, user: safeUser });
  } catch (error) {
    console.error('Error en register:', error);
    return res.status(500).json({ error: error.message || 'Error interno' });
  }
});

/**
 * Middleware de autenticación mediante JWT
 * Verifica que el token sea válido y extrae información del usuario
 * Agrega req.user = { userId, role } para usar en rutas protegidas
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'secreto', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user; // { userId, role }
    next();
  });
};

/**
 * GET /api/auth/profile
 * Obtener perfil del usuario autenticado
 * Retorna información completa incluyendo vehículos y estaciones
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate('vehicles ownedStations')
      .select('-password'); // Excluir contraseña por seguridad
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/auth/profile
 * Actualizar perfil del usuario (nombre y/o contraseña)
 * Validaciones:
 * - Nombre no puede estar vacío
 * - Contraseña actual debe ser correcta
 * - Nueva contraseña debe cumplir política de seguridad
 */
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, currentPassword, newPassword, confirmNewPassword } = req.body;

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // PASO 1: Actualizar nombre si se proporciona
    if (typeof name === 'string') {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return res.status(400).json({ error: 'El nombre no puede estar vacío.' });
      }
      user.name = trimmedName;
    }

    // PASO 2: Cambiar contraseña si se solicita
    const wantsPasswordChange = Boolean(newPassword || confirmNewPassword || currentPassword);

    if (wantsPasswordChange) {
      // VALIDACIÓN 1: Todos los campos de contraseña son requeridos
      if (!currentPassword || !newPassword || !confirmNewPassword) {
        return res.status(400).json({ error: 'Debes proporcionar la contraseña actual y la nueva contraseña dos veces.' });
      }

      // VALIDACIÓN 2: Verificar contraseña actual
      const matches = await bcrypt.compare(currentPassword, user.password);
      if (!matches) {
        return res.status(400).json({ error: 'La contraseña actual no es correcta.' });
      }

      // VALIDACIÓN 3: Confirmación debe coincidir
      if (newPassword !== confirmNewPassword) {
        return res.status(400).json({ error: 'La nueva contraseña y su confirmación no coinciden.' });
      }

      // VALIDACIÓN 4: Política de contraseña segura
      const passwordPolicy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
      if (!passwordPolicy.test(newPassword)) {
        return res.status(400).json({
          error: 'La nueva contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas, números y un carácter especial.'
        });
      }

      // Encriptar nueva contraseña
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    // PASO 3: Guardar cambios
    await user.save();

    // PASO 4: Retornar usuario actualizado (sin contraseña)
    const safeUser = await User.findById(user._id)
      .populate('vehicles ownedStations')
      .select('-password');

    res.json({
      message: 'Perfil actualizado correctamente.',
      user: safeUser,
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = { router, authenticateToken };