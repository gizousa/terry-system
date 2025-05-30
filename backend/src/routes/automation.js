const express = require('express');
const router = express.Router();
const passport = require('passport');
const WebAutomationService = require('../automation/services/web-automation-service');

// Middleware de autenticação
const authenticate = passport.authenticate('jwt', { session: false });

// Middleware de autorização para Admin ou Super Admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Acesso negado. Permissão de Admin necessária.' });
  }
  next();
};

// Iniciar uma nova sessão de navegador
router.post('/browser/start', authenticate, requireAdmin, async (req, res) => {
  try {
    const { sessionId, options } = req.body;
    
    // Gera um ID de sessão único se não fornecido
    const finalSessionId = sessionId || `${req.user._id}_${Date.now()}`;
    
    const result = await WebAutomationService.startBrowser(finalSessionId, options);
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao iniciar navegador:', error);
    res.status(500).json({ error: error.message || 'Erro ao iniciar navegador' });
  }
});

// Navegar para uma URL
router.post('/browser/:sessionId/navigate', authenticate, requireAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL não fornecida' });
    }
    
    const result = await WebAutomationService.navigateTo(sessionId, url);
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao navegar:', error);
    res.status(500).json({ error: error.message || 'Erro ao navegar' });
  }
});

// Clicar em um elemento
router.post('/browser/:sessionId/click', authenticate, requireAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { selector, options } = req.body;
    
    if (!selector) {
      return res.status(400).json({ error: 'Seletor não fornecido' });
    }
    
    const result = await WebAutomationService.clickElement(sessionId, selector, options);
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao clicar em elemento:', error);
    res.status(500).json({ error: error.message || 'Erro ao clicar em elemento' });
  }
});

// Preencher um campo de formulário
router.post('/browser/:sessionId/fill', authenticate, requireAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { selector, value, options } = req.body;
    
    if (!selector || value === undefined) {
      return res.status(400).json({ error: 'Seletor ou valor não fornecido' });
    }
    
    const result = await WebAutomationService.fillForm(sessionId, selector, value, options);
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao preencher formulário:', error);
    res.status(500).json({ error: error.message || 'Erro ao preencher formulário' });
  }
});

// Selecionar uma opção em um dropdown
router.post('/browser/:sessionId/select', authenticate, requireAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { selector, value, options } = req.body;
    
    if (!selector || value === undefined) {
      return res.status(400).json({ error: 'Seletor ou valor não fornecido' });
    }
    
    const result = await WebAutomationService.selectOption(sessionId, selector, value, options);
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao selecionar opção:', error);
    res.status(500).json({ error: error.message || 'Erro ao selecionar opção' });
  }
});

// Extrair texto de um elemento
router.post('/browser/:sessionId/extract-text', authenticate, requireAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { selector } = req.body;
    
    if (!selector) {
      return res.status(400).json({ error: 'Seletor não fornecido' });
    }
    
    const result = await WebAutomationService.extractText(sessionId, selector);
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao extrair texto:', error);
    res.status(500).json({ error: error.message || 'Erro ao extrair texto' });
  }
});

// Tirar um screenshot
router.post('/browser/:sessionId/screenshot', authenticate, requireAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { options } = req.body;
    
    const screenshotPath = await WebAutomationService.takeScreenshot(sessionId, options);
    
    res.json({ 
      success: true, 
      screenshotPath,
      url: `/api/automation/screenshots/${path.basename(screenshotPath)}`
    });
  } catch (error) {
    console.error('Erro ao tirar screenshot:', error);
    res.status(500).json({ error: error.message || 'Erro ao tirar screenshot' });
  }
});

// Reconhecer texto em uma imagem (OCR)
router.post('/ocr', authenticate, requireAdmin, async (req, res) => {
  try {
    const { imagePath, options } = req.body;
    
    if (!imagePath) {
      return res.status(400).json({ error: 'Caminho da imagem não fornecido' });
    }
    
    const result = await WebAutomationService.recognizeText(imagePath, options);
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao reconhecer texto:', error);
    res.status(500).json({ error: error.message || 'Erro ao reconhecer texto' });
  }
});

// Encontrar elemento visual em uma imagem
router.post('/browser/:sessionId/find-visual', authenticate, requireAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { templateImagePath, options } = req.body;
    
    if (!templateImagePath) {
      return res.status(400).json({ error: 'Caminho da imagem template não fornecido' });
    }
    
    const result = await WebAutomationService.findVisualElement(sessionId, templateImagePath, options);
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao buscar elemento visual:', error);
    res.status(500).json({ error: error.message || 'Erro ao buscar elemento visual' });
  }
});

// Executar JavaScript na página
router.post('/browser/:sessionId/execute', authenticate, requireAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { script } = req.body;
    
    if (!script) {
      return res.status(400).json({ error: 'Script não fornecido' });
    }
    
    const result = await WebAutomationService.executeScript(sessionId, script);
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao executar script:', error);
    res.status(500).json({ error: error.message || 'Erro ao executar script' });
  }
});

// Fechar uma sessão de navegador
router.post('/browser/:sessionId/close', authenticate, requireAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const result = await WebAutomationService.closeBrowser(sessionId);
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao fechar navegador:', error);
    res.status(500).json({ error: error.message || 'Erro ao fechar navegador' });
  }
});

// Rota para servir screenshots
router.get('/screenshots/:filename', authenticate, (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(WebAutomationService.screenshotsDir, filename);
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Screenshot não encontrado' });
    }
    
    res.sendFile(filepath);
  } catch (error) {
    console.error('Erro ao servir screenshot:', error);
    res.status(500).json({ error: error.message || 'Erro ao servir screenshot' });
  }
});

module.exports = router;
