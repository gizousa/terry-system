const express = require('express');
const router = express.Router();
const passport = require('passport');
const CommunicationService = require('../communication/services/communication-service');

// Middleware de autenticação
const authenticate = passport.authenticate('jwt', { session: false });

// Middleware de autorização para Admin ou Super Admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Acesso negado. Permissão de Admin necessária.' });
  }
  next();
};

// Configurar SMTP
router.post('/smtp/configure', authenticate, requireAdmin, async (req, res) => {
  try {
    const { host, port, secure, user, password, from } = req.body;
    
    // Super Admin pode configurar para qualquer organização
    const organizationId = req.user.role === 'super_admin' && req.body.organizationId
      ? req.body.organizationId
      : req.user.organizationId;
    
    const result = await CommunicationService.configureSMTP({
      host,
      port,
      secure,
      user,
      password,
      from,
      organizationId
    });
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao configurar SMTP:', error);
    res.status(500).json({ error: error.message || 'Erro ao configurar SMTP' });
  }
});

// Testar conexão SMTP
router.post('/smtp/test', authenticate, requireAdmin, async (req, res) => {
  try {
    const { host, port, secure, user, password } = req.body;
    
    const result = await CommunicationService.testSMTPConnection({
      host,
      port,
      secure,
      auth: {
        user,
        password
      }
    });
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao testar conexão SMTP:', error);
    res.status(500).json({ error: error.message || 'Erro ao testar conexão SMTP' });
  }
});

// Configurar WhatsApp
router.post('/whatsapp/configure', authenticate, requireAdmin, async (req, res) => {
  try {
    const { apiKey, apiUrl, phoneNumberId } = req.body;
    
    // Super Admin pode configurar para qualquer organização
    const organizationId = req.user.role === 'super_admin' && req.body.organizationId
      ? req.body.organizationId
      : req.user.organizationId;
    
    const result = await CommunicationService.configureWhatsApp({
      apiKey,
      apiUrl,
      phoneNumberId,
      organizationId
    });
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao configurar WhatsApp:', error);
    res.status(500).json({ error: error.message || 'Erro ao configurar WhatsApp' });
  }
});

// Testar conexão WhatsApp
router.post('/whatsapp/test', authenticate, requireAdmin, async (req, res) => {
  try {
    const { apiKey, apiUrl } = req.body;
    
    const result = await CommunicationService.testWhatsAppConnection({
      apiKey,
      apiUrl
    });
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao testar conexão WhatsApp:', error);
    res.status(500).json({ error: error.message || 'Erro ao testar conexão WhatsApp' });
  }
});

// Criar template
router.post('/templates', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, type, subject, content } = req.body;
    
    // Super Admin pode criar templates para qualquer organização
    const organizationId = req.user.role === 'super_admin' && req.body.organizationId
      ? req.body.organizationId
      : req.user.organizationId;
    
    const result = await CommunicationService.createTemplate({
      name,
      type,
      subject,
      content,
      organizationId
    });
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Erro ao criar template:', error);
    res.status(500).json({ error: error.message || 'Erro ao criar template' });
  }
});

// Listar templates
router.get('/templates', authenticate, async (req, res) => {
  try {
    const { type } = req.query;
    
    // Super Admin pode ver templates de qualquer organização
    const organizationId = req.user.role === 'super_admin' && req.query.organizationId
      ? req.query.organizationId
      : req.user.organizationId;
    
    const result = await CommunicationService.listTemplates({
      type,
      organizationId
    });
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao listar templates:', error);
    res.status(500).json({ error: error.message || 'Erro ao listar templates' });
  }
});

// Enviar e-mail
router.post('/email/send', authenticate, async (req, res) => {
  try {
    const { to, subject, text, html, templateName, templateData, attachments } = req.body;
    
    // Super Admin pode enviar e-mails de qualquer organização
    const organizationId = req.user.role === 'super_admin' && req.body.organizationId
      ? req.body.organizationId
      : req.user.organizationId;
    
    const result = await CommunicationService.sendEmail({
      to,
      subject,
      text,
      html,
      templateName,
      templateData,
      attachments,
      organizationId
    });
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    res.status(500).json({ error: error.message || 'Erro ao enviar e-mail' });
  }
});

// Enviar mensagem WhatsApp
router.post('/whatsapp/send', authenticate, async (req, res) => {
  try {
    const { to, message, templateName, templateData, attachmentUrl } = req.body;
    
    // Super Admin pode enviar mensagens de qualquer organização
    const organizationId = req.user.role === 'super_admin' && req.body.organizationId
      ? req.body.organizationId
      : req.user.organizationId;
    
    const result = await CommunicationService.sendWhatsApp({
      to,
      message,
      templateName,
      templateData,
      attachmentUrl,
      organizationId
    });
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao enviar mensagem WhatsApp:', error);
    res.status(500).json({ error: error.message || 'Erro ao enviar mensagem WhatsApp' });
  }
});

// Obter logs de comunicação
router.get('/logs', authenticate, requireAdmin, async (req, res) => {
  try {
    const { type, date, limit } = req.query;
    
    // Super Admin pode ver logs de qualquer organização
    const organizationId = req.user.role === 'super_admin' && req.query.organizationId
      ? req.query.organizationId
      : req.user.organizationId;
    
    const result = await CommunicationService.getLogs({
      type,
      date,
      organizationId,
      limit: limit ? parseInt(limit) : 100
    });
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao obter logs de comunicação:', error);
    res.status(500).json({ error: error.message || 'Erro ao obter logs de comunicação' });
  }
});

module.exports = router;
