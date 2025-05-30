const mongoose = require('mongoose');

// Esquema para gerenciamento de prompts
const promptSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  content: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['development', 'support', 'infrastructure', 'general'],
    default: 'general',
  },
  tags: [{
    type: String,
    trim: true,
  }],
  version: {
    type: Number,
    default: 1,
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    // Null significa que é um prompt do sistema
  },
  isSystemPrompt: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  metrics: {
    usageCount: {
      type: Number,
      default: 0,
    },
    successRate: {
      type: Number,
      default: 0,
    },
    averageTokens: {
      type: Number,
      default: 0,
    },
    averageResponseTime: {
      type: Number,
      default: 0,
    },
  },
  history: [{
    version: Number,
    content: String,
    changedAt: Date,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    changeReason: String,
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
promptSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Middleware para gerenciar histórico de versões
promptSchema.pre('save', function(next) {
  // Se o conteúdo foi modificado e não é um novo documento
  if (this.isModified('content') && !this.isNew) {
    // Incrementa a versão
    this.version += 1;
    
    // Adiciona a versão anterior ao histórico
    const previousVersion = this._previousContent ? this._previousContent : this.content;
    
    this.history.push({
      version: this.version - 1,
      content: previousVersion,
      changedAt: new Date(),
      changedBy: this._changedBy,
      changeReason: this._changeReason || 'Atualização de conteúdo',
    });
  }
  next();
});

// Método para atualizar métricas de uso
promptSchema.methods.updateMetrics = function(success, tokens, responseTime) {
  // Incrementa contagem de uso
  this.metrics.usageCount += 1;
  
  // Atualiza taxa de sucesso
  const currentSuccessCount = this.metrics.successRate * (this.metrics.usageCount - 1);
  const newSuccessCount = currentSuccessCount + (success ? 1 : 0);
  this.metrics.successRate = newSuccessCount / this.metrics.usageCount;
  
  // Atualiza média de tokens
  const currentTotalTokens = this.metrics.averageTokens * (this.metrics.usageCount - 1);
  this.metrics.averageTokens = (currentTotalTokens + tokens) / this.metrics.usageCount;
  
  // Atualiza tempo médio de resposta
  const currentTotalTime = this.metrics.averageResponseTime * (this.metrics.usageCount - 1);
  this.metrics.averageResponseTime = (currentTotalTime + responseTime) / this.metrics.usageCount;
  
  return this.save();
};

// Método para criar uma nova versão
promptSchema.methods.createNewVersion = function(content, changedBy, changeReason) {
  this._previousContent = this.content;
  this.content = content;
  this._changedBy = changedBy;
  this._changeReason = changeReason;
  
  return this.save();
};

// Método para reverter para uma versão anterior
promptSchema.methods.revertToVersion = function(versionNumber) {
  const versionEntry = this.history.find(h => h.version === versionNumber);
  
  if (!versionEntry) {
    throw new Error(`Versão ${versionNumber} não encontrada`);
  }
  
  this._previousContent = this.content;
  this.content = versionEntry.content;
  this._changedBy = this._changedBy || this.createdBy;
  this._changeReason = `Revertido para versão ${versionNumber}`;
  
  return this.save();
};

const Prompt = mongoose.model('Prompt', promptSchema);

module.exports = Prompt;
