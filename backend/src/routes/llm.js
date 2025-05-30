const express = require('express');
const router = express.Router();
const passport = require('passport');
const LLMProvider = require('../infrastructure/models/llm-provider');
const LLMUsage = require('../infrastructure/models/llm-usage');
const Prompt = require('../infrastructure/models/prompt');
const LLMService = require('../infrastructure/services/llm-service');

// Middleware de autenticação
const authenticate = passport.authenticate('jwt', { session: false });

// Middleware de autorização para Super Admin
const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Acesso negado. Permissão de Super Admin necessária.' });
  }
  next();
};

// Middleware de autorização para Admin ou Super Admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Acesso negado. Permissão de Admin necessária.' });
  }
  next();
};

// Rotas para gerenciamento de provedores LLM (apenas Super Admin)

// Listar todos os provedores
router.get('/providers', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const providers = await LLMProvider.find().select('-apiKey');
    res.json(providers);
  } catch (error) {
    console.error('Erro ao listar provedores LLM:', error);
    res.status(500).json({ error: 'Erro ao listar provedores LLM' });
  }
});

// Obter um provedor específico
router.get('/providers/:id', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const provider = await LLMProvider.findById(req.params.id).select('-apiKey');
    if (!provider) {
      return res.status(404).json({ error: 'Provedor não encontrado' });
    }
    res.json(provider);
  } catch (error) {
    console.error('Erro ao obter provedor LLM:', error);
    res.status(500).json({ error: 'Erro ao obter provedor LLM' });
  }
});

// Criar novo provedor
router.post('/providers', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { name, description, endpoint, apiKey, models, defaultModel, rateLimits, fallbackProvider } = req.body;
    
    const provider = new LLMProvider({
      name,
      description,
      endpoint,
      apiKey,
      models,
      defaultModel,
      rateLimits,
      fallbackProvider
    });
    
    await provider.save();
    
    res.status(201).json({
      id: provider._id,
      name: provider.name,
      description: provider.description,
      endpoint: provider.endpoint,
      models: provider.models,
      defaultModel: provider.defaultModel,
      isActive: provider.isActive
    });
  } catch (error) {
    console.error('Erro ao criar provedor LLM:', error);
    res.status(500).json({ error: 'Erro ao criar provedor LLM' });
  }
});

// Atualizar provedor existente
router.put('/providers/:id', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { name, description, endpoint, apiKey, models, defaultModel, rateLimits, fallbackProvider, isActive } = req.body;
    
    const provider = await LLMProvider.findById(req.params.id);
    if (!provider) {
      return res.status(404).json({ error: 'Provedor não encontrado' });
    }
    
    // Atualiza apenas os campos fornecidos
    if (name) provider.name = name;
    if (description !== undefined) provider.description = description;
    if (endpoint) provider.endpoint = endpoint;
    if (apiKey) provider.apiKey = apiKey;
    if (models) provider.models = models;
    if (defaultModel) provider.defaultModel = defaultModel;
    if (rateLimits) provider.rateLimits = rateLimits;
    if (fallbackProvider) provider.fallbackProvider = fallbackProvider;
    if (isActive !== undefined) provider.isActive = isActive;
    
    await provider.save();
    
    res.json({
      id: provider._id,
      name: provider.name,
      description: provider.description,
      endpoint: provider.endpoint,
      models: provider.models,
      defaultModel: provider.defaultModel,
      isActive: provider.isActive
    });
  } catch (error) {
    console.error('Erro ao atualizar provedor LLM:', error);
    res.status(500).json({ error: 'Erro ao atualizar provedor LLM' });
  }
});

// Excluir provedor
router.delete('/providers/:id', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const provider = await LLMProvider.findById(req.params.id);
    if (!provider) {
      return res.status(404).json({ error: 'Provedor não encontrado' });
    }
    
    await provider.deleteOne();
    
    res.json({ message: 'Provedor excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir provedor LLM:', error);
    res.status(500).json({ error: 'Erro ao excluir provedor LLM' });
  }
});

// Testar conexão com provedor
router.post('/providers/:id/test', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const provider = await LLMProvider.findById(req.params.id);
    if (!provider) {
      return res.status(404).json({ error: 'Provedor não encontrado' });
    }
    
    const result = await provider.testConnection();
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao testar conexão com provedor LLM:', error);
    res.status(500).json({ error: 'Erro ao testar conexão com provedor LLM' });
  }
});

