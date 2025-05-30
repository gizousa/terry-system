// Serviço para automação de navegadores e interfaces web
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createWorker } = require('tesseract.js');

class WebAutomationService {
  constructor() {
    this.browsers = new Map(); // Mapa de instâncias de navegadores
    this.screenshotsDir = path.join(__dirname, '..', '..', '..', 'data', 'screenshots');
    this.recordingsDir = path.join(__dirname, '..', '..', '..', 'data', 'recordings');
    
    // Garantir que os diretórios existam
    if (!fs.existsSync(this.screenshotsDir)) {
      fs.mkdirSync(this.screenshotsDir, { recursive: true });
    }
    
    if (!fs.existsSync(this.recordingsDir)) {
      fs.mkdirSync(this.recordingsDir, { recursive: true });
    }
  }

  // Iniciar navegador
  async startBrowser(options = {}) {
    try {
      const browserId = options.browserId || crypto.randomUUID();
      
      // Verificar se já existe um navegador com este ID
      if (this.browsers.has(browserId)) {
        return {
          success: true,
          browserId,
          message: 'Navegador já está em execução'
        };
      }
      
      // Configurar opções do navegador
      const browserOptions = {
        headless: options.headless !== false, // Padrão: true
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920,1080'
        ],
        defaultViewport: {
          width: 1920,
          height: 1080
        }
      };
      
      // Iniciar navegador
      const browser = await puppeteer.launch(browserOptions);
      
      // Armazenar navegador
      this.browsers.set(browserId, {
        browser,
        pages: new Map(),
        createdAt: new Date(),
        lastActivity: Date.now(),
        options
      });
      
      // Configurar evento de fechamento
      browser.on('disconnected', () => {
        this.browsers.delete(browserId);
      });
      
      return {
        success: true,
        browserId,
        message: 'Navegador iniciado com sucesso'
      };
    } catch (error) {
      console.error('Erro ao iniciar navegador:', error);
      throw error;
    }
  }

  // Fechar navegador
  async closeBrowser(browserId) {
    try {
      const browserData = this.browsers.get(browserId);
      
      if (!browserData) {
        return {
          success: false,
          message: 'Navegador não encontrado'
        };
      }
      
      // Fechar navegador
      await browserData.browser.close();
      
      // Remover do mapa
      this.browsers.delete(browserId);
      
      return {
        success: true,
        message: 'Navegador fechado com sucesso'
      };
    } catch (error) {
      console.error(`Erro ao fechar navegador ${browserId}:`, error);
      throw error;
    }
  }

  // Criar nova página
  async newPage(browserId) {
    try {
      const browserData = this.browsers.get(browserId);
      
      if (!browserData) {
        throw new Error('Navegador não encontrado');
      }
      
      // Atualizar timestamp de última atividade
      browserData.lastActivity = Date.now();
      
      // Criar nova página
      const page = await browserData.browser.newPage();
      const pageId = crypto.randomUUID();
      
      // Configurar página
      await page.setDefaultNavigationTimeout(60000); // 60 segundos
      await page.setDefaultTimeout(30000); // 30 segundos
      
      // Armazenar página
      browserData.pages.set(pageId, {
        page,
        url: 'about:blank',
        title: '',
        createdAt: new Date(),
        lastActivity: Date.now()
      });
      
      // Configurar evento de fechamento
      page.on('close', () => {
        browserData.pages.delete(pageId);
      });
      
      return {
        success: true,
        browserId,
        pageId,
        message: 'Nova página criada com sucesso'
      };
    } catch (error) {
      console.error(`Erro ao criar nova página no navegador ${browserId}:`, error);
      throw error;
    }
  }

  // Fechar página
  async closePage(browserId, pageId) {
    try {
      const browserData = this.browsers.get(browserId);
      
      if (!browserData) {
        throw new Error('Navegador não encontrado');
      }
      
      const pageData = browserData.pages.get(pageId);
      
      if (!pageData) {
        throw new Error('Página não encontrada');
      }
      
      // Atualizar timestamp de última atividade
      browserData.lastActivity = Date.now();
      
      // Fechar página
      await pageData.page.close();
      
      // Remover do mapa
      browserData.pages.delete(pageId);
      
      return {
        success: true,
        message: 'Página fechada com sucesso'
      };
    } catch (error) {
      console.error(`Erro ao fechar página ${pageId} no navegador ${browserId}:`, error);
      throw error;
    }
  }

  // Navegar para URL
  async navigate(browserId, pageId, url) {
    try {
      const browserData = this.browsers.get(browserId);
      
      if (!browserData) {
        throw new Error('Navegador não encontrado');
      }
      
      const pageData = browserData.pages.get(pageId);
      
      if (!pageData) {
        throw new Error('Página não encontrada');
      }
      
      // Atualizar timestamp de última atividade
      browserData.lastActivity = Date.now();
      pageData.lastActivity = Date.now();
      
      // Navegar para URL
      const response = await pageData.page.goto(url, {
        waitUntil: 'networkidle2'
      });
      
      // Atualizar informações da página
      pageData.url = pageData.page.url();
      pageData.title = await pageData.page.title();
      
      return {
        success: true,
        url: pageData.url,
        title: pageData.title,
        status: response.status(),
        message: 'Navegação concluída com sucesso'
      };
    } catch (error) {
      console.error(`Erro ao navegar para ${url} na página ${pageId} do navegador ${browserId}:`, error);
      throw error;
    }
  }

  // Capturar screenshot
  async screenshot(browserId, pageId, options = {}) {
    try {
      const browserData = this.browsers.get(browserId);
      
      if (!browserData) {
        throw new Error('Navegador não encontrado');
      }
      
      const pageData = browserData.pages.get(pageId);
      
      if (!pageData) {
        throw new Error('Página não encontrada');
      }
      
      // Atualizar timestamp de última atividade
      browserData.lastActivity = Date.now();
      pageData.lastActivity = Date.now();
      
      // Gerar nome de arquivo
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = options.filename || `screenshot_${timestamp}.png`;
      const filepath = path.join(this.screenshotsDir, filename);
      
      // Capturar screenshot
      await pageData.page.screenshot({
        path: filepath,
        fullPage: options.fullPage === true,
        type: 'png',
        quality: options.quality || 80
      });
      
      return {
        success: true,
        filepath,
        message: 'Screenshot capturado com sucesso'
      };
    } catch (error) {
      console.error(`Erro ao capturar screenshot da página ${pageId} do navegador ${browserId}:`, error);
      throw error;
    }
  }

  // Clicar em elemento
  async click(browserId, pageId, selector, options = {}) {
    try {
      const browserData = this.browsers.get(browserId);
      
      if (!browserData) {
        throw new Error('Navegador não encontrado');
      }
      
      const pageData = browserData.pages.get(pageId);
      
      if (!pageData) {
        throw new Error('Página não encontrada');
      }
      
      // Atualizar timestamp de última atividade
      browserData.lastActivity = Date.now();
      pageData.lastActivity = Date.now();
      
      // Esperar pelo seletor
      await pageData.page.waitForSelector(selector, { timeout: options.timeout || 10000 });
      
      // Clicar no elemento
      await pageData.page.click(selector, {
        button: options.button || 'left',
        clickCount: options.clickCount || 1,
        delay: options.delay || 0
      });
      
      // Esperar por navegação, se solicitado
      if (options.waitForNavigation) {
        await pageData.page.waitForNavigation({ waitUntil: 'networkidle2' });
        
        // Atualizar informações da página
        pageData.url = pageData.page.url();
        pageData.title = await pageData.page.title();
      }
      
      return {
        success: true,
        url: pageData.url,
        title: pageData.title,
        message: 'Clique realizado com sucesso'
      };
    } catch (error) {
      console.error(`Erro ao clicar no elemento ${selector} na página ${pageId} do navegador ${browserId}:`, error);
      throw error;
    }
  }

  // Preencher campo
  async type(browserId, pageId, selector, text, options = {}) {
    try {
      const browserData = this.browsers.get(browserId);
      
      if (!browserData) {
        throw new Error('Navegador não encontrado');
      }
      
      const pageData = browserData.pages.get(pageId);
      
      if (!pageData) {
        throw new Error('Página não encontrada');
      }
      
      // Atualizar timestamp de última atividade
      browserData.lastActivity = Date.now();
      pageData.lastActivity = Date.now();
      
      // Esperar pelo seletor
      await pageData.page.waitForSelector(selector, { timeout: options.timeout || 10000 });
      
      // Limpar campo, se solicitado
      if (options.clear !== false) {
        await pageData.page.evaluate((sel) => {
          document.querySelector(sel).value = '';
        }, selector);
      }
      
      // Preencher campo
      await pageData.page.type(selector, text, {
        delay: options.delay || 50
      });
      
      // Pressionar Enter, se solicitado
      if (options.pressEnter) {
        await pageData.page.keyboard.press('Enter');
        
        // Esperar por navegação, se solicitado
        if (options.waitForNavigation) {
          await pageData.page.waitForNavigation({ waitUntil: 'networkidle2' });
          
          // Atualizar informações da página
          pageData.url = pageData.page.url();
          pageData.title = await pageData.page.title();
        }
      }
      
      return {
        success: true,
        message: 'Campo preenchido com sucesso'
      };
    } catch (error) {
      console.error(`Erro ao preencher campo ${selector} na página ${pageId} do navegador ${browserId}:`, error);
      throw error;
    }
  }

  // Selecionar opção em dropdown
  async select(browserId, pageId, selector, value, options = {}) {
    try {
      const browserData = this.browsers.get(browserId);
      
      if (!browserData) {
        throw new Error('Navegador não encontrado');
      }
      
      const pageData = browserData.pages.get(pageId);
      
      if (!pageData) {
        throw new Error('Página não encontrada');
      }
      
      // Atualizar timestamp de última atividade
      browserData.lastActivity = Date.now();
      pageData.lastActivity = Date.now();
      
      // Esperar pelo seletor
      await pageData.page.waitForSelector(selector, { timeout: options.timeout || 10000 });
      
      // Selecionar opção
      await pageData.page.select(selector, value);
      
      // Esperar por navegação, se solicitado
      if (options.waitForNavigation) {
        await pageData.page.waitForNavigation({ waitUntil: 'networkidle2' });
        
        // Atualizar informações da página
        pageData.url = pageData.page.url();
        pageData.title = await pageData.page.title();
      }
      
      return {
        success: true,
        message: 'Opção selecionada com sucesso'
      };
    } catch (error) {
      console.error(`Erro ao selecionar opção no elemento ${selector} na página ${pageId} do navegador ${browserId}:`, error);
      throw error;
    }
  }

  // Extrair texto
  async getText(browserId, pageId, selector) {
    try {
      const browserData = this.browsers.get(browserId);
      
      if (!browserData) {
        throw new Error('Navegador não encontrado');
      }
      
      const pageData = browserData.pages.get(pageId);
      
      if (!pageData) {
        throw new Error('Página não encontrada');
      }
      
      // Atualizar timestamp de última atividade
      browserData.lastActivity = Date.now();
      pageData.lastActivity = Date.now();
      
      // Esperar pelo seletor
      await pageData.page.waitForSelector(selector, { timeout: 10000 });
      
      // Extrair texto
      const text = await pageData.page.evaluate((sel) => {
        const element = document.querySelector(sel);
        return element ? element.textContent.trim() : '';
      }, selector);
      
      return {
        success: true,
        text,
        message: 'Texto extraído com sucesso'
      };
    } catch (error) {
      console.error(`Erro ao extrair texto do elemento ${selector} na página ${pageId} do navegador ${browserId}:`, error);
      throw error;
    }
  }

  // Extrair HTML
  async getHTML(browserId, pageId, selector) {
    try {
      const browserData = this.browsers.get(browserId);
      
      if (!browserData) {
        throw new Error('Navegador não encontrado');
      }
      
      const pageData = browserData.pages.get(pageId);
      
      if (!pageData) {
        throw new Error('Página não encontrada');
      }
      
      // Atualizar timestamp de última atividade
      browserData.lastActivity = Date.now();
      pageData.lastActivity = Date.now();
      
      // Extrair HTML
      let html;
      
      if (selector) {
        // Esperar pelo seletor
        await pageData.page.waitForSelector(selector, { timeout: 10000 });
        
        // Extrair HTML do elemento
        html = await pageData.page.evaluate((sel) => {
          const element = document.querySelector(sel);
          return element ? element.outerHTML : '';
        }, selector);
      } else {
        // Extrair HTML da página inteira
        html = await pageData.page.content();
      }
      
      return {
        success: true,
        html,
        message: 'HTML extraído com sucesso'
      };
    } catch (error) {
      console.error(`Erro ao extrair HTML ${selector ? `do elemento ${selector}` : 'da página'} ${pageId} do navegador ${browserId}:`, error);
      throw error;
    }
  }

  // Executar JavaScript
  async evaluate(browserId, pageId, script, args = []) {
    try {
      const browserData = this.browsers.get(browserId);
      
      if (!browserData) {
        throw new Error('Navegador não encontrado');
      }
      
      const pageData = browserData.pages.get(pageId);
      
      if (!pageData) {
        throw new Error('Página não encontrada');
      }
      
      // Atualizar timestamp de última atividade
      browserData.lastActivity = Date.now();
      pageData.lastActivity = Date.now();
      
      // Executar script
      const result = await pageData.page.evaluate(script, ...args);
      
      return {
        success: true,
        result,
        message: 'Script executado com sucesso'
      };
    } catch (error) {
      console.error(`Erro ao executar script na página ${pageId} do navegador ${browserId}:`, error);
      throw error;
    }
  }

  // Reconhecimento de texto em imagem (OCR)
  async recognizeText(imagePath) {
    try {
      // Verificar se o arquivo existe
      if (!fs.existsSync(imagePath)) {
        throw new Error('Arquivo de imagem não encontrado');
      }
      
      // Criar worker do Tesseract
      const worker = await createWorker();
      
      // Configurar idioma
      await worker.loadLanguage('por+eng');
      await worker.initialize('por+eng');
      
      // Reconhecer texto
      const { data } = await worker.recognize(imagePath);
      
      // Encerrar worker
      await worker.terminate();
      
      return {
        success: true,
        text: data.text,
        confidence: data.confidence,
        message: 'Texto reconhecido com sucesso'
      };
    } catch (error) {
      console.error(`Erro ao reconhecer texto na imagem ${imagePath}:`, error);
      throw error;
    }
  }

  // Capturar elemento e reconhecer texto
  async captureAndRecognizeText(browserId, pageId, selector) {
    try {
      const browserData = this.browsers.get(browserId);
      
      if (!browserData) {
        throw new Error('Navegador não encontrado');
      }
      
      const pageData = browserData.pages.get(pageId);
      
      if (!pageData) {
        throw new Error('Página não encontrada');
      }
      
      // Atualizar timestamp de última atividade
      browserData.lastActivity = Date.now();
      pageData.lastActivity = Date.now();
      
      // Esperar pelo seletor
      await pageData.page.waitForSelector(selector, { timeout: 10000 });
      
      // Capturar elemento
      const element = await pageData.page.$(selector);
      
      if (!element) {
        throw new Error('Elemento não encontrado');
      }
      
      // Gerar nome de arquivo
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `ocr_${timestamp}.png`;
      const filepath = path.join(this.screenshotsDir, filename);
      
      // Capturar screenshot do elemento
      await element.screenshot({
        path: filepath,
        type: 'png'
      });
      
      // Reconhecer texto
      const result = await this.recognizeText(filepath);
      
      return {
        success: true,
        filepath,
        text: result.text,
        confidence: result.confidence,
        message: 'Texto reconhecido com sucesso'
      };
    } catch (error) {
      console.error(`Erro ao capturar e reconhecer texto do elemento ${selector} na página ${pageId} do navegador ${browserId}:`, error);
      throw error;
    }
  }

  // Gravar sequência de ações
  async recordActions(browserId, pageId, actions) {
    try {
      const browserData = this.browsers.get(browserId);
      
      if (!browserData) {
        throw new Error('Navegador não encontrado');
      }
      
      const pageData = browserData.pages.get(pageId);
      
      if (!pageData) {
        throw new Error('Página não encontrada');
      }
      
      // Atualizar timestamp de última atividade
      browserData.lastActivity = Date.now();
      pageData.lastActivity = Date.now();
      
      // Validar ações
      if (!Array.isArray(actions) || actions.length === 0) {
        throw new Error('Lista de ações inválida');
      }
      
      // Gerar nome de arquivo
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `recording_${timestamp}.json`;
      const filepath = path.join(this.recordingsDir, filename);
      
      // Adicionar metadados
      const recording = {
        url: pageData.url,
        title: pageData.title,
        timestamp: new Date().toISOString(),
        actions
      };
      
      // Salvar gravação
      fs.writeFileSync(filepath, JSON.stringify(recording, null, 2));
      
      return {
        success: true,
        filepath,
        message: 'Sequência de ações gravada com sucesso'
      };
    } catch (error) {
      console.error(`Erro ao gravar sequência de ações na página ${pageId} do navegador ${browserId}:`, error);
      throw error;
    }
  }

  // Reproduzir sequência de ações
  async playRecording(browserId, pageId, recordingPath) {
    try {
      const browserData = this.browsers.get(browserId);
      
      if (!browserData) {
        throw new Error('Navegador não encontrado');
      }
      
      const pageData = browserData.pages.get(pageId);
      
      if (!pageData) {
        throw new Error('Página não encontrada');
      }
      
      // Atualizar timestamp de última atividade
      browserData.lastActivity = Date.now();
      pageData.lastActivity = Date.now();
      
      // Verificar se o arquivo existe
      if (!fs.existsSync(recordingPath)) {
        throw new Error('Arquivo de gravação não encontrado');
      }
      
      // Carregar gravação
      const recording = JSON.parse(fs.readFileSync(recordingPath, 'utf8'));
      
      // Validar gravação
      if (!recording.actions || !Array.isArray(recording.actions) || recording.actions.length === 0) {
        throw new Error('Formato de gravação inválido');
      }
      
      // Navegar para URL inicial, se diferente
      if (recording.url && recording.url !== pageData.url) {
        await this.navigate(browserId, pageId, recording.url);
      }
      
      // Executar ações
      const results = [];
      
      for (const action of recording.actions) {
        let result;
        
        switch (action.type) {
          case 'click':
            result = await this.click(browserId, pageId, action.selector, action.options);
            break;
            
          case 'type':
            result = await this.type(browserId, pageId, action.selector, action.text, action.options);
            break;
            
          case 'select':
            result = await this.select(browserId, pageId, action.selector, action.value, action.options);
            break;
            
          case 'navigate':
            result = await this.navigate(browserId, pageId, action.url);
            break;
            
          case 'wait':
            await new Promise(resolve => setTimeout(resolve, action.timeout || 1000));
            result = { success: true, message: 'Espera concluída' };
            break;
            
          case 'screenshot':
            result = await this.screenshot(browserId, pageId, action.options);
            break;
            
          default:
            result = { success: false, message: `Tipo de ação desconhecido: ${action.type}` };
        }
        
        results.push({
          action,
          result
        });
        
        // Interromper se alguma ação falhar
        if (!result.success) {
          break;
        }
      }
      
      return {
        success: results.every(r => r.result.success),
        results,
        message: results.every(r => r.result.success) 
          ? 'Sequência de ações reproduzida com sucesso' 
          : 'Falha ao reproduzir sequência de ações'
      };
    } catch (error) {
      console.error(`Erro ao reproduzir sequência de ações na página ${pageId} do navegador ${browserId}:`, error);
      throw error;
    }
  }

  // Limpar navegadores inativos
  async cleanupInactiveBrowsers(maxInactivityTime = 30 * 60 * 1000) { // 30 minutos
    try {
      const now = Date.now();
      let closedCount = 0;
      
      for (const [browserId, browserData] of this.browsers.entries()) {
        if (now - browserData.lastActivity > maxInactivityTime) {
          try {
            await this.closeBrowser(browserId);
            closedCount++;
          } catch (error) {
            console.error(`Erro ao fechar navegador inativo ${browserId}:`, error);
          }
        }
      }
      
      return {
        success: true,
        closedCount,
        message: `${closedCount} navegadores inativos fechados`
      };
    } catch (error) {
      console.error('Erro ao limpar navegadores inativos:', error);
      throw error;
    }
  }
}

module.exports = new WebAutomationService();
