const mongoose = require('mongoose');

// Esquema de organização
const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  domain: {
    type: String,
    trim: true,
    lowercase: true,
  },
  logo: {
    type: String, // URL para o logo
  },
  theme: {
    primaryColor: {
      type: String,
      default: '#1976d2', // Azul padrão
    },
    secondaryColor: {
      type: String,
      default: '#dc004e', // Rosa padrão
    },
    darkMode: {
      type: Boolean,
      default: false,
    },
  },
  settings: {
    timezone: {
      type: String,
      default: 'UTC',
    },
    language: {
      type: String,
      default: 'pt-BR',
    },
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    whatsappNotifications: {
      type: Boolean,
      default: false,
    },
  },
  contactInfo: {
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    whatsapp: {
      type: String,
      trim: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      default: 'free',
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    paymentStatus: {
      type: String,
      enum: ['active', 'pending', 'failed', 'canceled'],
      default: 'active',
    },
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

// Middleware para atualizar o campo updatedAt antes de salvar
organizationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Organization = mongoose.model('Organization', organizationSchema);

module.exports = Organization;
