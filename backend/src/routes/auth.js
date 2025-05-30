const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../auth/models/user');
const { validateRegistration, validateLogin } = require('../utils/validators');

// Middleware para validação de dados
const validate = (validator) => {
  return (req, res, next) => {
    const { error } = validator(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    next();
  };
};

// Rota para registro de usuário
router.post('/register', validate(validateRegistration), async (req, res) => {
  try {
    const { email, password, name, organizationId, role } = req.body;

    // Verifica se o usuário já existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Usuário já existe' });
    }

    // Cria um novo usuário
    const user = new User({
      email,
      password,
      name,
      organizationId,
      role: role || 'user', // Default para 'user' se não especificado
    });

    // Salva o usuário no banco de dados
    await user.save();

    // Gera token JWT
    const token = user.generateAuthToken();

    // Retorna o token e informações do usuário
    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
      },
    });
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    res.status(500).json({ error: 'Erro ao registrar usuário' });
  }
});

// Rota para login
router.post('/login', validate(validateLogin), (req, res, next) => {
  passport.authenticate('local', { session: false }, async (err, user, info) => {
    try {
      if (err) {
        return next(err);
      }
      
      if (!user) {
        return res.status(401).json({ error: info.message || 'Credenciais inválidas' });
      }

      // Atualiza o último login
      user.lastLogin = Date.now();
      await user.save();

      // Gera token JWT
      const token = user.generateAuthToken();

      // Retorna o token e informações do usuário
      return res.json({
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
        },
      });
    } catch (error) {
      return next(error);
    }
  })(req, res, next);
});

// Rota para verificar token
router.get('/verify', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      organizationId: req.user.organizationId,
    },
  });
});

// Rota para logout (apenas invalida o token no cliente)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logout realizado com sucesso' });
});

// Rota para atualizar senha
router.put('/password', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Verifica se a senha atual está correta
    const isMatch = await req.user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Senha atual incorreta' });
    }

    // Atualiza a senha
    req.user.password = newPassword;
    await req.user.save();

    res.json({ message: 'Senha atualizada com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar senha:', error);
    res.status(500).json({ error: 'Erro ao atualizar senha' });
  }
});

module.exports = router;
