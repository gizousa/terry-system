const express = require('express');
const router = express.Router();
const passport = require('passport');
const DevelopmentService = require('../development/services/development-service');

// Middleware de autenticação
const authenticate = passport.authenticate('jwt', { session: false });

// Middleware de autorização para Admin ou Super Admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Acesso negado. Permissão de Admin necessária.' });
  }
  next();
};

// Criar novo projeto
router.post('/projects', authenticate, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      description,
      projectType,
      requirements,
      serverCredentialId
    } = req.body;
    
    const result = await DevelopmentService.createProject({
      name,
      description,
      organizationId: req.user.organizationId,
      userId: req.user._id,
      projectType,
      requirements,
      serverCredentialId
    });
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Erro ao criar projeto:', error);
    res.status(500).json({ error: error.message || 'Erro ao criar projeto' });
  }
});

// Listar projetos
router.get('/projects', authenticate, async (req, res) => {
  try {
    // Super Admin pode ver projetos de qualquer organização
    const organizationId = req.user.role === 'super_admin' && req.query.organizationId
      ? req.query.organizationId
      : req.user.organizationId;
    
    const result = await DevelopmentService.listProjects({ organizationId });
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao listar projetos:', error);
    res.status(500).json({ error: error.message || 'Erro ao listar projetos' });
  }
});

// Obter detalhes de um projeto
router.get('/projects/:id', authenticate, async (req, res) => {
  try {
    const result = await DevelopmentService.getProjectDetails(req.params.id);
    
    // Verifica permissão: apenas usuários da mesma organização ou Super Admin
    if (req.user.role !== 'super_admin' && 
        result.projectConfig.organizationId !== req.user.organizationId.toString()) {
      return res.status(403).json({ error: 'Acesso negado a este projeto' });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao obter detalhes do projeto:', error);
    res.status(500).json({ error: error.message || 'Erro ao obter detalhes do projeto' });
  }
});

// Analisar requisitos
router.post('/projects/:id/analyze', authenticate, requireAdmin, async (req, res) => {
  try {
    const projectId = req.params.id;
    
    // Verifica permissão
    const projectDetails = await DevelopmentService.getProjectDetails(projectId);
    if (req.user.role !== 'super_admin' && 
        projectDetails.projectConfig.organizationId !== req.user.organizationId.toString()) {
      return res.status(403).json({ error: 'Acesso negado a este projeto' });
    }
    
    const result = await DevelopmentService.analyzeRequirements(projectId, {
      userId: req.user._id
    });
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao analisar requisitos:', error);
    res.status(500).json({ error: error.message || 'Erro ao analisar requisitos' });
  }
});

// Projetar arquitetura
router.post('/projects/:id/design', authenticate, requireAdmin, async (req, res) => {
  try {
    const projectId = req.params.id;
    
    // Verifica permissão
    const projectDetails = await DevelopmentService.getProjectDetails(projectId);
    if (req.user.role !== 'super_admin' && 
        projectDetails.projectConfig.organizationId !== req.user.organizationId.toString()) {
      return res.status(403).json({ error: 'Acesso negado a este projeto' });
    }
    
    const result = await DevelopmentService.designArchitecture(projectId, {
      userId: req.user._id
    });
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao projetar arquitetura:', error);
    res.status(500).json({ error: error.message || 'Erro ao projetar arquitetura' });
  }
});

// Implementar sistema
router.post('/projects/:id/implement', authenticate, requireAdmin, async (req, res) => {
  try {
    const projectId = req.params.id;
    
    // Verifica permissão
    const projectDetails = await DevelopmentService.getProjectDetails(projectId);
    if (req.user.role !== 'super_admin' && 
        projectDetails.projectConfig.organizationId !== req.user.organizationId.toString()) {
      return res.status(403).json({ error: 'Acesso negado a este projeto' });
    }
    
    const result = await DevelopmentService.implementSystem(projectId, {
      userId: req.user._id
    });
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao implementar sistema:', error);
    res.status(500).json({ error: error.message || 'Erro ao implementar sistema' });
  }
});

// Testar sistema
router.post('/projects/:id/test', authenticate, requireAdmin, async (req, res) => {
  try {
    const projectId = req.params.id;
    
    // Verifica permissão
    const projectDetails = await DevelopmentService.getProjectDetails(projectId);
    if (req.user.role !== 'super_admin' && 
        projectDetails.projectConfig.organizationId !== req.user.organizationId.toString()) {
      return res.status(403).json({ error: 'Acesso negado a este projeto' });
    }
    
    const result = await DevelopmentService.testSystem(projectId, {
      userId: req.user._id
    });
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao testar sistema:', error);
    res.status(500).json({ error: error.message || 'Erro ao testar sistema' });
  }
});

// Implantar sistema
router.post('/projects/:id/deploy', authenticate, requireAdmin, async (req, res) => {
  try {
    const projectId = req.params.id;
    
    // Verifica permissão
    const projectDetails = await DevelopmentService.getProjectDetails(projectId);
    if (req.user.role !== 'super_admin' && 
        projectDetails.projectConfig.organizationId !== req.user.organizationId.toString()) {
      return res.status(403).json({ error: 'Acesso negado a este projeto' });
    }
    
    const result = await DevelopmentService.deploySystem(projectId, {
      userId: req.user._id
    });
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao implantar sistema:', error);
    res.status(500).json({ error: error.message || 'Erro ao implantar sistema' });
  }
});

module.exports = router;