// Rotas para gerenciamento de prompts

// Listar prompts (filtrados por organização ou sistema)
router.get('/prompts', authenticate, async (req, res) => {
  try {
    const { category, isSystemPrompt } = req.query;
    
    let query = {};
    
    // Filtra por categoria se fornecida
    if (category) {
      query.category = category;
    }
    
    // Filtra por tipo de prompt (sistema ou organização)
    if (isSystemPrompt === 'true') {
      query.isSystemPrompt = true;
    } else {
      // Se não for Super Admin, só pode ver prompts da própria organização
      if (req.user.role !== 'super_admin') {
        query.organizationId = req.user.organizationId;
      } else if (isSystemPrompt === 'false') {
        query.isSystemPrompt = false;
      }
    }
    
    const prompts = await Prompt.find(query);
    res.json(prompts);
  } catch (error) {
    console.error('Erro ao listar prompts:', error);
    res.status(500).json({ error: 'Erro ao listar prompts' });
  }
});

// Obter um prompt específico
router.get('/prompts/:id', authenticate, async (req, res) => {
  try {
    const prompt = await Prompt.findById(req.params.id);
    
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt não encontrado' });
    }
    
    // Verifica permissão: apenas Super Admin pode ver qualquer prompt
    if (req.user.role !== 'super_admin' && 
        prompt.organizationId && 
        prompt.organizationId.toString() !== req.user.organizationId.toString()) {
      return res.status(403).json({ error: 'Acesso negado a este prompt' });
    }
    
    res.json(prompt);
  } catch (error) {
    console.error('Erro ao obter prompt:', error);
    res.status(500).json({ error: 'Erro ao obter prompt' });
  }
});

// Criar novo prompt
router.post('/prompts', authenticate, async (req, res) => {
  try {
    const { name, description, content, category, tags, isSystemPrompt } = req.body;
    
    // Apenas Super Admin pode criar prompts do sistema
    if (isSystemPrompt && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Apenas Super Admin pode criar prompts do sistema' });
    }
    
    const prompt = new Prompt({
      name,
      description,
      content,
      category: category || 'general',
      tags,
      organizationId: isSystemPrompt ? null : req.user.organizationId,
      isSystemPrompt: isSystemPrompt || false,
      createdBy: req.user._id
    });
    
    await prompt.save();
    
    res.status(201).json(prompt);
  } catch (error) {
    console.error('Erro ao criar prompt:', error);
    res.status(500).json({ error: 'Erro ao criar prompt' });
  }
});

// Atualizar prompt existente
router.put('/prompts/:id', authenticate, async (req, res) => {
  try {
    const { name, description, content, category, tags, isActive, changeReason } = req.body;
    
    const prompt = await Prompt.findById(req.params.id);
    
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt não encontrado' });
    }
    
    // Verifica permissão: apenas Super Admin pode editar qualquer prompt
    if (req.user.role !== 'super_admin' && 
        (prompt.isSystemPrompt || 
         (prompt.organizationId && prompt.organizationId.toString() !== req.user.organizationId.toString()))) {
      return res.status(403).json({ error: 'Acesso negado para editar este prompt' });
    }
    
    // Prepara para criar nova versão se o conteúdo for alterado
    if (content && content !== prompt.content) {
      prompt._previousContent = prompt.content;
      prompt._changedBy = req.user._id;
      prompt._changeReason = changeReason || 'Atualização de conteúdo';
    }
    
    // Atualiza apenas os campos fornecidos
    if (name) prompt.name = name;
    if (description !== undefined) prompt.description = description;
    if (content) prompt.content = content;
    if (category) prompt.category = category;
    if (tags) prompt.tags = tags;
    if (isActive !== undefined) prompt.isActive = isActive;
    
    await prompt.save();
    
    res.json(prompt);
  } catch (error) {
    console.error('Erro ao atualizar prompt:', error);
    res.status(500).json({ error: 'Erro ao atualizar prompt' });
  }
});

