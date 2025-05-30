const express = require('express');
const router = express.Router();
const whatsappService = require('../communication/services/whatsapp-service');
const { authenticateJWT, authorizeRole } = require('../middleware/auth');

// Configurar EvolutionAPI
router.post('/whatsapp/evolution/configure', authenticateJWT, authorizeRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { apiUrl, apiKey, instanceName, organizationId } = req.body;
    
    // Validação básica
    if (!apiUrl || !apiKey) {
      return res.status(400).json({ success: false, message: 'URL da API e chave API são obrigatórios' });
    }
    
    const result = await whatsappService.configureEvolutionAPI({
      apiUrl,
      apiKey,
      instanceName,
      organizationId
    });
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao configurar EvolutionAPI:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Configurar API Oficial do WhatsApp
router.post('/whatsapp/official/configure', authenticateJWT, authorizeRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { accessToken, phoneNumberId, businessAccountId, webhookSecret, organizationId } = req.body;
    
    // Validação básica
    if (!accessToken || !phoneNumberId) {
      return res.status(400).json({ success: false, message: 'Token de acesso e ID do número de telefone são obrigatórios' });
    }
    
    const result = await whatsappService.configureOfficialAPI({
      accessToken,
      phoneNumberId,
      businessAccountId,
      webhookSecret,
      organizationId
    });
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao configurar API Oficial:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Testar conexão com EvolutionAPI
router.post('/whatsapp/evolution/test', authenticateJWT, authorizeRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { apiUrl, apiKey, instanceName } = req.body;
    
    // Validação básica
    if (!apiUrl || !apiKey) {
      return res.status(400).json({ success: false, message: 'URL da API e chave API são obrigatórios' });
    }
    
    const config = {
      apiUrl,
      apiKey,
      instanceName: instanceName || 'terry'
    };
    
    const result = await whatsappService.testEvolutionAPIConnection(config);
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao testar conexão com EvolutionAPI:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Testar conexão com API Oficial
router.post('/whatsapp/official/test', authenticateJWT, authorizeRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { accessToken, phoneNumberId } = req.body;
    
    // Validação básica
    if (!accessToken || !phoneNumberId) {
      return res.status(400).json({ success: false, message: 'Token de acesso e ID do número de telefone são obrigatórios' });
    }
    
    const config = {
      accessToken,
      phoneNumberId
    };
    
    const result = await whatsappService.testOfficialAPIConnection(config);
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao testar conexão com API Oficial:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Enviar mensagem WhatsApp
router.post('/whatsapp/send', authenticateJWT, async (req, res) => {
  try {
    const { to, message, mediaUrl, mediaType, caption, provider, organizationId } = req.body;
    
    // Validação básica
    if (!to || (!message && !mediaUrl)) {
      return res.status(400).json({ success: false, message: 'Destinatário e mensagem ou mídia são obrigatórios' });
    }
    
    const result = await whatsappService.sendMessage({
      to,
      message,
      mediaUrl,
      mediaType,
      caption,
      provider,
      organizationId
    });
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao enviar mensagem WhatsApp:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Listar provedores configurados
router.get('/whatsapp/providers', authenticateJWT, authorizeRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { organizationId } = req.query;
    
    const result = await whatsappService.listProviders(organizationId);
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao listar provedores:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Webhook para EvolutionAPI
router.post('/whatsapp/evolution/webhook', async (req, res) => {
  try {
    // Implementação do webhook para EvolutionAPI
    console.log('Webhook EvolutionAPI recebido:', req.body);
    
    // Aqui você pode processar as notificações da EvolutionAPI
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro no webhook EvolutionAPI:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Webhook para API Oficial
router.post('/whatsapp/official/webhook', async (req, res) => {
  try {
    // Implementação do webhook para API Oficial
    console.log('Webhook API Oficial recebido:', req.body);
    
    // Verificação do modo de hub
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    // Verificação do webhook
    if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
      console.log('Webhook verificado!');
      return res.status(200).send(challenge);
    }
    
    // Aqui você pode processar as notificações da API Oficial
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro no webhook API Oficial:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
