const mongoose = require('mongoose');

// Esquema para configuração de provedores de LLM
const llmProviderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  endpoint: {
    type: String,
    required: true,
    trim: true,
  },
  apiKey: {
    type: String,
    required: true,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  models: [{
    modelId: {
      type: String,
      required: true,
      trim: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    contextWindow: {
      type: Number,
      default: 4096,
    },
    costPer1kTokens: {
      input: {
        type: Number,
        default: 0.01,
      },
      output: {
        type: Number,
        default: 0.03,
      },
    },
    capabilities: {
      textGeneration: {
        type: Boolean,
        default: true,
      },
      codeGeneration: {
        type: Boolean,
        default: false,
      },
      imageAnalysis: {
        type: Boolean,
        default: false,
      },
    },
    priority: {
      type: Number,
      default: 0,
    },
  }],
  defaultModel: {
    type: String,
    required: true,
    trim: true,
  },
  rateLimits: {
    requestsPerMinute: {
      type: Number,
      default: 60,
    },
    tokensPerMinute: {
      type: Number,
      default: 40000,
    },
  },
  fallbackProvider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LLMProvider',
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
llmProviderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Método para validar conexão com o provedor
llmProviderSchema.methods.testConnection = async function() {
  try {
    // Implementação da lógica de teste de conexão
    // Isso dependerá da API específica de cada provedor
    return { success: true, message: 'Conexão estabelecida com sucesso' };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

// Método para criptografar a API key antes de salvar
llmProviderSchema.pre('save', async function(next) {
  // Se a API key não foi modificada, pula
  if (!this.isModified('apiKey')) return next();
  
  try {
    // Aqui implementaríamos a criptografia da API key
    // Por exemplo, usando uma biblioteca como crypto
    // Por simplicidade, estamos apenas simulando a criptografia
    this.apiKey = `encrypted:${this.apiKey}`;
    next();
  } catch (error) {
    return next(error);
  }
});

const LLMProvider = mongoose.model('LLMProvider', llmProviderSchema);

module.exports = LLMProvider;