// Excluir prompt
router.delete('/prompts/:id', authenticate, async (req, res) => {
  try {
    const prompt = await Prompt.findById(req.params.id);
    
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt não encontrado' });
    }
    
    // Verifica permissão: apenas Super Admin pode excluir qualquer prompt
    if (req.user.role !== 'super_admin' && 
        (prompt.isSystemPrompt || 
         (prompt.organizationId && prompt.organizationId.toString() !== req.user.organizationId.toString()))) {
      return res.status(403).json({ error: 'Acesso negado para excluir este prompt' });
    }
    
    await prompt.deleteOne();
    
    res.json({ message: 'Prompt excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir prompt:', error);
    res.status(500).json({ error: 'Erro ao excluir prompt' });
  }
});

// Reverter prompt para versão anterior
router.post('/prompts/:id/revert/:version', authenticate, async (req, res) => {
  try {
    const prompt = await Prompt.findById(req.params.id);
    
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt não encontrado' });
    }
    
    // Verifica permissão: apenas Super Admin pode reverter qualquer prompt
    if (req.user.role !== 'super_admin' && 
        (prompt.isSystemPrompt || 
         (prompt.organizationId && prompt.organizationId.toString() !== req.user.organizationId.toString()))) {
      return res.status(403).json({ error: 'Acesso negado para reverter este prompt' });
    }
    
    const versionNumber = parseInt(req.params.version);
    
    await prompt.revertToVersion(versionNumber);
    
    res.json(prompt);
  } catch (error) {
    console.error('Erro ao reverter prompt:', error);
    res.status(500).json({ error: 'Erro ao reverter prompt' });
  }
});

// Rota para enviar prompt para LLM
router.post('/query', authenticate, async (req, res) => {
  try {
    const { promptId, promptContent, providerId, modelId, temperature, maxTokens, systemMessage, inputs } = req.body;
    
    const result = await LLMService.sendPrompt({
      organizationId: req.user.organizationId,
      promptId,
      promptContent,
      providerId,
      modelId,
      temperature,
      maxTokens,
      systemMessage,
      inputs
    });
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao enviar prompt para LLM:', error);
    res.status(500).json({ error: error.message || 'Erro ao enviar prompt para LLM' });
  }
});

// Rotas para gerenciamento de uso de LLM

// Obter configurações de uso para uma organização
router.get('/usage', authenticate, requireAdmin, async (req, res) => {
  try {
    const organizationId = req.query.organizationId || req.user.organizationId;
    
    // Apenas Super Admin pode ver uso de outras organizações
    if (req.user.role !== 'super_admin' && organizationId !== req.user.organizationId.toString()) {
      return res.status(403).json({ error: 'Acesso negado a esta organização' });
    }
    
    let usage = await LLMUsage.findOne({ organizationId });
    
    // Se não existir, cria um novo registro
    if (!usage) {
      usage = new LLMUsage({ organizationId });
      await usage.save();
    }
    
    res.json(usage);
  } catch (error) {
    console.error('Erro ao obter uso de LLM:', error);
    res.status(500).json({ error: 'Erro ao obter uso de LLM' });
  }
});

// Atualizar configurações de uso para uma organização
router.put('/usage', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { organizationId, settings } = req.body;
    
    let usage = await LLMUsage.findOne({ organizationId });
    
    // Se não existir, cria um novo registro
    if (!usage) {
      usage = new LLMUsage({ organizationId });
    }
    
    // Atualiza configurações
    if (settings) {
      usage.settings = { ...usage.settings, ...settings };
    }
    
    await usage.save();
    
    res.json(usage);
  } catch (error) {
    console.error('Erro ao atualizar configurações de uso de LLM:', error);
    res.status(500).json({ error: 'Erro ao atualizar configurações de uso de LLM' });
  }
});

// Reconhecer alerta
router.post('/usage/alerts/:alertId/acknowledge', authenticate, requireAdmin, async (req, res) => {
  try {
    const { organizationId } = req.body;
    
    // Apenas Super Admin pode reconhecer alertas de outras organizações
    if (req.user.role !== 'super_admin' && organizationId !== req.user.organizationId.toString()) {
      return res.status(403).json({ error: 'Acesso negado a esta organização' });
    }
    
    const usage = await LLMUsage.findOne({ organizationId });
    
    if (!usage) {
      return res.status(404).json({ error: 'Configuração de uso não encontrada' });
    }
    
    const alert = await usage.acknowledgeAlert(req.params.alertId, req.user._id);
    
    res.json(alert);
  } catch (error) {
    console.error('Erro ao reconhecer alerta:', error);
    res.status(500).json({ error: 'Erro ao reconhecer alerta' });
  }
});

module.exports = router;
