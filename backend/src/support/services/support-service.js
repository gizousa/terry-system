// Serviço para suporte técnico
const LLMService = require('../infrastructure/services/llm-service');
const ServerConnectionService = require('../infrastructure/services/server-connection-service');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class SupportService {
  constructor() {
    this.ticketsDir = path.join(__dirname, '..', '..', '..', 'data', 'tickets');
    this.logsDir = path.join(__dirname, '..', '..', '..', 'data', 'logs');
    
    // Garantir que os diretórios existam
    if (!fs.existsSync(this.ticketsDir)) {
      fs.mkdirSync(this.ticketsDir, { recursive: true });
    }
    
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  // Criar um novo ticket de suporte
  async createTicket(options) {
    try {
      const {
        title,
        description,
        priority,
        category,
        organizationId,
        userId,
        serverCredentialId,
        attachments
      } = options;

      // Validação básica
      if (!title || !description || !organizationId || !userId) {
        throw new Error('Dados obrigatórios não fornecidos');
      }

      // Cria um ID único para o ticket
      const ticketId = `ticket_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      // Cria o diretório do ticket
      const ticketDir = path.join(this.ticketsDir, ticketId);
      fs.mkdirSync(ticketDir, { recursive: true });
      fs.mkdirSync(path.join(ticketDir, 'attachments'), { recursive: true });

      // Cria o arquivo de configuração do ticket
      const ticketConfig = {
        id: ticketId,
        title,
        description,
        priority: priority || 'medium',
        category: category || 'general',
        status: 'open',
        organizationId,
        createdBy: userId,
        assignedTo: null,
        serverCredentialId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        closedAt: null,
        activities: [
          {
            type: 'creation',
            timestamp: new Date().toISOString(),
            userId,
            message: 'Ticket criado'
          }
        ]
      };

      // Salva o arquivo de configuração
      fs.writeFileSync(
        path.join(ticketDir, 'ticket.json'),
        JSON.stringify(ticketConfig, null, 2)
      );

      // Salva os anexos, se houver
      if (attachments && attachments.length > 0) {
        for (let i = 0; i < attachments.length; i++) {
          const attachment = attachments[i];
          const attachmentPath = path.join(ticketDir, 'attachments', `attachment_${i}_${path.basename(attachment.path)}`);
          
          // Copia o arquivo para o diretório de anexos
          fs.copyFileSync(attachment.path, attachmentPath);
          
          // Adiciona informação do anexo às atividades
          ticketConfig.activities.push({
            type: 'attachment',
            timestamp: new Date().toISOString(),
            userId,
            message: `Anexo adicionado: ${attachment.name || path.basename(attachment.path)}`,
            attachmentPath
          });
        }
        
        // Atualiza o arquivo de configuração com as informações dos anexos
        fs.writeFileSync(
          path.join(ticketDir, 'ticket.json'),
          JSON.stringify(ticketConfig, null, 2)
        );
      }

      // Realiza análise inicial do ticket usando LLM
      await this.analyzeTicket(ticketId);

      return {
        success: true,
        ticketId,
        ticketConfig
      };
    } catch (error) {
      console.error('Erro ao criar ticket:', error);
      throw error;
    }
  }

  // Analisar ticket usando LLM
  async analyzeTicket(ticketId) {
    try {
      const ticketDir = path.join(this.ticketsDir, ticketId);
      
      // Verifica se o ticket existe
      if (!fs.existsSync(ticketDir)) {
        throw new Error('Ticket não encontrado');
      }

      // Carrega a configuração do ticket
      const ticketConfig = JSON.parse(
        fs.readFileSync(path.join(ticketDir, 'ticket.json'), 'utf8')
      );

      // Usa o LLM para analisar o ticket
      const prompt = `
Você é um especialista em suporte técnico. Analise o seguinte ticket de suporte e forneça:
1. Uma categorização mais precisa do problema
2. Possíveis causas do problema
3. Sugestões iniciais de solução
4. Perguntas adicionais que precisam ser feitas ao usuário
5. Nível de prioridade recomendado (baixo, médio, alto, crítico)

Título do Ticket: ${ticketConfig.title}
Descrição: ${ticketConfig.description}
Categoria: ${ticketConfig.category}
Prioridade Atual: ${ticketConfig.priority}
      `;

      const result = await LLMService.sendPrompt({
        organizationId: ticketConfig.organizationId,
        promptContent: prompt,
        systemMessage: 'Você é um especialista em suporte técnico. Forneça análises detalhadas e práticas.',
        temperature: 0.3
      });

      // Salva a análise
      fs.writeFileSync(
        path.join(ticketDir, 'analysis.md'),
        result.content
      );

      // Adiciona atividade de análise
      ticketConfig.activities.push({
        type: 'analysis',
        timestamp: new Date().toISOString(),
        userId: 'system',
        message: 'Análise automática realizada'
      });

      // Atualiza o arquivo de configuração
      fs.writeFileSync(
        path.join(ticketDir, 'ticket.json'),
        JSON.stringify(ticketConfig, null, 2)
      );

      return {
        success: true,
        analysis: result.content
      };
    } catch (error) {
      console.error('Erro ao analisar ticket:', error);
      throw error;
    }
  }

  // Adicionar comentário a um ticket
  async addComment(ticketId, options) {
    try {
      const { userId, comment, attachments } = options;

      // Validação básica
      if (!ticketId || !userId || !comment) {
        throw new Error('Dados obrigatórios não fornecidos');
      }

      const ticketDir = path.join(this.ticketsDir, ticketId);
      
      // Verifica se o ticket existe
      if (!fs.existsSync(ticketDir)) {
        throw new Error('Ticket não encontrado');
      }

      // Carrega a configuração do ticket
      const ticketConfig = JSON.parse(
        fs.readFileSync(path.join(ticketDir, 'ticket.json'), 'utf8')
      );

      // Adiciona o comentário às atividades
      ticketConfig.activities.push({
        type: 'comment',
        timestamp: new Date().toISOString(),
        userId,
        message: comment
      });

      // Atualiza o timestamp
      ticketConfig.updatedAt = new Date().toISOString();

      // Salva os anexos, se houver
      if (attachments && attachments.length > 0) {
        for (let i = 0; i < attachments.length; i++) {
          const attachment = attachments[i];
          const attachmentPath = path.join(ticketDir, 'attachments', `attachment_${Date.now()}_${path.basename(attachment.path)}`);
          
          // Copia o arquivo para o diretório de anexos
          fs.copyFileSync(attachment.path, attachmentPath);
          
          // Adiciona informação do anexo às atividades
          ticketConfig.activities.push({
            type: 'attachment',
            timestamp: new Date().toISOString(),
            userId,
            message: `Anexo adicionado: ${attachment.name || path.basename(attachment.path)}`,
            attachmentPath
          });
        }
      }

      // Salva a configuração atualizada
      fs.writeFileSync(
        path.join(ticketDir, 'ticket.json'),
        JSON.stringify(ticketConfig, null, 2)
      );

      // Analisa o comentário para sugerir ações
      const suggestions = await this.analyzeSupportComment(ticketId, comment);

      return {
        success: true,
        ticketConfig,
        suggestions
      };
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      throw error;
    }
  }

  // Analisar comentário de suporte para sugerir ações
  async analyzeSupportComment(ticketId, comment) {
    try {
      const ticketDir = path.join(this.ticketsDir, ticketId);
      
      // Carrega a configuração do ticket
      const ticketConfig = JSON.parse(
        fs.readFileSync(path.join(ticketDir, 'ticket.json'), 'utf8')
      );

      // Carrega a análise anterior, se existir
      let previousAnalysis = '';
      const analysisPath = path.join(ticketDir, 'analysis.md');
      if (fs.existsSync(analysisPath)) {
        previousAnalysis = fs.readFileSync(analysisPath, 'utf8');
      }

      // Usa o LLM para analisar o comentário
      const prompt = `
Você é um especialista em suporte técnico. Analise o seguinte comentário em um ticket de suporte e forneça:
1. Possíveis ações técnicas que podem ser tomadas com base neste comentário
2. Informações adicionais que podem ser necessárias
3. Se o comentário parece resolver o problema ou não

Título do Ticket: ${ticketConfig.title}
Descrição Original: ${ticketConfig.description}
Análise Anterior: ${previousAnalysis}
Novo Comentário: ${comment}
      `;

      const result = await LLMService.sendPrompt({
        organizationId: ticketConfig.organizationId,
        promptContent: prompt,
        systemMessage: 'Você é um especialista em suporte técnico. Forneça sugestões práticas e acionáveis.',
        temperature: 0.3
      });

      return {
        success: true,
        suggestions: result.content
      };
    } catch (error) {
      console.error('Erro ao analisar comentário:', error);
      throw error;
    }
  }

  // Atribuir ticket a um usuário
  async assignTicket(ticketId, options) {
    try {
      const { assignedTo, assignedBy } = options;

      // Validação básica
      if (!ticketId || !assignedTo || !assignedBy) {
        throw new Error('Dados obrigatórios não fornecidos');
      }

      const ticketDir = path.join(this.ticketsDir, ticketId);
      
      // Verifica se o ticket existe
      if (!fs.existsSync(ticketDir)) {
        throw new Error('Ticket não encontrado');
      }

      // Carrega a configuração do ticket
      const ticketConfig = JSON.parse(
        fs.readFileSync(path.join(ticketDir, 'ticket.json'), 'utf8')
      );

      // Atualiza a atribuição
      ticketConfig.assignedTo = assignedTo;
      ticketConfig.updatedAt = new Date().toISOString();

      // Adiciona atividade de atribuição
      ticketConfig.activities.push({
        type: 'assignment',
        timestamp: new Date().toISOString(),
        userId: assignedBy,
        message: `Ticket atribuído para ${assignedTo}`
      });

      // Salva a configuração atualizada
      fs.writeFileSync(
        path.join(ticketDir, 'ticket.json'),
        JSON.stringify(ticketConfig, null, 2)
      );

      return {
        success: true,
        ticketConfig
      };
    } catch (error) {
      console.error('Erro ao atribuir ticket:', error);
      throw error;
    }
  }

  // Alterar status do ticket
  async updateTicketStatus(ticketId, options) {
    try {
      const { status, userId } = options;

      // Validação básica
      if (!ticketId || !status || !userId) {
        throw new Error('Dados obrigatórios não fornecidos');
      }

      const ticketDir = path.join(this.ticketsDir, ticketId);
      
      // Verifica se o ticket existe
      if (!fs.existsSync(ticketDir)) {
        throw new Error('Ticket não encontrado');
      }

      // Carrega a configuração do ticket
      const ticketConfig = JSON.parse(
        fs.readFileSync(path.join(ticketDir, 'ticket.json'), 'utf8')
      );

      // Atualiza o status
      ticketConfig.status = status;
      ticketConfig.updatedAt = new Date().toISOString();

      // Se o status for 'closed', atualiza o timestamp de fechamento
      if (status === 'closed') {
        ticketConfig.closedAt = new Date().toISOString();
      }

      // Adiciona atividade de atualização de status
      ticketConfig.activities.push({
        type: 'status_update',
        timestamp: new Date().toISOString(),
        userId,
        message: `Status alterado para ${status}`
      });

      // Salva a configuração atualizada
      fs.writeFileSync(
        path.join(ticketDir, 'ticket.json'),
        JSON.stringify(ticketConfig, null, 2)
      );

      return {
        success: true,
        ticketConfig
      };
    } catch (error) {
      console.error('Erro ao atualizar status do ticket:', error);
      throw error;
    }
  }

  // Conectar ao servidor para diagnóstico
  async connectToServer(ticketId, options) {
    try {
      const { userId } = options;

      // Validação básica
      if (!ticketId || !userId) {
        throw new Error('Dados obrigatórios não fornecidos');
      }

      const ticketDir = path.join(this.ticketsDir, ticketId);
      
      // Verifica se o ticket existe
      if (!fs.existsSync(ticketDir)) {
        throw new Error('Ticket não encontrado');
      }

      // Carrega a configuração do ticket
      const ticketConfig = JSON.parse(
        fs.readFileSync(path.join(ticketDir, 'ticket.json'), 'utf8')
      );

      // Verifica se há credencial de servidor associada
      if (!ticketConfig.serverCredentialId) {
        throw new Error('Nenhuma credencial de servidor associada a este ticket');
      }

      // Conecta ao servidor
      const connectionResult = await ServerConnectionService.connect(ticketConfig.serverCredentialId);

      // Adiciona atividade de conexão
      ticketConfig.activities.push({
        type: 'server_connection',
        timestamp: new Date().toISOString(),
        userId,
        message: `Conexão com servidor ${connectionResult.success ? 'estabelecida' : 'falhou'}: ${connectionResult.message}`
      });

      // Atualiza o timestamp
      ticketConfig.updatedAt = new Date().toISOString();

      // Salva a configuração atualizada
      fs.writeFileSync(
        path.join(ticketDir, 'ticket.json'),
        JSON.stringify(ticketConfig, null, 2)
      );

      return {
        success: connectionResult.success,
        message: connectionResult.message,
        connectionId: connectionResult.connectionId,
        ticketConfig
      };
    } catch (error) {
      console.error('Erro ao conectar ao servidor:', error);
      throw error;
    }
  }

  // Executar diagnóstico no servidor
  async runDiagnostics(ticketId, options) {
    try {
      const { userId, connectionId, diagnosticType } = options;

      // Validação básica
      if (!ticketId || !userId || !connectionId) {
        throw new Error('Dados obrigatórios não fornecidos');
      }

      const ticketDir = path.join(this.ticketsDir, ticketId);
      
      // Verifica se o ticket existe
      if (!fs.existsSync(ticketDir)) {
        throw new Error('Ticket não encontrado');
      }

      // Carrega a configuração do ticket
      const ticketConfig = JSON.parse(
        fs.readFileSync(path.join(ticketDir, 'ticket.json'), 'utf8')
      );

      // Determina os comandos de diagnóstico com base no tipo
      let diagnosticCommands = [];
      
      switch (diagnosticType) {
        case 'system_info':
          diagnosticCommands = [
            'uname -a',
            'cat /etc/os-release',
            'uptime',
            'free -h',
            'df -h',
            'top -b -n 1'
          ];
          break;
        case 'network':
          diagnosticCommands = [
            'ifconfig || ip addr',
            'netstat -tuln || ss -tuln',
            'ping -c 4 google.com',
            'traceroute google.com || tracepath google.com',
            'cat /etc/resolv.conf'
          ];
          break;
        case 'web_server':
          diagnosticCommands = [
            'ps aux | grep -E "apache|nginx|httpd"',
            'systemctl status nginx || systemctl status apache2 || systemctl status httpd',
            'cat /var/log/nginx/error.log 2>/dev/null || cat /var/log/apache2/error.log 2>/dev/null || cat /var/log/httpd/error.log 2>/dev/null',
            'netstat -tuln | grep -E "80|443" || ss -tuln | grep -E "80|443"'
          ];
          break;
        case 'database':
          diagnosticCommands = [
            'ps aux | grep -E "mysql|postgres|mongo"',
            'systemctl status mysql || systemctl status postgresql || systemctl status mongod',
            'df -h /var/lib/mysql 2>/dev/null || df -h /var/lib/postgresql 2>/dev/null || df -h /var/lib/mongodb 2>/dev/null'
          ];
          break;
        default:
          diagnosticCommands = [
            'uname -a',
            'uptime',
            'free -h',
            'df -h'
          ];
      }

      // Executa os comandos e coleta os resultados
      let diagnosticResults = '';
      
      for (const command of diagnosticCommands) {
        try {
          const result = await ServerConnectionService.executeCommand(connectionId, command);
          diagnosticResults += `\n\n### Comando: ${command}\n\n`;
          diagnosticResults += result.success ? result.stdout : `Erro: ${result.stderr}`;
        } catch (error) {
          diagnosticResults += `\n\n### Comando: ${command}\n\n`;
          diagnosticResults += `Erro ao executar: ${error.message}`;
        }
      }

      // Salva os resultados do diagnóstico
      const diagnosticFilename = `diagnostic_${diagnosticType}_${Date.now()}.md`;
      fs.writeFileSync(
        path.join(ticketDir, diagnosticFilename),
        `# Diagnóstico: ${diagnosticType}\n\nData: ${new Date().toISOString()}\n\n${diagnosticResults}`
      );

      // Adiciona atividade de diagnóstico
      ticketConfig.activities.push({
        type: 'diagnostic',
        timestamp: new Date().toISOString(),
        userId,
        message: `Diagnóstico ${diagnosticType} executado`,
        diagnosticFile: diagnosticFilename
      });

      // Atualiza o timestamp
      ticketConfig.updatedAt = new Date().toISOString();

      // Salva a configuração atualizada
      fs.writeFileSync(
        path.join(ticketDir, 'ticket.json'),
        JSON.stringify(ticketConfig, null, 2)
      );

      // Analisa os resultados do diagnóstico
      const analysis = await this.analyzeDiagnosticResults(ticketId, diagnosticResults, diagnosticType);

      return {
        success: true,
        diagnosticResults,
        analysis,
        ticketConfig
      };
    } catch (error) {
      console.error('Erro ao executar diagnóstico:', error);
      throw error;
    }
  }

  // Analisar resultados de diagnóstico
  async analyzeDiagnosticResults(ticketId, diagnosticResults, diagnosticType) {
    try {
      const ticketDir = path.join(this.ticketsDir, ticketId);
      
      // Carrega a configuração do ticket
      const ticketConfig = JSON.parse(
        fs.readFileSync(path.join(ticketDir, 'ticket.json'), 'utf8')
      );

      // Usa o LLM para analisar os resultados do diagnóstico
      const prompt = `
Você é um especialista em suporte técnico de sistemas. Analise os seguintes resultados de diagnóstico ${diagnosticType} e forneça:
1. Um resumo do estado atual do sistema
2. Problemas identificados, se houver
3. Possíveis soluções para os problemas
4. Recomendações para melhorar o desempenho ou segurança

Título do Ticket: ${ticketConfig.title}
Descrição: ${ticketConfig.description}

Resultados do Diagnóstico:
${diagnosticResults}
      `;

      const result = await LLMService.sendPrompt({
        organizationId: ticketConfig.organizationId,
        promptContent: prompt,
        systemMessage: 'Você é um especialista em suporte técnico de sistemas. Forneça análises detalhadas e soluções práticas.',
        temperature: 0.3
      });

      // Salva a análise
      const analysisFilename = `analysis_${diagnosticType}_${Date.now()}.md`;
      fs.writeFileSync(
        path.join(ticketDir, analysisFilename),
        result.content
      );

      // Adiciona atividade de análise
      ticketConfig.activities.push({
        type: 'analysis',
        timestamp: new Date().toISOString(),
        userId: 'system',
        message: `Análise de diagnóstico ${diagnosticType} realizada`,
        analysisFile: analysisFilename
      });

      // Salva a configuração atualizada
      fs.writeFileSync(
        path.join(ticketDir, 'ticket.json'),
        JSON.stringify(ticketConfig, null, 2)
      );

      return {
        success: true,
        analysis: result.content
      };
    } catch (error) {
      console.error('Erro ao analisar resultados de diagnóstico:', error);
      throw error;
    }
  }

  // Executar ação corretiva no servidor
  async runCorrectiveAction(ticketId, options) {
    try {
      const { userId, connectionId, action, command, requireApproval } = options;

      // Validação básica
      if (!ticketId || !userId || !connectionId || !action) {
        throw new Error('Dados obrigatórios não fornecidos');
      }

      const ticketDir = path.join(this.ticketsDir, ticketId);
      
      // Verifica se o ticket existe
      if (!fs.existsSync(ticketDir)) {
        throw new Error('Ticket não encontrado');
      }

      // Carrega a configuração do ticket
      const ticketConfig = JSON.parse(
        fs.readFileSync(path.join(ticketDir, 'ticket.json'), 'utf8')
      );

      // Se requer aprovação e não foi aprovado, registra a sugestão
      if (requireApproval && !options.approved) {
        // Adiciona atividade de sugestão de ação
        ticketConfig.activities.push({
          type: 'action_suggestion',
          timestamp: new Date().toISOString(),
          userId,
          message: `Ação sugerida: ${action}`,
          command: command,
          requiresApproval: true,
          approved: false
        });

        // Atualiza o timestamp
        ticketConfig.updatedAt = new Date().toISOString();

        // Salva a configuração atualizada
        fs.writeFileSync(
          path.join(ticketDir, 'ticket.json'),
          JSON.stringify(ticketConfig, null, 2)
        );

        return {
          success: true,
          message: 'Ação sugerida registrada, aguardando aprovação',
          requiresApproval: true,
          ticketConfig
        };
      }

      // Executa o comando
      const commandToExecute = command || this.getCommandForAction(action);
      const result = await ServerConnectionService.executeCommand(connectionId, commandToExecute);

      // Adiciona atividade de ação corretiva
      ticketConfig.activities.push({
        type: 'corrective_action',
        timestamp: new Date().toISOString(),
        userId,
        message: `Ação corretiva executada: ${action}`,
        command: commandToExecute,
        result: {
          success: result.success,
          stdout: result.stdout,
          stderr: result.stderr
        }
      });

      // Atualiza o timestamp
      ticketConfig.updatedAt = new Date().toISOString();

      // Salva a configuração atualizada
      fs.writeFileSync(
        path.join(ticketDir, 'ticket.json'),
        JSON.stringify(ticketConfig, null, 2)
      );

      return {
        success: result.success,
        action,
        command: commandToExecute,
        result,
        ticketConfig
      };
    } catch (error) {
      console.error('Erro ao executar ação corretiva:', error);
      throw error;
    }
  }

  // Obter comando para ação predefinida
  getCommandForAction(action) {
    const actionCommands = {
      'restart_web_server': 'systemctl restart nginx || systemctl restart apache2 || systemctl restart httpd',
      'restart_database': 'systemctl restart mysql || systemctl restart postgresql || systemctl restart mongod',
      'clear_logs': 'find /var/log -type f -name "*.log" -exec truncate -s 0 {} \\;',
      'update_system': 'apt-get update && apt-get upgrade -y || yum update -y',
      'check_disk_space': 'df -h && du -sh /* | sort -hr | head -10',
      'check_memory': 'free -h && ps aux --sort=-%mem | head -10',
      'check_cpu': 'top -b -n 1 | head -20',
      'backup_config': 'mkdir -p /tmp/config_backup && cp -r /etc /tmp/config_backup/'
    };

    return actionCommands[action] || action; // Se não for uma ação predefinida, usa o próprio action como comando
  }

  // Obter detalhes do ticket
  async getTicketDetails(ticketId) {
    try {
      const ticketDir = path.join(this.ticketsDir, ticketId);
      
      // Verifica se o ticket existe
      if (!fs.existsSync(ticketDir)) {
        throw new Error('Ticket não encontrado');
      }

      // Carrega a configuração do ticket
      const ticketConfig = JSON.parse(
        fs.readFileSync(path.join(ticketDir, 'ticket.json'), 'utf8')
      );

      // Coleta arquivos relacionados
      const files = [];
      
      // Verifica se há análise
      const analysisPath = path.join(ticketDir, 'analysis.md');
      if (fs.existsSync(analysisPath)) {
        files.push({
          name: 'analysis.md',
          path: analysisPath,
          content: fs.readFileSync(analysisPath, 'utf8')
        });
      }

      // Busca arquivos de diagnóstico
      const diagnosticFiles = fs.readdirSync(ticketDir).filter(file => file.startsWith('diagnostic_'));
      for (const file of diagnosticFiles) {
        files.push({
          name: file,
          path: path.join(ticketDir, file),
          content: fs.readFileSync(path.join(ticketDir, file), 'utf8')
        });
      }

      // Busca arquivos de análise de diagnóstico
      const analysisFiles = fs.readdirSync(ticketDir).filter(file => file.startsWith('analysis_'));
      for (const file of analysisFiles) {
        files.push({
          name: file,
          path: path.join(ticketDir, file),
          content: fs.readFileSync(path.join(ticketDir, file), 'utf8')
        });
      }

      // Lista anexos
      const attachmentsDir = path.join(ticketDir, 'attachments');
      let attachments = [];
      if (fs.existsSync(attachmentsDir)) {
        attachments = fs.readdirSync(attachmentsDir).map(file => ({
          name: file,
          path: path.join(attachmentsDir, file)
        }));
      }

      return {
        success: true,
        ticketConfig,
        files,
        attachments
      };
    } catch (error) {
      console.error('Erro ao obter detalhes do ticket:', error);
      throw error;
    }
  }

  // Listar tickets
  async listTickets(options = {}) {
    try {
      const { organizationId, status, assignedTo } = options;
      
      const tickets = [];
      
      // Lista todos os diretórios no diretório de tickets
      const ticketDirs = fs.readdirSync(this.ticketsDir);
      
      for (const dir of ticketDirs) {
        const ticketDir = path.join(this.ticketsDir, dir);
        
        // Verifica se é um diretório
        if (fs.statSync(ticketDir).isDirectory()) {
          // Verifica se existe o arquivo de configuração
          const configPath = path.join(ticketDir, 'ticket.json');
          if (fs.existsSync(configPath)) {
            // Carrega a configuração do ticket
            const ticketConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            
            // Aplica filtros
            let includeTicket = true;
            
            if (organizationId && ticketConfig.organizationId !== organizationId) {
              includeTicket = false;
            }
            
            if (status && ticketConfig.status !== status) {
              includeTicket = false;
            }
            
            if (assignedTo && ticketConfig.assignedTo !== assignedTo) {
              includeTicket = false;
            }
            
            if (includeTicket) {
              tickets.push({
                id: ticketConfig.id,
                title: ticketConfig.title,
                status: ticketConfig.status,
                priority: ticketConfig.priority,
                category: ticketConfig.category,
                createdAt: ticketConfig.createdAt,
                updatedAt: ticketConfig.updatedAt,
                assignedTo: ticketConfig.assignedTo
              });
            }
          }
        }
      }
      
      return {
        success: true,
        tickets
      };
    } catch (error) {
      console.error('Erro ao listar tickets:', error);
      throw error;
    }
  }

  // Monitorar servidor
  async monitorServer(serverCredentialId, options = {}) {
    try {
      const { metrics = ['cpu', 'memory', 'disk', 'network'] } = options;

      // Conecta ao servidor
      const connectionResult = await ServerConnectionService.connect(serverCredentialId);
      
      if (!connectionResult.success) {
        throw new Error(`Falha ao conectar ao servidor: ${connectionResult.message}`);
      }

      const connectionId = connectionResult.connectionId;
      const monitoringResults = {};

      // Coleta métricas de CPU
      if (metrics.includes('cpu')) {
        const cpuResult = await ServerConnectionService.executeCommand(connectionId, 'top -bn1 | grep "Cpu(s)" | sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | awk \'{print 100 - $1}\'');
        monitoringResults.cpu = {
          usage: parseFloat(cpuResult.stdout.trim()),
          raw: cpuResult.stdout
        };
      }

      // Coleta métricas de memória
      if (metrics.includes('memory')) {
        const memResult = await ServerConnectionService.executeCommand(connectionId, 'free -m | grep Mem');
        const memParts = memResult.stdout.trim().split(/\s+/);
        monitoringResults.memory = {
          total: parseInt(memParts[1]),
          used: parseInt(memParts[2]),
          free: parseInt(memParts[3]),
          usage: (parseInt(memParts[2]) / parseInt(memParts[1])) * 100,
          raw: memResult.stdout
        };
      }

      // Coleta métricas de disco
      if (metrics.includes('disk')) {
        const diskResult = await ServerConnectionService.executeCommand(connectionId, 'df -h | grep -v "tmpfs\\|cdrom"');
        monitoringResults.disk = {
          raw: diskResult.stdout,
          filesystems: []
        };

        // Processa a saída do df
        const lines = diskResult.stdout.trim().split('\n');
        for (let i = 0; i < lines.length; i++) {
          const parts = lines[i].trim().split(/\s+/);
          if (parts.length >= 6) {
            monitoringResults.disk.filesystems.push({
              filesystem: parts[0],
              size: parts[1],
              used: parts[2],
              available: parts[3],
              usage: parseInt(parts[4].replace('%', '')),
              mountpoint: parts[5]
            });
          }
        }
      }

      // Coleta métricas de rede
      if (metrics.includes('network')) {
        const netResult = await ServerConnectionService.executeCommand(connectionId, 'netstat -i | grep -v "Kernel\\|Iface\\|lo"');
        monitoringResults.network = {
          raw: netResult.stdout,
          interfaces: []
        };

        // Processa a saída do netstat
        const lines = netResult.stdout.trim().split('\n');
        for (let i = 0; i < lines.length; i++) {
          const parts = lines[i].trim().split(/\s+/);
          if (parts.length >= 10) {
            monitoringResults.network.interfaces.push({
              interface: parts[0],
              mtu: parseInt(parts[1]),
              rx_ok: parseInt(parts[2]),
              rx_err: parseInt(parts[3]),
              rx_drop: parseInt(parts[4]),
              tx_ok: parseInt(parts[6]),
              tx_err: parseInt(parts[7]),
              tx_drop: parseInt(parts[8])
            });
          }
        }
      }

      // Fecha a conexão
      await ServerConnectionService.disconnect(connectionId);

      return {
        success: true,
        monitoringResults
      };
    } catch (error) {
      console.error('Erro ao monitorar servidor:', error);
      throw error;
    }
  }

  // Analisar logs do sistema
  async analyzeLogs(serverCredentialId, options = {}) {
    try {
      const { logType = 'system', lines = 100 } = options;

      // Conecta ao servidor
      const connectionResult = await ServerConnectionService.connect(serverCredentialId);
      
      if (!connectionResult.success) {
        throw new Error(`Falha ao conectar ao servidor: ${connectionResult.message}`);
      }

      const connectionId = connectionResult.connectionId;
      let logCommand;

      // Determina o comando com base no tipo de log
      switch (logType) {
        case 'system':
          logCommand = `journalctl -n ${lines} || tail -n ${lines} /var/log/syslog || tail -n ${lines} /var/log/messages`;
          break;
        case 'apache':
          logCommand = `tail -n ${lines} /var/log/apache2/error.log || tail -n ${lines} /var/log/httpd/error.log`;
          break;
        case 'nginx':
          logCommand = `tail -n ${lines} /var/log/nginx/error.log`;
          break;
        case 'mysql':
          logCommand = `tail -n ${lines} /var/log/mysql/error.log || tail -n ${lines} /var/lib/mysql/*.err`;
          break;
        case 'postgresql':
          logCommand = `tail -n ${lines} /var/log/postgresql/*.log`;
          break;
        case 'auth':
          logCommand = `tail -n ${lines} /var/log/auth.log || tail -n ${lines} /var/log/secure`;
          break;
        default:
          logCommand = `tail -n ${lines} ${logType}`; // Assume que logType é um caminho de arquivo
      }

      // Executa o comando
      const logResult = await ServerConnectionService.executeCommand(connectionId, logCommand);

      // Fecha a conexão
      await ServerConnectionService.disconnect(connectionId);

      // Analisa os logs usando LLM
      const logAnalysis = await this.analyzeLogContent(logResult.stdout, logType);

      return {
        success: true,
        logs: logResult.stdout,
        analysis: logAnalysis
      };
    } catch (error) {
      console.error('Erro ao analisar logs:', error);
      throw error;
    }
  }

  // Analisar conteúdo de logs
  async analyzeLogContent(logContent, logType) {
    try {
      // Usa o LLM para analisar os logs
      const prompt = `
Você é um especialista em análise de logs de sistemas. Analise os seguintes logs ${logType} e forneça:
1. Um resumo dos eventos principais
2. Identificação de erros ou problemas
3. Possíveis causas para os problemas identificados
4. Recomendações para resolução

Logs:
${logContent}
      `;

      const result = await LLMService.sendPrompt({
        organizationId: 'system', // Usa o ID da organização do sistema
        promptContent: prompt,
        systemMessage: 'Você é um especialista em análise de logs de sistemas. Forneça análises detalhadas e práticas.',
        temperature: 0.3
      });

      return result.content;
    } catch (error) {
      console.error('Erro ao analisar conteúdo de logs:', error);
      throw error;
    }
  }
}

module.exports = new SupportService();
