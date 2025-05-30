const mongoose = require('mongoose');

// Esquema para configuração de limites e uso de LLM por organização
const llmUsageSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    unique: true
  },
  settings: {
    // Configurações específicas para a organização
    customProviderSettings: {
      type: Boolean,
      default: false
    },
    preferredProviderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LLMProvider'
    },
    customModels: [{
      providerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LLMProvider'
      },
      modelId: {
        type: String,
        required: true
      }
    }],
    usageLimits: {
      hasLimit: {
        type: Boolean,
        default: true
      },
      monthlyTokenLimit: {
        type: Number,
        default: 1000000 // 1 milhão de tokens por mês
      },
      alertThreshold: {
        type: Number,
        default: 0.8 // Alerta quando atingir 80% do limite
      }
    }
  },
  usage: {
    currentMonth: {
      tokens: {
        type: Number,
        default: 0
      },
      requests: {
        type: Number,
        default: 0
      },
      cost: {
        type: Number,
        default: 0
      },
      lastUpdated: {
        type: Date,
        default: Date.now
      }
    },
    history: [{
      month: Number,
      year: Number,
      tokens: Number,
      requests: Number,
      cost: Number
    }]
  },
  alerts: [{
    type: {
      type: String,
      enum: ['threshold', 'limit_reached', 'fallback', 'error'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    acknowledged: {
      type: Boolean,
      default: false
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    acknowledgedAt: {
      type: Date
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware para atualizar o campo updatedAt antes de salvar
llmUsageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Método para registrar uso de tokens
llmUsageSchema.methods.recordUsage = async function(tokens, cost, providerId, modelId) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // Verifica se estamos no mesmo mês
  if (this.usage.currentMonth.lastUpdated) {
    const lastMonth = this.usage.currentMonth.lastUpdated.getMonth();
    const lastYear = this.usage.currentMonth.lastUpdated.getFullYear();
    
    // Se mudou o mês, arquiva os dados do mês anterior e reinicia
    if (lastMonth !== currentMonth || lastYear !== currentYear) {
      this.usage.history.push({
        month: lastMonth,
        year: lastYear,
        tokens: this.usage.currentMonth.tokens,
        requests: this.usage.currentMonth.requests,
        cost: this.usage.currentMonth.cost
      });
      
      // Reinicia contadores para o mês atual
      this.usage.currentMonth.tokens = 0;
      this.usage.currentMonth.requests = 0;
      this.usage.currentMonth.cost = 0;
    }
  }
  
  // Atualiza o uso atual
  this.usage.currentMonth.tokens += tokens;
  this.usage.currentMonth.requests += 1;
  this.usage.currentMonth.cost += cost;
  this.usage.currentMonth.lastUpdated = now;
  
  // Verifica se precisa gerar alertas
  if (this.settings.usageLimits.hasLimit) {
    const percentUsed = this.usage.currentMonth.tokens / this.settings.usageLimits.monthlyTokenLimit;
    
    // Alerta de threshold
    if (percentUsed >= this.settings.usageLimits.alertThreshold && percentUsed < 1.0) {
      // Verifica se já existe um alerta de threshold não reconhecido
      const existingAlert = this.alerts.find(a => 
        a.type === 'threshold' && 
        !a.acknowledged && 
        a.timestamp.getMonth() === currentMonth &&
        a.timestamp.getFullYear() === currentYear
      );
      
      if (!existingAlert) {
        this.alerts.push({
          type: 'threshold',
          message: `A organização atingiu ${Math.round(percentUsed * 100)}% do limite mensal de tokens.`,
          timestamp: now
        });
      }
    }
    
    // Alerta de limite atingido
    if (percentUsed >= 1.0) {
      // Verifica se já existe um alerta de limite não reconhecido
      const existingAlert = this.alerts.find(a => 
        a.type === 'limit_reached' && 
        !a.acknowledged && 
        a.timestamp.getMonth() === currentMonth &&
        a.timestamp.getFullYear() === currentYear
      );
      
      if (!existingAlert) {
        this.alerts.push({
          type: 'limit_reached',
          message: `A organização atingiu 100% do limite mensal de tokens.`,
          timestamp: now
        });
      }
    }
  }
  
  await this.save();
  
  return {
    currentUsage: this.usage.currentMonth,
    hasReachedLimit: this.settings.usageLimits.hasLimit && 
                    this.usage.currentMonth.tokens >= this.settings.usageLimits.monthlyTokenLimit
  };
};

// Método para reconhecer alertas
llmUsageSchema.methods.acknowledgeAlert = async function(alertId, userId) {
  const alert = this.alerts.id(alertId);
  
  if (!alert) {
    throw new Error('Alerta não encontrado');
  }
  
  alert.acknowledged = true;
  alert.acknowledgedBy = userId;
  alert.acknowledgedAt = new Date();
  
  await this.save();
  
  return alert;
};

// Método para registrar fallback
llmUsageSchema.methods.recordFallback = async function(fromProviderId, toProviderId, reason) {
  this.alerts.push({
    type: 'fallback',
    message: `Fallback de provedor LLM: ${reason}`,
    timestamp: new Date()
  });
  
  await this.save();
  
  return this.alerts[this.alerts.length - 1];
};

const LLMUsage = mongoose.model('LLMUsage', llmUsageSchema);

module.exports = LLMUsage;
