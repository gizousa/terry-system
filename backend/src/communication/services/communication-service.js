// Serviço para comunicação via SMTP e WhatsApp
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');

class CommunicationService {
  constructor() {
    this.configDir = path.join(__dirname, '..', '..', '..', 'data', 'communication');
    this.templatesDir = path.join(this.configDir, 'templates');
    this.logsDir = path.join(this.configDir, 'logs');
    
    // Garantir que os diretórios existam
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
    
    if (!fs.existsSync(this.templatesDir)) {
      fs.mkdirSync(this.templatesDir, { recursive: true });
    }
    
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
    
    // Carregar configurações
    this.loadConfigurations();
  }

  // Carregar configurações
  loadConfigurations() {
    try {
      const configPath = path.join(this.configDir, 'config.json');
      
      if (fs.existsSync(configPath)) {
        this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      } else {
        // Configuração padrão
        this.config = {
          smtp: {},
          whatsapp: {},
          templates: {}
        };
        
        // Salva a configuração padrão
        fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
      }
    } catch (error) {
      console.error('Erro ao carregar configurações de comunicação:', error);
      this.config = {
        smtp: {},
        whatsapp: {},
        templates: {}
      };
    }
  }

  // Salvar configurações
  saveConfigurations() {
    try {
      const configPath = path.join(this.configDir, 'config.json');
      fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('Erro ao salvar configurações de comunicação:', error);
      throw error;
    }
  }

  // Configurar SMTP
  async configureSMTP(options) {
    try {
      const { host, port, secure, user, password, from, organizationId } = options;
      
      // Validação básica
      if (!host || !port || !user || !password || !from) {
        throw new Error('Dados obrigatórios não fornecidos');
      }
      
      // Criptografa a senha (implementação simplificada)
      const encryptedPassword = `encrypted:${password}`;
      
      // Cria a configuração SMTP
      const smtpConfig = {
        host,
        port: parseInt(port),
        secure: secure === true,
        auth: {
          user,
          password: encryptedPassword
        },
        from,
        organizationId
      };
      
      // Testa a conexão
      const testResult = await this.testSMTPConnection(smtpConfig);
      
      if (!testResult.success) {
        throw new Error(`Falha ao testar conexão SMTP: ${testResult.message}`);
      }
      
      // Salva a configuração
      if (organizationId) {
        // Configuração específica da organização
        if (!this.config.smtp.organizations) {
          this.config.smtp.organizations = {};
        }
        this.config.smtp.organizations[organizationId] = smtpConfig;
      } else {
        // Configuração global
        this.config.smtp.global = smtpConfig;
      }
      
      this.saveConfigurations();
      
      return {
        success: true,
        message: 'Configuração SMTP salva com sucesso',
        testResult
      };
    } catch (error) {
      console.error('Erro ao configurar SMTP:', error);
      throw error;
    }
  }

  // Testar conexão SMTP
  async testSMTPConnection(smtpConfig) {
    try {
      // Descriptografa a senha (implementação simplificada)
      const password = smtpConfig.auth.password.replace('encrypted:', '');
      
      // Cria o transportador
      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: {
          user: smtpConfig.auth.user,
          pass: password
        }
      });
      
      // Verifica a conexão
      await transporter.verify();
      
