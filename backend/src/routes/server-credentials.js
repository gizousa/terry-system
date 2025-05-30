const express = require('express');
const router = express.Router();
const passport = require('passport');
const ServerCredential = require('../infrastructure/models/server-credential');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Middleware de autenticação
const authenticate = passport.authenticate('jwt', { session: false });

// Middleware de autorização para Admin ou Super Admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Acesso negado. Permissão de Admin necessária.' });
  }
  next();
};

// Diretório para armazenar chaves privadas
const KEYS_DIR = path.join(__dirname, '..', '..', 'data', 'keys');

// Garantir que o diretório de chaves exista
if (!fs.existsSync(KEYS_DIR)) {
  fs.mkdirSync(KEYS_DIR, { recursive: true });
}

// Listar credenciais de servidor para uma organização
router.get('/', authenticate, async (req, res) => {
  try {
    const query = { organizationId: req.user.organizationId };
    
    // Super Admin pode ver todas as credenciais se fornecer organizationId
    if (req.user.role === 'super_admin' && req.query.organizationId) {
      query.organizationId = req.query.organizationId;
    }
    
    const credentials = await ServerCredential.find(query)
      .select('-connectionDetails.password -connectionDetails.privateKeyPassphrase');
    
    res.json(credentials);
  } catch (error) {
    console.error('Erro ao listar credenciais de servidor:', error);
    res.status(500).json({ error: 'Erro ao listar credenciais de servidor' });
  }
});

// Obter uma credencial específica
router.get('/:id', authenticate, async (req, res) => {
  try {
    const credential = await ServerCredential.findById(req.params.id)
      .select('-connectionDetails.password -connectionDetails.privateKeyPassphrase');
    
    if (!credential) {
      return res.status(404).json({ error: 'Credencial não encontrada' });
    }
    
    // Verifica permissão: apenas usuários da mesma organização ou Super Admin
    if (req.user.role !== 'super_admin' && 
        credential.organizationId.toString() !== req.user.organizationId.toString()) {
      return res.status(403).json({ error: 'Acesso negado a esta credencial' });
    }
    
    res.json(credential);
  } catch (error) {
    console.error('Erro ao obter credencial de servidor:', error);
    res.status(500).json({ error: 'Erro ao obter credencial de servidor' });
  }
});

// Criar nova credencial
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { 
      name, 
      description, 
      serverType, 
      connectionDetails,
      metadata,
      permissions
    } = req.body;
    
    // Determina a organizationId com base no usuário
    const organizationId = req.user.role === 'super_admin' && req.body.organizationId
      ? req.body.organizationId
      : req.user.organizationId;
    
    // Cria a credencial
    const credential = new ServerCredential({
      name,
      description,
      organizationId,
      serverType,
      connectionDetails,
      metadata,
      permissions,
      createdBy: req.user._id
    });
    
    await credential.save();
    
    res.status(201).json({
      id: credential._id,
      name: credential.name,
      description: credential.description,
      serverType: credential.serverType,
      connectionDetails: {
        hostname: credential.connectionDetails.hostname,
        port: credential.connectionDetails.port,
        username: credential.connectionDetails.username,
        usePrivateKey: credential.connectionDetails.usePrivateKey,
        privateKeyName: credential.connectionDetails.privateKeyName
      },
      metadata: credential.metadata,
      permissions: credential.permissions,
      isActive: credential.isActive
    });
  } catch (error) {
    console.error('Erro ao criar credencial de servidor:', error);
    res.status(500).json({ error: 'Erro ao criar credencial de servidor' });
  }
});

// Atualizar credencial existente
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { 
      name, 
      description, 
      serverType, 
      connectionDetails,
      metadata,
      permissions,
      isActive
    } = req.body;
    
    const credential = await ServerCredential.findById(req.params.id);
    
    if (!credential) {
      return res.status(404).json({ error: 'Credencial não encontrada' });
    }
    
    // Verifica permissão: apenas usuários da mesma organização ou Super Admin
    if (req.user.role !== 'super_admin' && 
        credential.organizationId.toString() !== req.user.organizationId.toString()) {
      return res.status(403).json({ error: 'Acesso negado para editar esta credencial' });
    }
    
    // Atualiza apenas os campos fornecidos
    if (name) credential.name = name;
    if (description !== undefined) credential.description = description;
    if (serverType) credential.serverType = serverType;
    if (connectionDetails) {
      // Atualiza apenas os campos fornecidos em connectionDetails
      if (connectionDetails.hostname) credential.connectionDetails.hostname = connectionDetails.hostname;
      if (connectionDetails.port) credential.connectionDetails.port = connectionDetails.port;
      if (connectionDetails.username) credential.connectionDetails.username = connectionDetails.username;
      if (connectionDetails.usePrivateKey !== undefined) credential.connectionDetails.usePrivateKey = connectionDetails.usePrivateKey;
      if (connectionDetails.password) credential.connectionDetails.password = connectionDetails.password;
      if (connectionDetails.privateKeyName) credential.connectionDetails.privateKeyName = connectionDetails.privateKeyName;
      if (connectionDetails.privateKeyPassphrase) credential.connectionDetails.privateKeyPassphrase = connectionDetails.privateKeyPassphrase;
    }
    if (metadata) credential.metadata = { ...credential.metadata, ...metadata };
    if (permissions) credential.permissions = { ...credential.permissions, ...permissions };
    if (isActive !== undefined) credential.isActive = isActive;
    
    await credential.save();
    
    res.json({
      id: credential._id,
      name: credential.name,
      description: credential.description,
      serverType: credential.serverType,
      connectionDetails: {
        hostname: credential.connectionDetails.hostname,
        port: credential.connectionDetails.port,
        username: credential.connectionDetails.username,
        usePrivateKey: credential.connectionDetails.usePrivateKey,
        privateKeyName: credential.connectionDetails.privateKeyName
      },
      metadata: credential.metadata,
      permissions: credential.permissions,
      isActive: credential.isActive
    });
  } catch (error) {
    console.error('Erro ao atualizar credencial de servidor:', error);
    res.status(500).json({ error: 'Erro ao atualizar credencial de servidor' });
  }
});

