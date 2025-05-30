// Serviço para monitoramento em tempo real
const WebSocket = require('ws');
const http = require('http');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

class RealTimeMonitoringService {
  constructor() {
    this.clients = new Map(); // Mapa de clientes conectados
    this.sessions = new Map(); // Mapa de sessões de automação ativas
    this.logsDir = path.join(__dirname, '..', '..', '..', 'data', 'logs');
    
    // Garantir que o diretório de logs exista
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  // Inicializar o servidor WebSocket
  initialize(server) {
    try {
      // Criar servidor WebSocket
      this.wss = new WebSocket.Server({ server });
      
      // Configurar eventos
      this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));
      
      console.log('Servidor WebSocket inicializado com sucesso');
      
      // Iniciar limpeza periódica de clientes inativos
      setInterval(() => this.cleanupInactiveClients(), 30000);
      
      return true;
    } catch (error) {
      console.error('Erro ao inicializar servidor WebSocket:', error);
      return false;
    }
  }

  // Lidar com nova conexão
  handleConnection(ws, req) {
    try {
      // Extrair token da URL
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token');
      
      if (!token) {
        ws.close(4001, 'Token não fornecido');
        return;
      }
      
      // Verificar token
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
      } catch (error) {
        ws.close(4002, 'Token inválido');
        return;
      }
      
      // Gerar ID único para o cliente
      const clientId = crypto.randomUUID();
      
      // Armazenar informações do cliente
      this.clients.set(clientId, {
        ws,
        userId: decoded.id,
        organizationId: decoded.organizationId,
        role: decoded.role,
        lastActivity: Date.now()
      });
      
      // Configurar eventos do WebSocket
      ws.on('message', (message) => this.handleMessage(clientId, message));
      ws.on('close', () => this.handleClose(clientId));
      ws.on('error', (error) => this.handleError(clientId, error));
      
      // Enviar confirmação de conexão
      this.sendToClient(clientId, {
        type: 'connection',
        status: 'connected',
        clientId,
        timestamp: new Date().toISOString()
      });
      
      // Registrar conexão
      console.log(`Cliente conectado: ${clientId}`);
      this.logEvent('connection', {
        clientId,
        userId: decoded.id,
        organizationId: decoded.organizationId,
        role: decoded.role,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao lidar com conexão WebSocket:', error);
      ws.close(4000, 'Erro interno do servidor');
    }
  }

  // Lidar com mensagem recebida
  handleMessage(clientId, message) {
    try {
      const client = this.clients.get(clientId);
      if (!client) {
        return;
      }
      
      // Atualizar timestamp de última atividade
      client.lastActivity = Date.now();
      
      // Processar mensagem
      let parsedMessage;
      try {
        parsedMessage = JSON.parse(message);
      } catch (error) {
        this.sendToClient(clientId, {
          type: 'error',
          message: 'Formato de mensagem inválido',
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      // Processar comando
      switch (parsedMessage.type) {
        case 'ping':
          this.sendToClient(clientId, {
            type: 'pong',
            timestamp: new Date().toISOString()
          });
          break;
          
        case 'subscribe':
          this.handleSubscribe(clientId, parsedMessage);
          break;
          
        case 'unsubscribe':
          this.handleUnsubscribe(clientId, parsedMessage);
          break;
          
        default:
          this.sendToClient(clientId, {
            type: 'error',
            message: 'Tipo de mensagem desconhecido',
            timestamp: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error(`Erro ao processar mensagem do cliente ${clientId}:`, error);
    }
  }

  // Lidar com fechamento de conexão
  handleClose(clientId) {
    try {
      const client = this.clients.get(clientId);
      if (!client) {
        return;
      }
      
      // Registrar desconexão
      console.log(`Cliente desconectado: ${clientId}`);
      this.logEvent('disconnection', {
        clientId,
        userId: client.userId,
        organizationId: client.organizationId,
        timestamp: new Date().toISOString()
      });
      
      // Remover cliente
      this.clients.delete(clientId);
    } catch (error) {
      console.error(`Erro ao lidar com fechamento de conexão do cliente ${clientId}:`, error);
    }
  }

  // Lidar com erro de conexão
  handleError(clientId, error) {
    try {
      console.error(`Erro na conexão WebSocket do cliente ${clientId}:`, error);
      
      const client = this.clients.get(clientId);
      if (!client) {
        return;
      }
      
      // Registrar erro
      this.logEvent('error', {
        clientId,
        userId: client.userId,
        organizationId: client.organizationId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Erro ao lidar com erro de conexão do cliente ${clientId}:`, error);
    }
  }

  // Lidar com inscrição em tópico
  handleSubscribe(clientId, message) {
    try {
      const client = this.clients.get(clientId);
      if (!client) {
        return;
      }
      
      const { topic, params } = message;
      
      // Verificar permissão para o tópico
      if (!this.canAccessTopic(client, topic, params)) {
        this.sendToClient(clientId, {
          type: 'error',
          message: 'Acesso negado ao tópico',
          topic,
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      // Adicionar tópico à lista de inscrições do cliente
      if (!client.subscriptions) {
        client.subscriptions = new Set();
      }
      
      const subscriptionKey = this.getSubscriptionKey(topic, params);
      client.subscriptions.add(subscriptionKey);
      
      // Confirmar inscrição
      this.sendToClient(clientId, {
        type: 'subscribed',
        topic,
        params,
        timestamp: new Date().toISOString()
      });
      
      // Enviar estado atual do tópico, se disponível
      this.sendTopicState(clientId, topic, params);
    } catch (error) {
      console.error(`Erro ao processar inscrição do cliente ${clientId}:`, error);
    }
  }

  // Lidar com cancelamento de inscrição
  handleUnsubscribe(clientId, message) {
    try {
      const client = this.clients.get(clientId);
      if (!client) {
        return;
      }
      
      const { topic, params } = message;
      
      // Remover tópico da lista de inscrições do cliente
      if (client.subscriptions) {
        const subscriptionKey = this.getSubscriptionKey(topic, params);
        client.subscriptions.delete(subscriptionKey);
      }
      
      // Confirmar cancelamento de inscrição
      this.sendToClient(clientId, {
        type: 'unsubscribed',
        topic,
        params,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Erro ao processar cancelamento de inscrição do cliente ${clientId}:`, error);
    }
  }

  // Verificar se cliente pode acessar tópico
  canAccessTopic(client, topic, params) {
    // Super Admin pode acessar qualquer tópico
    if (client.role === 'super_admin') {
      return true;
    }
    
    // Verificar acesso com base no tópico e parâmetros
    switch (topic) {
      case 'automation':
        // Verificar se a automação pertence à organização do cliente
        return params && params.organizationId === client.organizationId;
        
      case 'llm':
        // Verificar se o uso de LLM pertence à organização do cliente
        return params && params.organizationId === client.organizationId;
        
      case 'development':
        // Verificar se o projeto pertence à organização do cliente
        return params && params.organizationId === client.organizationId;
        
      case 'support':
        // Verificar se o ticket pertence à organização do cliente
        return params && params.organizationId === client.organizationId;
        
      case 'system':
        // Apenas Super Admin pode acessar tópicos do sistema
        return client.role === 'super_admin';
        
      default:
        return false;
    }
  }

  // Obter chave de inscrição
  getSubscriptionKey(topic, params) {
    if (!params) {
      return topic;
    }
    
    return `${topic}:${JSON.stringify(params)}`;
  }

  // Enviar estado atual do tópico
  sendTopicState(clientId, topic, params) {
    try {
      const client = this.clients.get(clientId);
      if (!client) {
        return;
      }
      
      // Obter estado atual com base no tópico
      let state;
      
      switch (topic) {
        case 'automation':
          if (params && params.sessionId) {
            state = this.getAutomationState(params.sessionId);
          }
          break;
          
        case 'llm':
          if (params && params.providerId) {
            state = this.getLLMState(params.providerId);
          }
          break;
          
        case 'development':
          if (params && params.projectId) {
            state = this.getProjectState(params.projectId);
          }
          break;
          
        case 'support':
          if (params && params.ticketId) {
            state = this.getTicketState(params.ticketId);
          }
          break;
          
        case 'system':
          state = this.getSystemState();
          break;
      }
      
      if (state) {
        this.sendToClient(clientId, {
          type: 'state',
          topic,
          params,
          state,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error(`Erro ao enviar estado do tópico para o cliente ${clientId}:`, error);
    }
  }

  // Obter estado de sessão de automação
  getAutomationState(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }
    
    return {
      id: sessionId,
      status: session.status,
      currentStep: session.currentStep,
      progress: session.progress,
      startTime: session.startTime,
      lastActivity: session.lastActivity,
      logs: session.logs ? session.logs.slice(-10) : []
    };
  }

  // Obter estado de provedor LLM
  getLLMState(providerId) {
    // Implementação simplificada
    return {
      id: providerId,
      status: 'active',
      requestCount: Math.floor(Math.random() * 100),
      lastRequest: new Date().toISOString()
    };
  }

  // Obter estado de projeto
  getProjectState(projectId) {
    // Implementação simplificada
    return {
      id: projectId,
      status: 'in_progress',
      currentStage: 'implementation',
      progress: 65,
      lastActivity: new Date().toISOString()
    };
  }

  // Obter estado de ticket
  getTicketState(ticketId) {
    // Implementação simplificada
    return {
      id: ticketId,
      status: 'open',
      priority: 'medium',
      lastActivity: new Date().toISOString()
    };
  }

  // Obter estado do sistema
  getSystemState() {
    // Implementação simplificada
    return {
      status: 'online',
      activeClients: this.clients.size,
      activeSessions: this.sessions.size,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024
    };
  }

  // Enviar mensagem para cliente específico
  sendToClient(clientId, message) {
    try {
      const client = this.clients.get(clientId);
      if (!client || client.ws.readyState !== WebSocket.OPEN) {
        return false;
      }
      
      client.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`Erro ao enviar mensagem para o cliente ${clientId}:`, error);
      return false;
    }
  }

  // Publicar evento para todos os clientes inscritos em um tópico
  publishEvent(topic, params, data) {
    try {
      // Preparar mensagem
      const message = {
        type: 'event',
        topic,
        params,
        data,
        timestamp: new Date().toISOString()
      };
      
      // Obter chave de inscrição
      const subscriptionKey = this.getSubscriptionKey(topic, params);
      
      // Enviar para todos os clientes inscritos
      let sentCount = 0;
      
      for (const [clientId, client] of this.clients.entries()) {
        if (client.subscriptions && client.subscriptions.has(subscriptionKey) && 
            this.canAccessTopic(client, topic, params)) {
          if (this.sendToClient(clientId, message)) {
            sentCount++;
          }
        }
      }
      
      // Registrar evento
      this.logEvent('publish', {
        topic,
        params,
        data,
        sentCount,
        timestamp: new Date().toISOString()
      });
      
      return sentCount;
    } catch (error) {
      console.error(`Erro ao publicar evento para o tópico ${topic}:`, error);
      return 0;
    }
  }

  // Iniciar sessão de automação
  startAutomationSession(options) {
    try {
      const { sessionId, name, description, organizationId, userId } = options;
      
      // Validação básica
      if (!sessionId || !organizationId || !userId) {
        throw new Error('Dados obrigatórios não fornecidos');
      }
      
      // Verificar se já existe uma sessão com este ID
      if (this.sessions.has(sessionId)) {
        throw new Error('Sessão já existe');
      }
      
      // Criar sessão
      const session = {
        id: sessionId,
        name: name || `Sessão ${sessionId}`,
        description: description || '',
        organizationId,
        userId,
        status: 'starting',
        currentStep: null,
        progress: 0,
        startTime: new Date().toISOString(),
        lastActivity: Date.now(),
        logs: []
      };
      
      // Armazenar sessão
      this.sessions.set(sessionId, session);
      
      // Publicar evento
      this.publishEvent('automation', { sessionId, organizationId }, {
        action: 'session_started',
        session: {
          id: sessionId,
          name: session.name,
          status: session.status,
          startTime: session.startTime
        }
      });
      
      return {
        success: true,
        sessionId,
        session
      };
    } catch (error) {
      console.error('Erro ao iniciar sessão de automação:', error);
      throw error;
    }
  }

  // Atualizar status de sessão de automação
  updateAutomationSession(sessionId, updates) {
    try {
      // Verificar se a sessão existe
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('Sessão não encontrada');
      }
      
      // Atualizar campos
      const updatedSession = { ...session };
      
      if (updates.status) updatedSession.status = updates.status;
      if (updates.currentStep) updatedSession.currentStep = updates.currentStep;
      if (updates.progress !== undefined) updatedSession.progress = updates.progress;
      
      // Atualizar timestamp de última atividade
      updatedSession.lastActivity = Date.now();
      
      // Adicionar log, se fornecido
      if (updates.log) {
        if (!updatedSession.logs) {
          updatedSession.logs = [];
        }
        
        updatedSession.logs.push({
          timestamp: new Date().toISOString(),
          message: updates.log,
          level: updates.logLevel || 'info'
        });
        
        // Limitar número de logs armazenados
        if (updatedSession.logs.length > 100) {
          updatedSession.logs = updatedSession.logs.slice(-100);
        }
      }
      
      // Atualizar sessão
      this.sessions.set(sessionId, updatedSession);
      
      // Publicar evento
      this.publishEvent('automation', { sessionId, organizationId: session.organizationId }, {
        action: 'session_updated',
        session: {
          id: sessionId,
          status: updatedSession.status,
          currentStep: updatedSession.currentStep,
          progress: updatedSession.progress,
          log: updates.log ? {
            timestamp: new Date().toISOString(),
            message: updates.log,
            level: updates.logLevel || 'info'
          } : undefined
        }
      });
      
      return {
        success: true,
        sessionId,
        session: updatedSession
      };
    } catch (error) {
      console.error(`Erro ao atualizar sessão de automação ${sessionId}:`, error);
      throw error;
    }
  }

  // Finalizar sessão de automação
  endAutomationSession(sessionId, result) {
    try {
      // Verificar se a sessão existe
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('Sessão não encontrada');
      }
      
      // Atualizar status
      session.status = result.success ? 'completed' : 'failed';
      session.endTime = new Date().toISOString();
      session.result = result;
      session.lastActivity = Date.now();
      
      // Adicionar log final
      if (!session.logs) {
        session.logs = [];
      }
      
      session.logs.push({
        timestamp: new Date().toISOString(),
        message: result.success ? 'Sessão concluída com sucesso' : `Sessão falhou: ${result.error || 'Erro desconhecido'}`,
        level: result.success ? 'info' : 'error'
      });
      
      // Publicar evento
      this.publishEvent('automation', { sessionId, organizationId: session.organizationId }, {
        action: 'session_ended',
        session: {
          id: sessionId,
          status: session.status,
          endTime: session.endTime,
          result: result
        }
      });
      
      // Manter a sessão por um tempo para consulta
      setTimeout(() => {
        this.sessions.delete(sessionId);
      }, 3600000); // 1 hora
      
      return {
        success: true,
        sessionId,
        session
      };
    } catch (error) {
      console.error(`Erro ao finalizar sessão de automação ${sessionId}:`, error);
      throw error;
    }
  }

  // Limpar clientes inativos
  cleanupInactiveClients() {
    try {
      const now = Date.now();
      const inactivityThreshold = 5 * 60 * 1000; // 5 minutos
      
      for (const [clientId, client] of this.clients.entries()) {
        if (now - client.lastActivity > inactivityThreshold) {
          // Fechar conexão
          if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.close(4003, 'Inatividade');
          }
          
          // Remover cliente
          this.clients.delete(clientId);
          
          // Registrar desconexão
          console.log(`Cliente removido por inatividade: ${clientId}`);
          this.logEvent('timeout', {
            clientId,
            userId: client.userId,
            organizationId: client.organizationId,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Erro ao limpar clientes inativos:', error);
    }
  }

  // Registrar evento em log
  logEvent(type, data) {
    try {
      const logEntry = {
        type,
        ...data,
        timestamp: data.timestamp || new Date().toISOString()
      };
      
      // Formatar entrada de log
      const logLine = JSON.stringify(logEntry) + '\n';
      
      // Determinar arquivo de log
      const date = new Date().toISOString().split('T')[0];
      const logFile = path.join(this.logsDir, `realtime_${date}.log`);
      
      // Escrever no arquivo
      fs.appendFileSync(logFile, logLine);
    } catch (error) {
      console.error('Erro ao registrar evento em log:', error);
    }
  }
}

module.exports = new RealTimeMonitoringService();
