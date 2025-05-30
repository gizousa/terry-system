// Serviço para integração com WhatsApp (EvolutionAPI e API Oficial)
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class WhatsAppService {
  constructor() {
    this.configDir = path.join(__dirname, '..', '..', '..', 'data', 'communication', 'whatsapp');
    this.logsDir = path.join(this.configDir, 'logs');
    
    // Garantir que os diretórios existam
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
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
          providers: {
            evolution: {},
            official: {}
          },
          organizations: {}
        };
        
        // Salva a configuração padrão
        fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
      }
    } catch (error) {
      console.error('Erro ao carregar configurações do WhatsApp:', error);
      this.config = {
        providers: {
          evolution: {},
          official: {}
        },
        organizations: {}
      };
    }
  }

  // Salvar configurações
  saveConfigurations() {
    try {
      const configPath = path.join(this.configDir, 'config.json');
      fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('Erro ao salvar configurações do WhatsApp:', error);
      throw error;
    }
  }

  // Configurar EvolutionAPI
  async configureEvolutionAPI(options) {
    try {
      const { apiUrl, apiKey, instanceName, organizationId } = options;
      
      // Validação básica
      if (!apiUrl || !apiKey) {
        throw new Error('URL da API e chave API são obrigatórios');
      }
      
      // Criptografa a chave API (implementação simplificada)
      const encryptedApiKey = this.encryptSecret(apiKey);
      
      // Cria a configuração
      const config = {
        apiUrl: apiUrl.trim(),
        apiKey: encryptedApiKey,
        instanceName: instanceName || 'terry',
        type: 'evolution',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Testa a conexão
      const testResult = await this.testEvolutionAPIConnection(config);
      
      if (!testResult.success) {
        throw new Error(`Falha ao testar conexão com EvolutionAPI: ${testResult.message}`);
      }
      
      // Salva a configuração
      if (organizationId) {
        // Configuração específica da organização
        if (!this.config.organizations[organizationId]) {
          this.config.organizations[organizationId] = {};
        }
        this.config.organizations[organizationId].evolution = config;
      } else {
        // Configuração global
        this.config.providers.evolution = config;
      }
      
      this.saveConfigurations();
      
      return {
        success: true,
        message: 'Configuração EvolutionAPI salva com sucesso',
        testResult
      };
    } catch (error) {
      console.error('Erro ao configurar EvolutionAPI:', error);
      throw error;
    }
  }

  // Testar conexão com EvolutionAPI
  async testEvolutionAPIConnection(config) {
    try {
      // Descriptografa a chave API
      const apiKey = this.decryptSecret(config.apiKey);
      
      // Faz uma requisição de teste para a API
      const response = await axios.get(`${config.apiUrl}/instance/info`, {
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json'
        },
        params: {
          instance: config.instanceName
        }
      });
      
      if (response.status === 200) {
        return {
          success: true,
          message: 'Conexão com EvolutionAPI estabelecida com sucesso',
          data: response.data
        };
      } else {
        return {
          success: false,
          message: `Resposta inesperada: ${response.status} ${response.statusText}`
        };
      }
    } catch (error) {
      console.error('Erro ao testar conexão com EvolutionAPI:', error);
      return {
        success: false,
        message: error.response ? `${error.response.status} ${error.response.statusText}` : error.message
      };
    }
  }

  // Configurar API Oficial do WhatsApp
  async configureOfficialAPI(options) {
    try {
      const { accessToken, phoneNumberId, businessAccountId, webhookSecret, organizationId } = options;
      
      // Validação básica
      if (!accessToken || !phoneNumberId) {
        throw new Error('Token de acesso e ID do número de telefone são obrigatórios');
      }
      
      // Criptografa o token de acesso (implementação simplificada)
      const encryptedAccessToken = this.encryptSecret(accessToken);
      
      // Cria a configuração
      const config = {
        accessToken: encryptedAccessToken,
        phoneNumberId,
        businessAccountId,
        webhookSecret: webhookSecret ? this.encryptSecret(webhookSecret) : null,
        type: 'official',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Testa a conexão
      const testResult = await this.testOfficialAPIConnection(config);
      
      if (!testResult.success) {
        throw new Error(`Falha ao testar conexão com API Oficial: ${testResult.message}`);
      }
      
      // Salva a configuração
      if (organizationId) {
        // Configuração específica da organização
        if (!this.config.organizations[organizationId]) {
          this.config.organizations[organizationId] = {};
        }
        this.config.organizations[organizationId].official = config;
      } else {
        // Configuração global
        this.config.providers.official = config;
      }
      
      this.saveConfigurations();
      
      return {
        success: true,
        message: 'Configuração API Oficial salva com sucesso',
        testResult
      };
    } catch (error) {
      console.error('Erro ao configurar API Oficial:', error);
      throw error;
    }
  }

  // Testar conexão com API Oficial
  async testOfficialAPIConnection(config) {
    try {
      // Descriptografa o token de acesso
      const accessToken = this.decryptSecret(config.accessToken);
      
      // Faz uma requisição de teste para a API
      const response = await axios.get(`https://graph.facebook.com/v17.0/${config.phoneNumberId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200) {
        return {
          success: true,
          message: 'Conexão com API Oficial estabelecida com sucesso',
          data: response.data
        };
      } else {
        return {
          success: false,
          message: `Resposta inesperada: ${response.status} ${response.statusText}`
        };
      }
    } catch (error) {
      console.error('Erro ao testar conexão com API Oficial:', error);
      return {
        success: false,
        message: error.response ? `${error.response.status} ${error.response.statusText}` : error.message
      };
    }
  }

  // Enviar mensagem via EvolutionAPI
  async sendMessageEvolution(options) {
    try {
      const { to, message, mediaUrl, mediaType, caption, organizationId } = options;
      
      // Validação básica
      if (!to || (!message && !mediaUrl)) {
        throw new Error('Destinatário e mensagem ou mídia são obrigatórios');
      }
      
      // Determina a configuração a ser usada
      let config;
      
      if (organizationId && this.config.organizations[organizationId] && this.config.organizations[organizationId].evolution) {
        config = this.config.organizations[organizationId].evolution;
      } else if (this.config.providers.evolution && Object.keys(this.config.providers.evolution).length > 0) {
        config = this.config.providers.evolution;
      } else {
        throw new Error('Nenhuma configuração EvolutionAPI encontrada');
      }
      
      // Descriptografa a chave API
      const apiKey = this.decryptSecret(config.apiKey);
      
      // Formata o número de telefone (remove caracteres não numéricos)
      const formattedNumber = to.replace(/\D/g, '');
      
      // Prepara o payload da requisição
      let endpoint = `${config.apiUrl}/message/text`;
      let payload = {
        instance: config.instanceName,
        to: formattedNumber
      };
      
      // Se for mensagem de texto
      if (message && !mediaUrl) {
        payload.text = message;
      } 
      // Se for mensagem de mídia
      else if (mediaUrl) {
        switch (mediaType) {
          case 'image':
            endpoint = `${config.apiUrl}/message/image`;
            payload.image = mediaUrl;
            if (caption) payload.caption = caption;
            break;
          case 'video':
            endpoint = `${config.apiUrl}/message/video`;
            payload.video = mediaUrl;
            if (caption) payload.caption = caption;
            break;
          case 'audio':
            endpoint = `${config.apiUrl}/message/audio`;
            payload.audio = mediaUrl;
            break;
          case 'document':
            endpoint = `${config.apiUrl}/message/document`;
            payload.document = mediaUrl;
            if (caption) payload.caption = caption;
            break;
          default:
            endpoint = `${config.apiUrl}/message/text`;
            payload.text = message || 'Arquivo anexado';
        }
      }
      
      // Envia a mensagem
      const response = await axios.post(endpoint, payload, {
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      // Registra o envio
      this.logMessage({
        provider: 'evolution',
        to: formattedNumber,
        message: message || caption || 'Mídia sem legenda',
        mediaUrl,
        mediaType,
        status: response.status === 200 ? 'sent' : 'failed',
        response: response.data,
        timestamp: new Date().toISOString(),
        organizationId
      });
      
      return {
        success: response.status === 200,
        message: response.status === 200 ? 'Mensagem enviada com sucesso' : 'Falha ao enviar mensagem',
        data: response.data
      };
    } catch (error) {
      console.error('Erro ao enviar mensagem via EvolutionAPI:', error);
      
      // Registra a falha
      if (options.to) {
        this.logMessage({
          provider: 'evolution',
          to: options.to.replace(/\D/g, ''),
          message: options.message || options.caption || 'Mídia sem legenda',
          mediaUrl: options.mediaUrl,
          mediaType: options.mediaType,
          status: 'failed',
          error: error.message,
          timestamp: new Date().toISOString(),
          organizationId: options.organizationId
        });
      }
      
      throw error;
    }
  }

  // Enviar mensagem via API Oficial
  async sendMessageOfficial(options) {
    try {
      const { to, message, mediaUrl, mediaType, caption, organizationId } = options;
      
      // Validação básica
      if (!to || (!message && !mediaUrl)) {
        throw new Error('Destinatário e mensagem ou mídia são obrigatórios');
      }
      
      // Determina a configuração a ser usada
      let config;
      
      if (organizationId && this.config.organizations[organizationId] && this.config.organizations[organizationId].official) {
        config = this.config.organizations[organizationId].official;
      } else if (this.config.providers.official && Object.keys(this.config.providers.official).length > 0) {
        config = this.config.providers.official;
      } else {
        throw new Error('Nenhuma configuração API Oficial encontrada');
      }
      
      // Descriptografa o token de acesso
      const accessToken = this.decryptSecret(config.accessToken);
      
      // Formata o número de telefone (remove caracteres não numéricos)
      const formattedNumber = to.replace(/\D/g, '');
      
      // Prepara o payload da requisição
      let payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedNumber
      };
      
      // Se for mensagem de texto
      if (message && !mediaUrl) {
        payload.type = "text";
        payload.text = {
          body: message
        };
      } 
      // Se for mensagem de mídia
      else if (mediaUrl) {
        switch (mediaType) {
          case 'image':
            payload.type = "image";
            payload.image = {
              link: mediaUrl,
              caption: caption || ''
            };
            break;
          case 'video':
            payload.type = "video";
            payload.video = {
              link: mediaUrl,
              caption: caption || ''
            };
            break;
          case 'audio':
            payload.type = "audio";
            payload.audio = {
              link: mediaUrl
            };
            break;
          case 'document':
            payload.type = "document";
            payload.document = {
              link: mediaUrl,
              caption: caption || ''
            };
            break;
          default:
            payload.type = "text";
            payload.text = {
              body: message || 'Arquivo anexado'
            };
        }
      }
      
      // Envia a mensagem
      const response = await axios.post(`https://graph.facebook.com/v17.0/${config.phoneNumberId}/messages`, payload, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Registra o envio
      this.logMessage({
        provider: 'official',
        to: formattedNumber,
        message: message || caption || 'Mídia sem legenda',
        mediaUrl,
        mediaType,
        status: response.status === 200 ? 'sent' : 'failed',
        response: response.data,
        timestamp: new Date().toISOString(),
        organizationId
      });
      
      return {
        success: response.status === 200,
        message: response.status === 200 ? 'Mensagem enviada com sucesso' : 'Falha ao enviar mensagem',
        data: response.data
      };
    } catch (error) {
      console.error('Erro ao enviar mensagem via API Oficial:', error);
      
      // Registra a falha
      if (options.to) {
        this.logMessage({
          provider: 'official',
          to: options.to.replace(/\D/g, ''),
          message: options.message || options.caption || 'Mídia sem legenda',
          mediaUrl: options.mediaUrl,
          mediaType: options.mediaType,
          status: 'failed',
          error: error.message,
          timestamp: new Date().toISOString(),
          organizationId: options.organizationId
        });
      }
      
      throw error;
    }
  }

  // Enviar mensagem (seleciona automaticamente o provedor)
  async sendMessage(options) {
    try {
      const { provider, organizationId } = options;
      
      // Se o provedor for especificado, usa-o
      if (provider === 'evolution') {
        return await this.sendMessageEvolution(options);
      } else if (provider === 'official') {
        return await this.sendMessageOfficial(options);
      }
      
      // Caso contrário, tenta determinar qual provedor usar
      let evolutionAvailable = false;
      let officialAvailable = false;
      
      // Verifica se há configuração para a organização
      if (organizationId && this.config.organizations[organizationId]) {
        evolutionAvailable = !!this.config.organizations[organizationId].evolution;
        officialAvailable = !!this.config.organizations[organizationId].official;
      }
      
      // Se não houver configuração específica, verifica a global
      if (!evolutionAvailable && !officialAvailable) {
        evolutionAvailable = !!this.config.providers.evolution && Object.keys(this.config.providers.evolution).length > 0;
        officialAvailable = !!this.config.providers.official && Object.keys(this.config.providers.official).length > 0;
      }
      
      // Tenta enviar pela API Oficial primeiro, se disponível
      if (officialAvailable) {
        try {
          return await this.sendMessageOfficial(options);
        } catch (error) {
          console.warn('Falha ao enviar via API Oficial, tentando EvolutionAPI:', error.message);
          
          // Se EvolutionAPI também estiver disponível, tenta como fallback
          if (evolutionAvailable) {
            return await this.sendMessageEvolution(options);
          } else {
            throw error;
          }
        }
      } 
      // Se apenas EvolutionAPI estiver disponível
      else if (evolutionAvailable) {
        return await this.sendMessageEvolution(options);
      } 
      // Nenhum provedor disponível
      else {
        throw new Error('Nenhum provedor WhatsApp configurado');
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem WhatsApp:', error);
      throw error;
    }
  }

  // Registrar mensagem
  logMessage(data) {
    try {
      const logFile = path.join(this.logsDir, `messages_${new Date().toISOString().split('T')[0]}.log`);
      const logEntry = JSON.stringify({
        ...data,
        timestamp: new Date().toISOString()
      }) + '\n';
      
      fs.appendFileSync(logFile, logEntry);
    } catch (error) {
      console.error('Erro ao registrar mensagem:', error);
    }
  }

  // Criptografar segredo
  encryptSecret(secret) {
    // Implementação simplificada - em produção, use uma solução mais robusta
    return `encrypted:${secret}`;
  }

  // Descriptografar segredo
  decryptSecret(encryptedSecret) {
    // Implementação simplificada - em produção, use uma solução mais robusta
    return encryptedSecret.replace('encrypted:', '');
  }

  // Listar provedores configurados
  listProviders(organizationId) {
    try {
      const providers = [];
      
      // Verifica provedores globais
      if (this.config.providers.evolution && Object.keys(this.config.providers.evolution).length > 0) {
        providers.push({
          type: 'evolution',
          scope: 'global',
          apiUrl: this.config.providers.evolution.apiUrl,
          instanceName: this.config.providers.evolution.instanceName,
          createdAt: this.config.providers.evolution.createdAt
        });
      }
      
      if (this.config.providers.official && Object.keys(this.config.providers.official).length > 0) {
        providers.push({
          type: 'official',
          scope: 'global',
          phoneNumberId: this.config.providers.official.phoneNumberId,
          businessAccountId: this.config.providers.official.businessAccountId,
          createdAt: this.config.providers.official.createdAt
        });
      }
      
      // Se organizationId for fornecido, verifica provedores específicos
      if (organizationId && this.config.organizations[organizationId]) {
        if (this.config.organizations[organizationId].evolution) {
          providers.push({
            type: 'evolution',
            scope: 'organization',
            organizationId,
            apiUrl: this.config.organizations[organizationId].evolution.apiUrl,
            instanceName: this.config.organizations[organizationId].evolution.instanceName,
            createdAt: this.config.organizations[organizationId].evolution.createdAt
          });
        }
        
        if (this.config.organizations[organizationId].official) {
          providers.push({
            type: 'official',
            scope: 'organization',
            organizationId,
            phoneNumberId: this.config.organizations[organizationId].official.phoneNumberId,
            businessAccountId: this.config.organizations[organizationId].official.businessAccountId,
            createdAt: this.config.organizations[organizationId].official.createdAt
          });
        }
      }
      
      return {
        success: true,
        providers
      };
    } catch (error) {
      console.error('Erro ao listar provedores:', error);
      throw error;
    }
  }
}

module.exports = new WhatsAppService();
