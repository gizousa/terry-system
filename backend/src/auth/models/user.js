const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Esquema de usuário
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'user'],
    default: 'user',
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
  },
  mfaEnabled: {
    type: Boolean,
    default: false,
  },
  mfaSecret: {
    type: String,
  },
  timezone: {
    type: String,
    default: 'UTC',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Middleware para hash da senha antes de salvar
userSchema.pre('save', async function (next) {
  const user = this;
  
  // Só faz hash da senha se ela foi modificada ou é nova
  if (!user.isModified('password')) return next();
  
  try {
    // Gera um salt
    const salt = await bcrypt.genSalt(10);
    
    // Hash da senha com o salt
    const hash = await bcrypt.hash(user.password, salt);
    
    // Substitui a senha em texto plano pelo hash
    user.password = hash;
    next();
  } catch (error) {
    return next(error);
  }
});

// Método para comparar senha
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Método para gerar token JWT
userSchema.methods.generateAuthToken = function () {
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { 
      id: this._id,
      email: this.email,
      role: this.role,
      organizationId: this.organizationId 
    },
    process.env.JWT_SECRET || 'terry-secret-key',
    { expiresIn: '1h' }
  );
  return token;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
