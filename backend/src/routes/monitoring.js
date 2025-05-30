const express = require('express');
const router = express.Router();
const passport = require('passport');
const RealTimeMonitoringService = require('../monitoring/services/realtime-monitoring-service');

// Middleware de autenticação
const authenticate = passport.authenticate('jwt', { session: false });

// Middleware de autorização para Admin ou Super Admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Acesso negado. Permissão de Admin necessária.' });
  }
  next();
};

// Iniciar sessão de automação
router.post('/automation/sessions', authenticate, async (req, res) => {
  try {
    const { sessionId, name, description } = req.body;
    
    const result = await RealTimeMonitoringService.startAutomationSession({
      sessionId: sessionId || `auto_${Date.now()}`,
      name,
      description,
      organizationId: req.user.organizationId,
      userId: req.user._id
    });
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Erro ao iniciar sessão de automação:', error);
    res.status(500).json({ error: error.message || 'Erro ao iniciar sessão de automação' });
  }
});

// Atualizar sessão de automação
router.put('/automation/sessions/:id', authenticate, async (req, res) => {
  try {
    const { status, currentStep, progress, log, logLevel } = req.body;
    
    const result = await RealTimeMonitoringService.updateAutomationSession(req.params.id, {
      status,
      currentStep,
      progress,
      log,
      logLevel
    });
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao atualizar sessão de automação:', error);
    res.status(500).json({ error: error.message || 'Erro ao atualizar sessão de automação' });
  }
});

// Finalizar sessão de automação
router.post('/automation/sessions/:id/end', authenticate, async (req, res) => {
  try {
    const { success, error, data } = req.body;
    
    const result = await RealTimeMonitoringService.endAutomationSession(req.params.id, {
      success: success !== false,
      error,
      data
    });
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao finalizar sessão de automação:', error);
    res.status(500).json({ error: error.message || 'Erro ao finalizar sessão de automação' });
  }
});

// Obter estado de sessão de automação
router.get('/automation/sessions/:id', authenticate, async (req, res) => {
  try {
    const state = RealTimeMonitoringService.getAutomationState(req.params.id);
    
    if (!state) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }
    
    res.json({
      success: true,
      session: state
    });
  } catch (error) {
    console.error('Erro ao obter estado de sessão de automação:', error);
    res.status(500).json({ error: error.message || 'Erro ao obter estado de sessão de automação' });
  }
});

// Publicar evento personalizado
router.post('/events', authenticate, requireAdmin, async (req, res) => {
  try {
    const { topic, params, data } = req.body;
    
    // Validação básica
    if (!topic || !data) {
      return res.status(400).json({ error: 'Tópico e dados são obrigatórios' });
    }
    
    // Verificar permissão para o tópico
    const client = {
      role: req.user.role,
      organizationId: req.user.organizationId
    };
    
    if (!RealTimeMonitoringService.canAccessTopic(client, topic, params)) {
      return res.status(403).json({ error: 'Acesso negado ao tópico' });
    }
    
    // Publicar evento
    const sentCount = RealTimeMonitoringService.publishEvent(topic, params, data);
    
    res.json({
      success: true,
      sentCount
    });
  } catch (error) {
    console.error('Erro ao publicar evento:', error);
    res.status(500).json({ error: error.message || 'Erro ao publicar evento' });
  }
});

// Obter estado do sistema
router.get('/system/state', authenticate, requireAdmin, async (req, res) => {
  try {
    // Apenas Super Admin pode acessar estado do sistema
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Acesso negado. Permissão de Super Admin necessária.' });
    }
    
    const state = RealTimeMonitoringService.getSystemState();
    
    res.json({
      success: true,
      state
    });
  } catch (error) {
    console.error('Erro ao obter estado do sistema:', error);
    res.status(500).json({ error: error.message || 'Erro ao obter estado do sistema' });
  }
});

module.exports = router;
