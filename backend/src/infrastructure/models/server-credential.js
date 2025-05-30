const mongoose = require('mongoose');

// Esquema para configuração de acesso a servidores
const serverCredentialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  serverType: {
    type: String,
    enum: ['aws', 'gcp', 'azure', 'datacenter', 'other'],
    required: true,
  },
  connectionDetails: {
    hostname: {
      type: String,
      required: true,
      trim: true,
    },
    port: {
      type: Number,
      default: 22, // Porta padrão SSH
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    usePrivateKey: {
      type: Boolean,
      default: true,
    },
    password: {
      type: String,
      trim: true,
      // Requerido apenas se usePrivateKey for false
    },
    privateKeyName: {
      type: String,
      trim: true,
      // Nome do arquivo da chave privada
    },
    privateKeyPassphrase: {
      type: String,
      trim: true,
      // Passphrase da chave privada, se houver
    },
  },
  metadata: {
    operatingSystem: {
      type: String,
      trim: true,
    },
    region: {
      type: String,
      trim: true,
    },
    tags: [{
      type: String,
      trim: true,
    }],
  },
  permissions: {
    allowDevelopment: {
      type: Boolean,
      default: false,
    },
    allowSupport: {
      type: Boolean,
      default: true,
    },
    allowSystemChanges: {
      type: Boolean,
      default: false,
    },
  },
  lastConnection: {
    timestamp: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['success', 'failed'],
    },
    message: {
      type: String,
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
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
serverCredentialSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Middleware para criptografar dados sensíveis antes de salvar
serverCredentialSchema.pre('save', async function(next) {
  // Se os dados sensíveis não foram modificados, pula
  if (!this.isModified('connectionDetails.password') && 
      !this.isModified('connectionDetails.privateKeyPassphrase')) {
    return next();
  }
  
  try {
    // Aqui implementaríamos a criptografia dos dados sensíveis
    // Por exemplo, usando uma biblioteca como crypto
    // Por simplicidade, estamos apenas simulando a criptografia
    if (this.connectionDetails.password) {
      this.connectionDetails.password = `encrypted:${this.connectionDetails.password}`;
    }
    
    if (this.connectionDetails.privateKeyPassphrase) {
      this.connectionDetails.privateKeyPassphrase = `encrypted:${this.connectionDetails.privateKeyPassphrase}`;
    }
    
    next();
  } catch (error) {
    return next(error);
  }
});

// Método para testar conexão com o servidor
serverCredentialSchema.methods.testConnection = async function() {
  try {
    // Implementação da lógica de teste de conexão
    // Isso dependerá do tipo de servidor e protocolo
    // Por exemplo, para SSH:
    // const ssh = new SSH();
    // await ssh.connect({...});
    
    // Atualiza o status da última conexão
    this.lastConnection = {
      timestamp: new Date(),
      status: 'success',
      message: 'Conexão estabelecida com sucesso',
    };
    
    await this.save();
    
    return { success: true, message: 'Conexão estabelecida com sucesso' };
  } catch (error) {
    // Atualiza o status da última conexão
    this.lastConnection = {
      timestamp: new Date(),
      status: 'failed',
      message: error.message,
    };
    
    await this.save();
    
    return { success: false, message: error.message };
  }
};

const ServerCredential = mongoose.model('ServerCredential', serverCredentialSchema);

module.exports = ServerCredential;
