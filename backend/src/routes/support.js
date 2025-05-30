const express = require('express');
const router = express.Router();
const passport = require('passport');
const SupportService = require('../support/services/support-service');

// Middleware de autenticação
const authenticate = passport.authenticate('jwt', { session: false });

// Middleware de autorização para Admin ou Super Admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Acesso negado. Permissão de Admin necessária.' });
  }
  next();
};

// Criar novo ticket
router.post('/tickets', authenticate, async (req, res) => {
  try {
    const {
      title,
      description,
      priority,
      category,
      serverCredentialId,
      attachments
    } = req.body;
    
    const result = await SupportService.createTicket({
      title,
      description,
      priority,
      category,
      organizationId: req.user.organizationId,
      userId: req.user._id,
      serverCredentialId,
      attachments
    });
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Erro ao criar ticket:', error);
    res.status(500).json({ error: error.message || 'Erro ao criar ticket' });
  }
});

// Listar tickets
router.get('/tickets', authenticate, async (req, res) => {
  try {
    const { status, assignedTo } = req.query;
    
    // Super Admin pode ver tickets de qualquer organização
    const organizationId = req.user.role === 'super_admin' && req.query.organizationId
      ? req.query.organizationId
      : req.user.organizationId;
    
    const result = await SupportService.listTickets({ 
      organizationId,
      status,
      assignedTo
    });
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao listar tickets:', error);
    res.status(500).json({ error: error.message || 'Erro ao listar tickets' });
  }
});

// Obter detalhes de um ticket
router.get('/tickets/:id', authenticate, async (req, res) => {
  try {
    const result = await SupportService.getTicketDetails(req.params.id);
    
    // Verifica permissão: apenas usuários da mesma organização ou Super Admin
    if (req.user.role !== 'super_admin' && 
        result.ticketConfig.organizationId !== req.user.organizationId.toString()) {
      return res.status(403).json({ error: 'Acesso negado a este ticket' });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao obter detalhes do ticket:', error);
    res.status(500).json({ error: error.message || 'Erro ao obter detalhes do ticket' });
  }
});

// Adicionar comentário a um ticket
router.post('/tickets/:id/comments', authenticate, async (req, res) => {
  try {
    const { comment, attachments } = req.body;
    
    // Verifica permissão
    const ticketDetails = await SupportService.getTicketDetails(req.params.id);
    if (req.user.role !== 'super_admin' && 
        ticketDetails.ticketConfig.organizationId !== req.user.organizationId.toString()) {
      return res.status(403).json({ error: 'Acesso negado a este ticket' });
    }
    
    const result = await SupportService.addComment(req.params.id, {
      userId: req.user._id,
      comment,
      attachments
    });
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao adicionar comentário:', error);
    res.status(500).json({ error: error.message || 'Erro ao adicionar comentário' });
  }
});

// Atribuir ticket a um usuário
router.post('/tickets/:id/assign', authenticate, requireAdmin, async (req, res) => {
  try {
    const { assignedTo } = req.body;
    
    // Verifica permissão
    const ticketDetails = await SupportService.getTicketDetails(req.params.id);
    if (req.user.role !== 'super_admin' && 
        ticketDetails.ticketConfig.organizationId !== req.user.organizationId.toString()) {
      return res.status(403).json({ error: 'Acesso negado a este ticket' });
    }
    
    const result = await SupportService.assignTicket(req.params.id, {
      assignedTo,
      assignedBy: req.user._id
    });
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao atribuir ticket:', error);
    res.status(500).json({ error: error.message || 'Erro ao atribuir ticket' });
  }
});

// Atualizar status do ticket
router.post('/tickets/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    
    // Verifica permissão
    const ticketDetails = await SupportService.getTicketDetails(req.params.id);
    if (req.user.role !== 'super_admin' && 
        ticketDetails.ticketConfig.organizationId !== req.user.organizationId.toString()) {
      return res.status(403).json({ error: 'Acesso negado a este ticket' });
    }
    
    const result = await SupportService.updateTicketStatus(req.params.id, {
      status,
      userId: req.user._id
    });
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao atualizar status do ticket:', error);
    res.status(500).json({ error: error.message || 'Erro ao atualizar status do ticket' });
  }
});

// Conectar ao servidor para diagnóstico
router.post('/tickets/:id/connect', authenticate, requireAdmin, async (req, res) => {
  try {
    // Verifica permissão
    const ticketDetails = await SupportService.getTicketDetails(req.params.id);
    if (req.user.role !== 'super_admin' && 
        ticketDetails.ticketConfig.organizationId !== req.user.organizationId.toString()) {
      return res.status(403).json({ error: 'Acesso negado a este ticket' });
    }
    
    const result = await SupportService.connectToServer(req.params.id, {
      userId: req.user._id
    });
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao conectar ao servidor:', error);
    res.status(500).json({ error: error.message || 'Erro ao conectar ao servidor' });
  }
});

// Executar diagnóstico no servidor
router.post('/tickets/:id/diagnostics', authenticate, requireAdmin, async (req, res) => {
  try {
    const { connectionId, diagnosticType } = req.body;
    
    // Verifica permissão
    const ticketDetails = await SupportService.getTicketDetails(req.params.id);
    if (req.user.role !== 'super_admin' && 
        ticketDetails.ticketConfig.organizationId !== req.user.organizationId.toString()) {
      return res.status(403).json({ error: 'Acesso negado a este ticket' });
    }
    
    const result = await SupportService.runDiagnostics(req.params.id, {
      userId: req.user._id,
      connectionId,
      diagnosticType
    });
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao executar diagnóstico:', error);
    res.status(500).json({ error: error.message || 'Erro ao executar diagnóstico' });
  }
});

// Executar ação corretiva no servidor
router.post('/tickets/:id/actions', authenticate, requireAdmin, async (req, res) => {
  try {
    const { connectionId, action, command, requireApproval, approved } = req.body;
    
    // Verifica permissão
    const ticketDetails = await SupportService.getTicketDetails(req.params.id);
    if (req.user.role !== 'super_admin' && 
        ticketDetails.ticketConfig.organizationId !== req.user.organizationId.toString()) {
      return res.status(403).json({ error: 'Acesso negado a este ticket' });
    }
    
    const result = await SupportService.runCorrectiveAction(req.params.id, {
      userId: req.user._id,
      connectionId,
      action,
      command,
      requireApproval,
      approved
    });
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao executar ação corretiva:', error);
    res.status(500).json({ error: error.message || 'Erro ao executar ação corretiva' });
  }
});

// Monitorar servidor
router.post('/monitor', authenticate, requireAdmin, async (req, res) => {
  try {
    const { serverCredentialId, metrics } = req.body;
    
    const result = await SupportService.monitorServer(serverCredentialId, {
      metrics
    });
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao monitorar servidor:', error);
    res.status(500).json({ error: error.message || 'Erro ao monitorar servidor' });
  }
});

// Analisar logs do sistema
router.post('/logs', authenticate, requireAdmin, async (req, res) => {
  try {
    const { serverCredentialId, logType, lines } = req.body;
    
    const result = await SupportService.analyzeLogs(serverCredentialId, {
      logType,
      lines
    });
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao analisar logs:', error);
    res.status(500).json({ error: error.message || 'Erro ao analisar logs' });
  }
});

module.exports = router;
