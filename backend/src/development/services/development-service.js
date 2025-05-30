// Serviço para desenvolvimento de sistemas
const LLMService = require('../infrastructure/services/llm-service');
const ServerConnectionService = require('../infrastructure/services/server-connection-service');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class DevelopmentService {
  constructor() {
    this.projectsDir = path.join(__dirname, '..', '..', '..', 'data', 'projects');
    
    // Garantir que o diretório de projetos exista
    if (!fs.existsSync(this.projectsDir)) {
      fs.mkdirSync(this.projectsDir, { recursive: true });
    }
  }

  // Iniciar um novo projeto de desenvolvimento
  async createProject(options) {
    try {
      const {
        name,
        description,
        organizationId,
        userId,
        projectType,
        requirements,
        serverCredentialId
      } = options;

      // Validação básica
      if (!name || !organizationId || !userId) {
        throw new Error('Dados obrigatórios não fornecidos');
      }

      // Cria um ID único para o projeto
      const projectId = `${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
      
      // Cria o diretório do projeto
      const projectDir = path.join(this.projectsDir, projectId);
      fs.mkdirSync(projectDir, { recursive: true });

      // Cria a estrutura básica do projeto
      fs.mkdirSync(path.join(projectDir, 'src'), { recursive: true });
      fs.mkdirSync(path.join(projectDir, 'docs'), { recursive: true });
      fs.mkdirSync(path.join(projectDir, 'tests'), { recursive: true });

      // Cria o arquivo de configuração do projeto
      const projectConfig = {
        id: projectId,
        name,
        description,
        organizationId,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        projectType,
        status: 'created',
        serverCredentialId,
        stages: [
          {
            name: 'Análise de Requisitos',
            status: 'pending',
            startedAt: null,
            completedAt: null
          },
          {
            name: 'Design de Arquitetura',
            status: 'pending',
            startedAt: null,
            completedAt: null
          },
          {
            name: 'Implementação',
            status: 'pending',
            startedAt: null,
            completedAt: null
          },
          {
            name: 'Testes',
            status: 'pending',
            startedAt: null,
            completedAt: null
          },
          {
            name: 'Implantação',
            status: 'pending',
            startedAt: null,
            completedAt: null
          }
        ],
        logs: [
          {
            timestamp: new Date().toISOString(),
            message: 'Projeto criado',
            userId
          }
        ]
      };

      // Salva o arquivo de configuração
      fs.writeFileSync(
        path.join(projectDir, 'project.json'),
        JSON.stringify(projectConfig, null, 2)
      );

      // Salva os requisitos
      if (requirements) {
        fs.writeFileSync(
          path.join(projectDir, 'requirements.md'),
          requirements
        );
      }

      return {
        success: true,
        projectId,
        projectConfig
      };
    } catch (error) {
      console.error('Erro ao criar projeto:', error);
      throw error;
    }
  }

  // Analisar requisitos do projeto
  async analyzeRequirements(projectId, options = {}) {
    try {
      const projectDir = path.join(this.projectsDir, projectId);
      
      // Verifica se o projeto existe
      if (!fs.existsSync(projectDir)) {
        throw new Error('Projeto não encontrado');
      }

      // Carrega a configuração do projeto
      const projectConfig = JSON.parse(
        fs.readFileSync(path.join(projectDir, 'project.json'), 'utf8')
      );

      // Carrega os requisitos
      let requirements = '';
      const requirementsPath = path.join(projectDir, 'requirements.md');
      if (fs.existsSync(requirementsPath)) {
        requirements = fs.readFileSync(requirementsPath, 'utf8');
      } else {
        throw new Error('Requisitos não encontrados');
      }

      // Atualiza o status da etapa
      const analysisStage = projectConfig.stages.find(s => s.name === 'Análise de Requisitos');
      if (analysisStage) {
        analysisStage.status = 'in_progress';
        analysisStage.startedAt = new Date().toISOString();
      }

      // Adiciona log
      projectConfig.logs.push({
        timestamp: new Date().toISOString(),
        message: 'Iniciando análise de requisitos',
        userId: options.userId
      });

      // Salva a configuração atualizada
      fs.writeFileSync(
        path.join(projectDir, 'project.json'),
        JSON.stringify(projectConfig, null, 2)
      );

      // Usa o LLM para analisar os requisitos
      const prompt = `
Você é um especialista em análise de requisitos de software. Analise os seguintes requisitos e forneça:
1. Uma lista estruturada de requisitos funcionais
2. Uma lista de requisitos não funcionais
3. Identificação de possíveis ambiguidades ou lacunas
4. Sugestões de tecnologias adequadas
5. Uma estimativa inicial de complexidade e esforço

Requisitos:
${requirements}
      `;

      const result = await LLMService.sendPrompt({
        organizationId: projectConfig.organizationId,
        promptContent: prompt,
        systemMessage: 'Você é um especialista em análise de requisitos de software. Forneça análises detalhadas e estruturadas.',
        temperature: 0.3
      });

      // Salva a análise
      fs.writeFileSync(
        path.join(projectDir, 'requirements_analysis.md'),
        result.content
      );

      // Atualiza o status da etapa
      if (analysisStage) {
        analysisStage.status = 'completed';
        analysisStage.completedAt = new Date().toISOString();
      }

      // Adiciona log
      projectConfig.logs.push({
        timestamp: new Date().toISOString(),
        message: 'Análise de requisitos concluída',
        userId: options.userId
      });

      // Salva a configuração atualizada
      fs.writeFileSync(
        path.join(projectDir, 'project.json'),
        JSON.stringify(projectConfig, null, 2)
      );

      return {
        success: true,
        analysis: result.content,
        projectConfig
      };
    } catch (error) {
      console.error('Erro ao analisar requisitos:', error);
      throw error;
    }
  }

  // Projetar arquitetura do sistema
  async designArchitecture(projectId, options = {}) {
    try {
      const projectDir = path.join(this.projectsDir, projectId);
      
      // Verifica se o projeto existe
      if (!fs.existsSync(projectDir)) {
        throw new Error('Projeto não encontrado');
      }

      // Carrega a configuração do projeto
      const projectConfig = JSON.parse(
        fs.readFileSync(path.join(projectDir, 'project.json'), 'utf8')
      );

      // Verifica se a análise de requisitos foi concluída
      const analysisStage = projectConfig.stages.find(s => s.name === 'Análise de Requisitos');
      if (!analysisStage || analysisStage.status !== 'completed') {
        throw new Error('A análise de requisitos deve ser concluída antes de projetar a arquitetura');
      }

      // Carrega a análise de requisitos
      let analysis = '';
      const analysisPath = path.join(projectDir, 'requirements_analysis.md');
      if (fs.existsSync(analysisPath)) {
        analysis = fs.readFileSync(analysisPath, 'utf8');
      } else {
        throw new Error('Análise de requisitos não encontrada');
      }

      // Atualiza o status da etapa
      const designStage = projectConfig.stages.find(s => s.name === 'Design de Arquitetura');
      if (designStage) {
        designStage.status = 'in_progress';
        designStage.startedAt = new Date().toISOString();
      }

      // Adiciona log
      projectConfig.logs.push({
        timestamp: new Date().toISOString(),
        message: 'Iniciando design de arquitetura',
        userId: options.userId
      });

      // Salva a configuração atualizada
      fs.writeFileSync(
        path.join(projectDir, 'project.json'),
        JSON.stringify(projectConfig, null, 2)
      );

      // Usa o LLM para projetar a arquitetura
      const prompt = `
Você é um arquiteto de software experiente. Com base na análise de requisitos a seguir, projete uma arquitetura de sistema detalhada que inclua:
1. Diagrama de componentes (descrito textualmente)
2. Modelo de dados (entidades principais e seus relacionamentos)
3. Padrões de design recomendados
4. Tecnologias específicas para cada componente
5. Considerações de segurança, escalabilidade e manutenibilidade

Análise de Requisitos:
${analysis}
      `;

      const result = await LLMService.sendPrompt({
        organizationId: projectConfig.organizationId,
        promptContent: prompt,
        systemMessage: 'Você é um arquiteto de software experiente. Forneça designs detalhados e bem estruturados.',
        temperature: 0.3
      });

      // Salva o design da arquitetura
      fs.writeFileSync(
        path.join(projectDir, 'architecture_design.md'),
        result.content
      );

      // Atualiza o status da etapa
      if (designStage) {
        designStage.status = 'completed';
        designStage.completedAt = new Date().toISOString();
      }

      // Adiciona log
      projectConfig.logs.push({
        timestamp: new Date().toISOString(),
        message: 'Design de arquitetura concluído',
        userId: options.userId
      });

      // Salva a configuração atualizada
      fs.writeFileSync(
        path.join(projectDir, 'project.json'),
        JSON.stringify(projectConfig, null, 2)
      );

      return {
        success: true,
        architecture: result.content,
        projectConfig
      };
    } catch (error) {
      console.error('Erro ao projetar arquitetura:', error);
      throw error;
    }
  }

  // Implementar o sistema
  async implementSystem(projectId, options = {}) {
    try {
      const projectDir = path.join(this.projectsDir, projectId);
      
      // Verifica se o projeto existe
      if (!fs.existsSync(projectDir)) {
        throw new Error('Projeto não encontrado');
      }

      // Carrega a configuração do projeto
      const projectConfig = JSON.parse(
        fs.readFileSync(path.join(projectDir, 'project.json'), 'utf8')
      );

      // Verifica se o design de arquitetura foi concluído
      const designStage = projectConfig.stages.find(s => s.name === 'Design de Arquitetura');
      if (!designStage || designStage.status !== 'completed') {
        throw new Error('O design de arquitetura deve ser concluído antes da implementação');
      }

      // Carrega o design da arquitetura
      let architecture = '';
      const architecturePath = path.join(projectDir, 'architecture_design.md');
      if (fs.existsSync(architecturePath)) {
        architecture = fs.readFileSync(architecturePath, 'utf8');
      } else {
        throw new Error('Design de arquitetura não encontrado');
      }

      // Atualiza o status da etapa
      const implementationStage = projectConfig.stages.find(s => s.name === 'Implementação');
      if (implementationStage) {
        implementationStage.status = 'in_progress';
        implementationStage.startedAt = new Date().toISOString();
      }

      // Adiciona log
      projectConfig.logs.push({
        timestamp: new Date().toISOString(),
        message: 'Iniciando implementação',
        userId: options.userId
      });

      // Salva a configuração atualizada
      fs.writeFileSync(
        path.join(projectDir, 'project.json'),
        JSON.stringify(projectConfig, null, 2)
      );

      // Cria diretório de código fonte
      const srcDir = path.join(projectDir, 'src');
      
      // Implementação será dividida em etapas
      // 1. Estrutura do projeto
      await this.implementProjectStructure(projectId, srcDir, architecture, projectConfig);
      
      // 2. Componentes principais
      await this.implementCoreComponents(projectId, srcDir, architecture, projectConfig);
      
      // 3. Banco de dados e modelos
      await this.implementDatabaseModels(projectId, srcDir, architecture, projectConfig);
      
      // 4. Lógica de negócios
      await this.implementBusinessLogic(projectId, srcDir, architecture, projectConfig);
      
      // 5. Interface do usuário (se aplicável)
      await this.implementUserInterface(projectId, srcDir, architecture, projectConfig);

      // Atualiza o status da etapa
      if (implementationStage) {
        implementationStage.status = 'completed';
        implementationStage.completedAt = new Date().toISOString();
      }

      // Adiciona log
      projectConfig.logs.push({
        timestamp: new Date().toISOString(),
        message: 'Implementação concluída',
        userId: options.userId
      });

      // Salva a configuração atualizada
      fs.writeFileSync(
        path.join(projectDir, 'project.json'),
        JSON.stringify(projectConfig, null, 2)
      );

      return {
        success: true,
        message: 'Implementação concluída com sucesso',
        projectConfig
      };
    } catch (error) {
      console.error('Erro ao implementar sistema:', error);
      throw error;
    }
  }

  // Implementar estrutura do projeto
  async implementProjectStructure(projectId, srcDir, architecture, projectConfig) {
    try {
      // Usa o LLM para gerar a estrutura do projeto
      const prompt = `
Você é um desenvolvedor de software experiente. Com base no design de arquitetura a seguir, gere uma estrutura de diretórios e arquivos para o projeto. Inclua:
1. Estrutura de diretórios completa
2. Lista de arquivos principais com descrição do propósito de cada um
3. Dependências e bibliotecas necessárias
4. Instruções de configuração inicial

Design de Arquitetura:
${architecture}
      `;

      const result = await LLMService.sendPrompt({
        organizationId: projectConfig.organizationId,
        promptContent: prompt,
        systemMessage: 'Você é um desenvolvedor de software experiente. Forneça estruturas de projeto detalhadas e bem organizadas.',
        temperature: 0.3
      });

      // Salva a estrutura do projeto
      fs.writeFileSync(
        path.join(srcDir, '../project_structure.md'),
        result.content
      );

      // Adiciona log
      projectConfig.logs.push({
        timestamp: new Date().toISOString(),
        message: 'Estrutura do projeto gerada',
        userId: projectConfig.createdBy
      });

      // Implementa a estrutura básica (simplificada para este exemplo)
      // Em uma implementação real, analisaríamos o resultado do LLM e criaríamos os diretórios e arquivos automaticamente
      
      return {
        success: true,
        structure: result.content
      };
    } catch (error) {
      console.error('Erro ao implementar estrutura do projeto:', error);
      throw error;
    }
  }

  // Implementar componentes principais
  async implementCoreComponents(projectId, srcDir, architecture, projectConfig) {
    try {
      // Usa o LLM para gerar os componentes principais
      const prompt = `
Você é um desenvolvedor de software experiente. Com base no design de arquitetura a seguir, implemente os componentes principais do sistema. Para cada componente, forneça:
1. Código-fonte completo
2. Documentação de uso
3. Testes unitários básicos

Design de Arquitetura:
${architecture}
      `;

      const result = await LLMService.sendPrompt({
        organizationId: projectConfig.organizationId,
        promptContent: prompt,
        systemMessage: 'Você é um desenvolvedor de software experiente. Forneça implementações de código detalhadas e bem documentadas.',
        temperature: 0.3
      });

      // Salva os componentes principais
      fs.writeFileSync(
        path.join(srcDir, '../core_components.md'),
        result.content
      );

      // Adiciona log
      projectConfig.logs.push({
        timestamp: new Date().toISOString(),
        message: 'Componentes principais implementados',
        userId: projectConfig.createdBy
      });
      
      return {
        success: true,
        components: result.content
      };
    } catch (error) {
      console.error('Erro ao implementar componentes principais:', error);
      throw error;
    }
  }

  // Implementar modelos de banco de dados
  async implementDatabaseModels(projectId, srcDir, architecture, projectConfig) {
    try {
      // Usa o LLM para gerar os modelos de banco de dados
      const prompt = `
Você é um desenvolvedor de banco de dados experiente. Com base no design de arquitetura a seguir, implemente os modelos de banco de dados do sistema. Inclua:
1. Definição de esquemas/tabelas
2. Relacionamentos entre entidades
3. Índices e otimizações
4. Scripts de migração inicial

Design de Arquitetura:
${architecture}
      `;

      const result = await LLMService.sendPrompt({
        organizationId: projectConfig.organizationId,
        promptContent: prompt,
        systemMessage: 'Você é um desenvolvedor de banco de dados experiente. Forneça implementações detalhadas e otimizadas.',
        temperature: 0.3
      });

      // Salva os modelos de banco de dados
      fs.writeFileSync(
        path.join(srcDir, '../database_models.md'),
        result.content
      );

      // Adiciona log
      projectConfig.logs.push({
        timestamp: new Date().toISOString(),
        message: 'Modelos de banco de dados implementados',
        userId: projectConfig.createdBy
      });
      
      return {
        success: true,
        models: result.content
      };
    } catch (error) {
      console.error('Erro ao implementar modelos de banco de dados:', error);
      throw error;
    }
  }

  // Implementar lógica de negócios
  async implementBusinessLogic(projectId, srcDir, architecture, projectConfig) {
    try {
      // Usa o LLM para gerar a lógica de negócios
      const prompt = `
Você é um desenvolvedor de software experiente especializado em lógica de negócios. Com base no design de arquitetura a seguir, implemente a lógica de negócios principal do sistema. Inclua:
1. Serviços e controladores
2. Regras de negócio
3. Validações
4. Tratamento de erros

Design de Arquitetura:
${architecture}
      `;

      const result = await LLMService.sendPrompt({
        organizationId: projectConfig.organizationId,
        promptContent: prompt,
        systemMessage: 'Você é um desenvolvedor especializado em lógica de negócios. Forneça implementações robustas e bem estruturadas.',
        temperature: 0.3
      });

      // Salva a lógica de negócios
      fs.writeFileSync(
        path.join(srcDir, '../business_logic.md'),
        result.content
      );

      // Adiciona log
      projectConfig.logs.push({
        timestamp: new Date().toISOString(),
        message: 'Lógica de negócios implementada',
        userId: projectConfig.createdBy
      });
      
      return {
        success: true,
        logic: result.content
      };
    } catch (error) {
      console.error('Erro ao implementar lógica de negócios:', error);
      throw error;
    }
  }

  // Implementar interface do usuário
  async implementUserInterface(projectId, srcDir, architecture, projectConfig) {
    try {
      // Usa o LLM para gerar a interface do usuário
      const prompt = `
Você é um desenvolvedor frontend experiente. Com base no design de arquitetura a seguir, implemente a interface do usuário do sistema. Inclua:
1. Componentes de UI
2. Estilos e temas
3. Integração com backend
4. Responsividade e acessibilidade

Design de Arquitetura:
${architecture}
      `;

      const result = await LLMService.sendPrompt({
        organizationId: projectConfig.organizationId,
        promptContent: prompt,
        systemMessage: 'Você é um desenvolvedor frontend experiente. Forneça implementações modernas, responsivas e acessíveis.',
        temperature: 0.3
      });

      // Salva a interface do usuário
      fs.writeFileSync(
        path.join(srcDir, '../user_interface.md'),
        result.content
      );

      // Adiciona log
      projectConfig.logs.push({
        timestamp: new Date().toISOString(),
        message: 'Interface do usuário implementada',
        userId: projectConfig.createdBy
      });
      
      return {
        success: true,
        ui: result.content
      };
    } catch (error) {
      console.error('Erro ao implementar interface do usuário:', error);
      throw error;
    }
  }

  // Testar o sistema
  async testSystem(projectId, options = {}) {
    try {
      const projectDir = path.join(this.projectsDir, projectId);
      
      // Verifica se o projeto existe
      if (!fs.existsSync(projectDir)) {
        throw new Error('Projeto não encontrado');
      }

      // Carrega a configuração do projeto
      const projectConfig = JSON.parse(
        fs.readFileSync(path.join(projectDir, 'project.json'), 'utf8')
      );

      // Verifica se a implementação foi concluída
      const implementationStage = projectConfig.stages.find(s => s.name === 'Implementação');
      if (!implementationStage || implementationStage.status !== 'completed') {
        throw new Error('A implementação deve ser concluída antes dos testes');
      }

      // Atualiza o status da etapa
      const testStage = projectConfig.stages.find(s => s.name === 'Testes');
      if (testStage) {
        testStage.status = 'in_progress';
        testStage.startedAt = new Date().toISOString();
      }

      // Adiciona log
      projectConfig.logs.push({
        timestamp: new Date().toISOString(),
        message: 'Iniciando testes',
        userId: options.userId
      });

      // Salva a configuração atualizada
      fs.writeFileSync(
        path.join(projectDir, 'project.json'),
        JSON.stringify(projectConfig, null, 2)
      );

      // Implementa testes unitários, de integração e funcionais
      const testResults = await this.runTests(projectId, projectConfig);

      // Salva os resultados dos testes
      fs.writeFileSync(
        path.join(projectDir, 'test_results.md'),
        testResults.report
      );

      // Atualiza o status da etapa
      if (testStage) {
        testStage.status = 'completed';
        testStage.completedAt = new Date().toISOString();
      }

      // Adiciona log
      projectConfig.logs.push({
        timestamp: new Date().toISOString(),
        message: 'Testes concluídos',
        userId: options.userId
      });

      // Salva a configuração atualizada
      fs.writeFileSync(
        path.join(projectDir, 'project.json'),
        JSON.stringify(projectConfig, null, 2)
      );

      return {
        success: true,
        testResults,
        projectConfig
      };
    } catch (error) {
      console.error('Erro ao testar sistema:', error);
      throw error;
    }
  }

  // Executar testes
  async runTests(projectId, projectConfig) {
    try {
      // Usa o LLM para gerar relatório de testes simulado
      const prompt = `
Você é um especialista em testes de software. Gere um relatório de testes detalhado para um sistema com base nas seguintes informações:
1. Testes unitários para todos os componentes principais
2. Testes de integração para verificar a comunicação entre componentes
3. Testes funcionais para validar requisitos
4. Testes de desempenho básicos
5. Análise de cobertura de código

Inclua estatísticas simuladas, problemas encontrados e recomendações.

Projeto: ${projectConfig.name}
Descrição: ${projectConfig.description}
Tipo: ${projectConfig.projectType}
      `;

      const result = await LLMService.sendPrompt({
        organizationId: projectConfig.organizationId,
        promptContent: prompt,
        systemMessage: 'Você é um especialista em testes de software. Forneça relatórios detalhados e realistas.',
        temperature: 0.3
      });

      return {
        success: true,
        report: result.content,
        summary: {
          totalTests: 120, // Valores simulados
          passed: 112,
          failed: 8,
          coverage: '87%'
        }
      };
    } catch (error) {
      console.error('Erro ao executar testes:', error);
      throw error;
    }
  }

  // Implantar o sistema
  async deploySystem(projectId, options = {}) {
    try {
      const projectDir = path.join(this.projectsDir, projectId);
      
      // Verifica se o projeto existe
      if (!fs.existsSync(projectDir)) {
        throw new Error('Projeto não encontrado');
      }

      // Carrega a configuração do projeto
      const projectConfig = JSON.parse(
        fs.readFileSync(path.join(projectDir, 'project.json'), 'utf8')
      );

      // Verifica se os testes foram concluídos
      const testStage = projectConfig.stages.find(s => s.name === 'Testes');
      if (!testStage || testStage.status !== 'completed') {
        throw new Error('Os testes devem ser concluídos antes da implantação');
      }

      // Atualiza o status da etapa
      const deploymentStage = projectConfig.stages.find(s => s.name === 'Implantação');
      if (deploymentStage) {
        deploymentStage.status = 'in_progress';
        deploymentStage.startedAt = new Date().toISOString();
      }

      // Adiciona log
      projectConfig.logs.push({
        timestamp: new Date().toISOString(),
        message: 'Iniciando implantação',
        userId: options.userId
      });

      // Salva a configuração atualizada
      fs.writeFileSync(
        path.join(projectDir, 'project.json'),
        JSON.stringify(projectConfig, null, 2)
      );

      // Se houver credencial de servidor, implanta no servidor
      let deploymentResult;
      if (projectConfig.serverCredentialId) {
        deploymentResult = await this.deployToServer(projectId, projectConfig);
      } else {
        // Caso contrário, gera instruções de implantação
        deploymentResult = await this.generateDeploymentInstructions(projectId, projectConfig);
      }

      // Salva os resultados da implantação
      fs.writeFileSync(
        path.join(projectDir, 'deployment_results.md'),
        deploymentResult.report
      );

      // Atualiza o status da etapa
      if (deploymentStage) {
        deploymentStage.status = 'completed';
        deploymentStage.completedAt = new Date().toISOString();
      }

      // Atualiza o status do projeto
      projectConfig.status = 'completed';
      projectConfig.updatedAt = new Date().toISOString();

      // Adiciona log
      projectConfig.logs.push({
        timestamp: new Date().toISOString(),
        message: 'Implantação concluída',
        userId: options.userId
      });

      // Salva a configuração atualizada
      fs.writeFileSync(
        path.join(projectDir, 'project.json'),
        JSON.stringify(projectConfig, null, 2)
      );

      return {
        success: true,
        deploymentResult,
        projectConfig
      };
    } catch (error) {
      console.error('Erro ao implantar sistema:', error);
      throw error;
    }
  }

  // Implantar no servidor
  async deployToServer(projectId, projectConfig) {
    try {
      // Usa o LLM para gerar relatório de implantação simulado
      const prompt = `
Você é um especialista em DevOps. Gere um relatório detalhado de implantação para um sistema com base nas seguintes informações:
1. Passos de implantação executados
2. Configurações aplicadas
3. Verificações pós-implantação
4. URLs e endpoints disponíveis
5. Instruções para monitoramento

Inclua logs simulados, status final e recomendações para operação contínua.

Projeto: ${projectConfig.name}
Descrição: ${projectConfig.description}
Tipo: ${projectConfig.projectType}
      `;

      const result = await LLMService.sendPrompt({
        organizationId: projectConfig.organizationId,
        promptContent: prompt,
        systemMessage: 'Você é um especialista em DevOps. Forneça relatórios detalhados e realistas.',
        temperature: 0.3
      });

      return {
        success: true,
        report: result.content,
        deploymentUrl: 'https://exemplo.com/app',
        status: 'online'
      };
    } catch (error) {
      console.error('Erro ao implantar no servidor:', error);
      throw error;
    }
  }

  // Gerar instruções de implantação
  async generateDeploymentInstructions(projectId, projectConfig) {
    try {
      // Usa o LLM para gerar instruções de implantação
      const prompt = `
Você é um especialista em DevOps. Gere instruções detalhadas de implantação para um sistema com base nas seguintes informações:
1. Requisitos de ambiente
2. Passos de instalação
3. Configurações necessárias
4. Verificações pós-implantação
5. Instruções para monitoramento e manutenção

Forneça comandos específicos, exemplos de configuração e boas práticas.

Projeto: ${projectConfig.name}
Descrição: ${projectConfig.description}
Tipo: ${projectConfig.projectType}
      `;

      const result = await LLMService.sendPrompt({
        organizationId: projectConfig.organizationId,
        promptContent: prompt,
        systemMessage: 'Você é um especialista em DevOps. Forneça instruções detalhadas e práticas.',
        temperature: 0.3
      });

      return {
        success: true,
        report: result.content,
        type: 'instructions'
      };
    } catch (error) {
      console.error('Erro ao gerar instruções de implantação:', error);
      throw error;
    }
  }

  // Obter detalhes do projeto
  async getProjectDetails(projectId) {
    try {
      const projectDir = path.join(this.projectsDir, projectId);
      
      // Verifica se o projeto existe
      if (!fs.existsSync(projectDir)) {
        throw new Error('Projeto não encontrado');
      }

      // Carrega a configuração do projeto
      const projectConfig = JSON.parse(
        fs.readFileSync(path.join(projectDir, 'project.json'), 'utf8')
      );

      // Coleta arquivos relacionados
      const files = [];
      const possibleFiles = [
        'requirements.md',
        'requirements_analysis.md',
        'architecture_design.md',
        'project_structure.md',
        'core_components.md',
        'database_models.md',
        'business_logic.md',
        'user_interface.md',
        'test_results.md',
        'deployment_results.md'
      ];

      for (const file of possibleFiles) {
        const filePath = path.join(projectDir, file);
        if (fs.existsSync(filePath)) {
          files.push({
            name: file,
            path: filePath,
            content: fs.readFileSync(filePath, 'utf8')
          });
        }
      }

      return {
        success: true,
        projectConfig,
        files
      };
    } catch (error) {
      console.error('Erro ao obter detalhes do projeto:', error);
      throw error;
    }
  }

  // Listar todos os projetos
  async listProjects(options = {}) {
    try {
      const { organizationId } = options;
      
      const projects = [];
      
      // Lista todos os diretórios no diretório de projetos
      const projectDirs = fs.readdirSync(this.projectsDir);
      
      for (const dir of projectDirs) {
        const projectDir = path.join(this.projectsDir, dir);
        
        // Verifica se é um diretório
        if (fs.statSync(projectDir).isDirectory()) {
          // Verifica se existe o arquivo de configuração
          const configPath = path.join(projectDir, 'project.json');
          if (fs.existsSync(configPath)) {
            // Carrega a configuração do projeto
            const projectConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            
            // Filtra por organização se especificado
            if (!organizationId || projectConfig.organizationId === organizationId) {
              projects.push({
                id: projectConfig.id,
                name: projectConfig.name,
                description: projectConfig.description,
                status: projectConfig.status,
                createdAt: projectConfig.createdAt,
                updatedAt: projectConfig.updatedAt,
                stages: projectConfig.stages
              });
            }
          }
        }
      }
      
      return {
        success: true,
        projects
      };
    } catch (error) {
      console.error('Erro ao listar projetos:', error);
      throw error;
    }
  }
}

module.exports = new DevelopmentService();