// Excluir credencial
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const credential = await ServerCredential.findById(req.params.id);
    
    if (!credential) {
      return res.status(404).json({ error: 'Credencial não encontrada' });
    }
    
    // Verifica permissão: apenas usuários da mesma organização ou Super Admin
    if (req.user.role !== 'super_admin' && 
        credential.organizationId.toString() !== req.user.organizationId.toString()) {
      return res.status(403).json({ error: 'Acesso negado para excluir esta credencial' });
    }
    
    // Se houver uma chave privada associada, exclui o arquivo
    if (credential.connectionDetails.usePrivateKey && credential.connectionDetails.privateKeyName) {
      const keyPath = path.join(KEYS_DIR, credential.connectionDetails.privateKeyName);
      if (fs.existsSync(keyPath)) {
        fs.unlinkSync(keyPath);
      }
    }
    
    await credential.deleteOne();
    
    res.json({ message: 'Credencial excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir credencial de servidor:', error);
    res.status(500).json({ error: 'Erro ao excluir credencial de servidor' });
  }
});

// Upload de chave privada
router.post('/:id/upload-key', authenticate, requireAdmin, async (req, res) => {
  try {
    const credential = await ServerCredential.findById(req.params.id);
    
    if (!credential) {
      return res.status(404).json({ error: 'Credencial não encontrada' });
    }
    
    // Verifica permissão: apenas usuários da mesma organização ou Super Admin
    if (req.user.role !== 'super_admin' && 
        credential.organizationId.toString() !== req.user.organizationId.toString()) {
      return res.status(403).json({ error: 'Acesso negado para esta credencial' });
    }
    
    // Verifica se há dados de chave no corpo da requisição
    if (!req.body.keyData) {
      return res.status(400).json({ error: 'Dados da chave privada não fornecidos' });
    }
    
    // Gera um nome único para a chave
    const keyName = `${credential._id}_${Date.now()}.pem`;
    const keyPath = path.join(KEYS_DIR, keyName);
    
    // Salva a chave no sistema de arquivos
    fs.writeFileSync(keyPath, req.body.keyData);
    
    // Ajusta permissões do arquivo para 600 (apenas leitura e escrita para o proprietário)
    fs.chmodSync(keyPath, 0o600);
    
    // Atualiza a credencial com o nome da chave
    credential.connectionDetails.privateKeyName = keyName;
    credential.connectionDetails.usePrivateKey = true;
    
    // Se uma passphrase for fornecida, salva-a
    if (req.body.passphrase) {
      credential.connectionDetails.privateKeyPassphrase = req.body.passphrase;
    }
    
    await credential.save();
    
    res.json({
      message: 'Chave privada enviada com sucesso',
      privateKeyName: keyName
    });
  } catch (error) {
    console.error('Erro ao fazer upload de chave privada:', error);
    res.status(500).json({ error: 'Erro ao fazer upload de chave privada' });
  }
});

// Testar conexão com servidor
router.post('/:id/test-connection', authenticate, async (req, res) => {
  try {
    const credential = await ServerCredential.findById(req.params.id);
    
    if (!credential) {
      return res.status(404).json({ error: 'Credencial não encontrada' });
    }
    
    // Verifica permissão: apenas usuários da mesma organização ou Super Admin
    if (req.user.role !== 'super_admin' && 
        credential.organizationId.toString() !== req.user.organizationId.toString()) {
      return res.status(403).json({ error: 'Acesso negado para esta credencial' });
    }
    
    const result = await credential.testConnection();
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao testar conexão com servidor:', error);
    res.status(500).json({ error: 'Erro ao testar conexão com servidor' });
  }
});

module.exports = router;
