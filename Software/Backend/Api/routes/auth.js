const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Intento de login para:', email); // Debug

    // Buscar usuario por email
    const user = await User.findOne({ email }).populate('vehicles ownedStations');
    if (!user) {
      console.log('Usuario no encontrado'); // Debug
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    console.log('Usuario encontrado:', user.email); // Debug
    console.log('Contraseña almacenada (hash):', user.password); // Debug

    // Verificar contraseña
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('¿Coincide la contraseña?', isMatch); // Debug

    if (!isMatch) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    // Crear token JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'secreto',
      { expiresIn: '1h' }
    );

    // Devolver datos del usuario sin la contraseña
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

// Middleware para verificar token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'secreto', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Obtener perfil de usuario
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate('vehicles ownedStations')
      .select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, currentPassword, newPassword, confirmNewPassword } = req.body;

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (typeof name === 'string') {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return res.status(400).json({ error: 'El nombre no puede estar vacío.' });
      }
      user.name = trimmedName;
    }

    const wantsPasswordChange = Boolean(newPassword || confirmNewPassword || currentPassword);

    if (wantsPasswordChange) {
      if (!currentPassword || !newPassword || !confirmNewPassword) {
        return res.status(400).json({ error: 'Debes proporcionar la contraseña actual y la nueva contraseña dos veces.' });
      }

      const matches = await bcrypt.compare(currentPassword, user.password);
      if (!matches) {
        return res.status(400).json({ error: 'La contraseña actual no es correcta.' });
      }

      if (newPassword !== confirmNewPassword) {
        return res.status(400).json({ error: 'La nueva contraseña y su confirmación no coinciden.' });
      }

      const passwordPolicy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
      if (!passwordPolicy.test(newPassword)) {
        return res.status(400).json({
          error: 'La nueva contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas, números y un carácter especial.'
        });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    await user.save();

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