      return {
        success: true,
        message: 'Conexão SMTP estabelecida com sucesso'
      };
    } catch (error) {
      console.error('Erro ao testar conexão SMTP:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  // Configurar WhatsApp
  async configureWhatsApp(options) {
    try {
      const { apiKey, apiUrl, phoneNumberId, organizationId } = options;
      
      // Validação básica
      if (!apiKey || !apiUrl) {
        throw new Error('Dados obrigatórios não fornecidos');
      }
      
      // Criptografa a chave API (implementação simplificada)
      const encryptedApiKey = `encrypted:${apiKey}`;
      
      // Cria a configuração WhatsApp
      const whatsappConfig = {
        apiKey: encryptedApiKey,
        apiUrl,
        phoneNumberId,
        organizationId
      };
      
      // Testa a conexão
      const testResult = await this.testWhatsAppConnection(whatsappConfig);
      
      if (!testResult.success) {
        throw new Error(`Falha ao testar conexão WhatsApp: ${testResult.message}`);
      }
      
      // Salva a configuração
      if (organizationId) {
        // Configuração específica da organização
        if (!this.config.whatsapp.organizations) {
          this.config.whatsapp.organizations = {};
        }
        this.config.whatsapp.organizations[organizationId] = whatsappConfig;
      } else {
        // Configuração global
        this.config.whatsapp.global = whatsappConfig;
      }
      
      this.saveConfigurations();
      
      return {
        success: true,
        message: 'Configuração WhatsApp salva com sucesso',
        testResult
      };
    } catch (error) {
      console.error('Erro ao configurar WhatsApp:', error);
      throw error;
    }
  }

  // Testar conexão WhatsApp
  async testWhatsAppConnection(whatsappConfig) {
    try {
      // Descriptografa a chave API (implementação simplificada)
      const apiKey = whatsappConfig.apiKey.replace('encrypted:', '');
      
      // Faz uma requisição de teste para a API
      const response = await axios.get(`${whatsappConfig.apiUrl}/status`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200) {
        return {
          success: true,
          message: 'Conexão WhatsApp estabelecida com sucesso'
        };
      } else {
        return {
          success: false,
          message: `Resposta inesperada: ${response.status} ${response.statusText}`
        };
      }
    } catch (error) {
      console.error('Erro ao testar conexão WhatsApp:', error);
      return {
        success: false,
        message: error.response ? `${error.response.status} ${error.response.statusText}` : error.message
      };
    }
  }

  // Criar template de mensagem
  async createTemplate(options) {
    try {
      const { name, type, subject, content, organizationId } = options;
      
      // Validação básica
      if (!name || !type || !content) {
        throw new Error('Dados obrigatórios não fornecidos');
      }
      
      // Cria o template
      const template = {
        name,
        type,
        subject,
        content,
        organizationId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Salva o template
      const templatePath = path.join(this.templatesDir, `${name}.json`);
      fs.writeFileSync(templatePath, JSON.stringify(template, null, 2));
      
      // Atualiza a configuração
      if (!this.config.templates[type]) {
        this.config.templates[type] = [];
      }
      
      // Remove o template se já existir
      this.config.templates[type] = this.config.templates[type].filter(t => t.name !== name);
      
      // Adiciona o template
      this.config.templates[type].push({
        name,
        organizationId,
        path: templatePath
      });
      
      this.saveConfigurations();
      
      return {
        success: true,
        message: 'Template criado com sucesso',
        template
      };
    } catch (error) {
      console.error('Erro ao criar template:', error);
      throw error;
    }
  }

  // Listar templates
  async listTemplates(options = {}) {
    try {
      const { type, organizationId } = options;
      
      let templates = [];
      
      // Filtra por tipo
      if (type) {
        if (this.config.templates[type]) {
          templates = [...this.config.templates[type]];
        }
      } else {
        // Todos os templates
        Object.values(this.config.templates).forEach(typeTemplates => {
          templates = [...templates, ...typeTemplates];
        });
      }
      
      // Filtra por organização
      if (organizationId) {
        templates = templates.filter(t => !t.organizationId || t.organizationId === organizationId);
      }
      
      // Carrega o conteúdo dos templates
      const templatesWithContent = [];
      
      for (const template of templates) {
        try {
          const templatePath = template.path || path.join(this.templatesDir, `${template.name}.json`);
          if (fs.existsSync(templatePath)) {
            const templateData = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
            templatesWithContent.push(templateData);
          }
        } catch (error) {
          console.error(`Erro ao carregar template ${template.name}:`, error);
        }
      }
      
      return {
        success: true,
        templates: templatesWithContent
      };
    } catch (error) {
      console.error('Erro ao listar templates:', error);
      throw error;
    }
  }

  // Enviar e-mail
  async sendEmail(options) {
    try {
      const { to, subject, text, html, templateName, templateData, attachments, organizationId } = options;
      
      // Validação básica
      if ((!to || (!subject && !templateName)) || (!text && !html && !templateName)) {
        throw new Error('Dados obrigatórios não fornecidos');
      }
      
      // Determina a configuração SMTP a ser usada
      let smtpConfig;
      
      if (organizationId && this.config.smtp.organizations && this.config.smtp.organizations[organizationId]) {
        smtpConfig = this.config.smtp.organizations[organizationId];
      } else if (this.config.smtp.global) {
        smtpConfig = this.config.smtp.global;
      } else {
        throw new Error('Nenhuma configuração SMTP encontrada');
      }
      
      // Descriptografa a senha (implementação simplificada)
      const password = smtpConfig.auth.password.replace('encrypted:', '');
      
      // Cria o transportador
      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: {
          user: smtpConfig.auth.user,
          pass: password
        }
      });
      
      // Prepara o e-mail
      let mailOptions = {
        from: smtpConfig.from,
        to: Array.isArray(to) ? to.join(', ') : to
      };
      
      // Se um template foi especificado, carrega e processa o template
      if (templateName) {
        const template = await this.getTemplate(templateName);
        
        if (!template) {
          throw new Error(`Template ${templateName} não encontrado`);
        }
        
        // Processa o template
        const processedTemplate = this.processTemplate(template, templateData || {});
        
        mailOptions.subject = processedTemplate.subject || subject;
        mailOptions.html = processedTemplate.content;
        
        // Gera versão em texto do HTML
        if (!text) {
          mailOptions.text = this.htmlToText(processedTemplate.content);
        } else {
          mailOptions.text = text;
        }
      } else {
        // Usa os dados fornecidos diretamente
        mailOptions.subject = subject;
        
        if (html) {
          mailOptions.html = html;
          
          // Gera versão em texto do HTML se não fornecido
          if (!text) {
            mailOptions.text = this.htmlToText(html);
          } else {
            mailOptions.text = text;
          }
        } else {
          mailOptions.text = text;
        }
      }
      
      // Adiciona anexos, se houver
      if (attachments && attachments.length > 0) {
        mailOptions.attachments = attachments.map(attachment => {
          if (typeof attachment === 'string') {
            // Assume que é um caminho de arquivo
            return {
              path: attachment
            };
          } else {
            // Assume que é um objeto de anexo completo
            return attachment;
          }
        });
      }
      
      // Envia o e-mail
      const info = await transporter.sendMail(mailOptions);
      
      // Registra o envio
      this.logCommunication({
        type: 'email',
        to,
        subject: mailOptions.subject,
        templateName,
        messageId: info.messageId,
        timestamp: new Date().toISOString(),
        organizationId
      });
      
      return {
        success: true,
        messageId: info.messageId,
        info
      };
    } catch (error) {
      console.error('Erro ao enviar e-mail:', error);
      throw error;
    }
  }

  // Enviar mensagem WhatsApp
  async sendWhatsApp(options) {
    try {
      const { to, message, templateName, templateData, attachmentUrl, organizationId } = options;
      
      // Validação básica
      if (!to || (!message && !templateName)) {
        throw new Error('Dados obrigatórios não fornecidos');
      }
      
      // Determina a configuração WhatsApp a ser usada
      let whatsappConfig;
      
      if (organizationId && this.config.whatsapp.organizations && this.config.whatsapp.organizations[organizationId]) {
        whatsappConfig = this.config.whatsapp.organizations[organizationId];
      } else if (this.config.whatsapp.global) {
        whatsappConfig = this.config.whatsapp.global;
      } else {
        throw new Error('Nenhuma configuração WhatsApp encontrada');
      }
      
      // Descriptografa a chave API (implementação simplificada)
      const apiKey = whatsappConfig.apiKey.replace('encrypted:', '');
      
      // Prepara a mensagem
      let messageContent;
      
      // Se um template foi especificado, carrega e processa o template
      if (templateName) {
        const template = await this.getTemplate(templateName);
        
        if (!template) {
          throw new Error(`Template ${templateName} não encontrado`);
        }
        
        // Processa o template
        const processedTemplate = this.processTemplate(template, templateData || {});
        
        // Remove tags HTML para WhatsApp
        messageContent = this.htmlToText(processedTemplate.content);
      } else {
        // Usa a mensagem fornecida diretamente
        messageContent = message;
      }
      
      // Prepara o payload da requisição
      const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to.replace(/\D/g, ''), // Remove caracteres não numéricos
        type: "text",
        text: {
          body: messageContent
        }
      };
      
      // Se houver anexo, adiciona ao payload
      if (attachmentUrl) {
        payload.type = "image"; // ou "document", "audio", "video" dependendo do tipo
        delete payload.text;
        payload.image = {
          link: attachmentUrl
        };
      }
      
      // Envia a mensagem
      const response = await axios.post(`${whatsappConfig.apiUrl}/messages`, payload, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Registra o envio
      this.logCommunication({
        type: 'whatsapp',
        to,
        message: messageContent,
        templateName,
        messageId: response.data.messages ? response.data.messages[0].id : null,
        timestamp: new Date().toISOString(),
        organizationId
      });
      
      return {
        success: true,
        messageId: response.data.messages ? response.data.messages[0].id : null,
        response: response.data
      };
    } catch (error) {
      console.error('Erro ao enviar mensagem WhatsApp:', error);
      throw error;
    }
  }

  // Obter template
  async getTemplate(templateName) {
    try {
      const templatePath = path.join(this.templatesDir, `${templateName}.json`);
      
      if (!fs.existsSync(templatePath)) {
        return null;
      }
      
      return JSON.parse(fs.readFileSync(templatePath, 'utf8'));
    } catch (error) {
      console.error(`Erro ao obter template ${templateName}:`, error);
      return null;
    }
  }

  // Processar template
  processTemplate(template, data) {
    try {
      let content = template.content;
      let subject = template.subject;
      
      // Substitui variáveis no conteúdo
      Object.entries(data).forEach(([key, value]) => {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        content = content.replace(regex, value);
      });
      
      // Substitui variáveis no assunto
      if (subject) {
        Object.entries(data).forEach(([key, value]) => {
          const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
          subject = subject.replace(regex, value);
        });
      }
      
      return {
        ...template,
        content,
        subject
      };
    } catch (error) {
      console.error('Erro ao processar template:', error);
      return template;
    }
  }

  // Converter HTML para texto
  htmlToText(html) {
    // Implementação simplificada
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p\s*\/?>/gi, '\n')
      .replace(/<div\s*\/?>/gi, '\n')
      .replace(/<li\s*\/?>/gi, '\n- ')
      .replace(/<\/li>/gi, '')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  }

  // Registrar comunicação
  logCommunication(logData) {
    try {
      const logFilename = `${logData.type}_${new Date().toISOString().split('T')[0]}.log`;
      const logPath = path.join(this.logsDir, logFilename);
      
      const logEntry = JSON.stringify({
        ...logData,
        id: crypto.randomUUID()
      }) + '\n';
      
      fs.appendFileSync(logPath, logEntry);
    } catch (error) {
      console.error('Erro ao registrar comunicação:', error);
    }
  }

  // Obter logs de comunicação
  async getLogs(options = {}) {
    try {
      const { type, date, organizationId, limit = 100 } = options;
      
      // Determina o arquivo de log a ser lido
      let logFilename;
      
      if (date) {
        logFilename = `${type || 'email'}_${date}.log`;
      } else {
        logFilename = `${type || 'email'}_${new Date().toISOString().split('T')[0]}.log`;
      }
      
      const logPath = path.join(this.logsDir, logFilename);
      
      if (!fs.existsSync(logPath)) {
        return {
          success: true,
          logs: []
        };
      }
      
      // Lê o arquivo de log
      const logContent = fs.readFileSync(logPath, 'utf8');
      
      // Processa as entradas de log
      const logs = logContent
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line))
        .filter(log => !organizationId || log.organizationId === organizationId)
        .slice(-limit);
      
      return {
        success: true,
        logs
      };
    } catch (error) {
      console.error('Erro ao obter logs de comunicação:', error);
      throw error;
    }
  }
}

module.exports = new CommunicationService();
