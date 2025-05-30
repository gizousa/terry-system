// Serviço para integração com múltiplos provedores de LLM
const axios = require('axios');
const LLMProvider = require('../models/llm-provider');
const LLMUsage = require('../models/llm-usage');
const Prompt = require('../models/prompt');

class LLMService {
  constructor() {
    this.providerAdapters = {
      'openai': this.openaiAdapter,
      'deepinfra': this.deepinfraAdapter,
      'huggingface': this.huggingfaceAdapter,
      'grok': this.grokAdapter,
      'anthropic': this.anthropicAdapter,
      'custom': this.customAdapter
    };
  }

  // Método principal para enviar requisição para LLM
  async sendPrompt(options) {
    const {
      organizationId,
      promptId,
      promptContent,
      providerId,
      modelId,
      temperature = 0.7,
      maxTokens = 1000,
      systemMessage,
      inputs = {}
    } = options;

    try {
      // Busca configurações de uso da organização
      let usageSettings = await LLMUsage.findOne({ organizationId });
      
      // Se não existir, cria um novo registro
      if (!usageSettings) {
        usageSettings = new LLMUsage({ organizationId });
        await usageSettings.save();
      }
      
      // Verifica se a organização atingiu o limite
      if (usageSettings.settings.usageLimits.hasLimit && 
          usageSettings.usage.currentMonth.tokens >= usageSettings.settings.usageLimits.monthlyTokenLimit) {
        throw new Error('Limite mensal de tokens atingido para esta organização');
      }

      // Determina qual provedor usar
      let provider;
      if (providerId) {
        provider = await LLMProvider.findById(providerId);
        if (!provider || !provider.isActive) {
          throw new Error('Provedor especificado não encontrado ou inativo');
        }
      } else if (usageSettings.settings.customProviderSettings && usageSettings.settings.preferredProviderId) {
        provider = await LLMProvider.findById(usageSettings.settings.preferredProviderId);
        if (!provider || !provider.isActive) {
          // Fallback para o primeiro provedor ativo
          provider = await LLMProvider.findOne({ isActive: true });
        }
      } else {
        // Usa o primeiro provedor ativo
        provider = await LLMProvider.findOne({ isActive: true });
      }

      if (!provider) {
        throw new Error('Nenhum provedor LLM ativo encontrado');
      }

      // Determina qual modelo usar
      let modelToUse = modelId;
      if (!modelToUse) {
        // Verifica se a organização tem um modelo personalizado para este provedor
        if (usageSettings.settings.customProviderSettings) {
          const customModel = usageSettings.settings.customModels.find(
            m => m.providerId.toString() === provider._id.toString()
          );
          if (customModel) {
            modelToUse = customModel.modelId;
          }
        }
        
        // Se ainda não tiver um modelo, usa o padrão do provedor
        if (!modelToUse) {
          modelToUse = provider.defaultModel;
        }
      }

      // Verifica se o modelo existe no provedor
      const modelConfig = provider.models.find(m => m.modelId === modelToUse);
      if (!modelConfig) {
        throw new Error(`Modelo ${modelToUse} não encontrado no provedor ${provider.name}`);
      }

      // Prepara o prompt
      let finalPrompt;
      if (promptId) {
        const promptDoc = await Prompt.findById(promptId);
        if (!promptDoc) {
          throw new Error('Prompt não encontrado');
        }
        finalPrompt = this.processPromptTemplate(promptDoc.content, inputs);
      } else if (promptContent) {
        finalPrompt = this.processPromptTemplate(promptContent, inputs);
      } else {
        throw new Error('É necessário fornecer um promptId ou promptContent');
      }

      // Registra o início da requisição
      const startTime = Date.now();

      // Envia a requisição para o provedor
      const providerType = provider.name.toLowerCase();
      const adapterFn = this.providerAdapters[providerType] || this.providerAdapters.custom;
      
      const response = await adapterFn.call(this, {
        provider,
        modelId: modelToUse,
        prompt: finalPrompt,
        systemMessage,
        temperature,
        maxTokens
      });

      // Calcula o tempo de resposta
      const responseTime = Date.now() - startTime;

      // Registra o uso
      const tokensUsed = response.usage.promptTokens + response.usage.completionTokens;
      const cost = (response.usage.promptTokens * modelConfig.costPer1kTokens.input / 1000) + 
                  (response.usage.completionTokens * modelConfig.costPer1kTokens.output / 1000);
      
      await usageSettings.recordUsage(tokensUsed, cost, provider._id, modelToUse);

      // Atualiza métricas do prompt se for um prompt do banco de dados
      if (promptId) {
        const promptDoc = await Prompt.findById(promptId);
        if (promptDoc) {
          await promptDoc.updateMetrics(true, tokensUsed, responseTime);
        }
      }

      return {
        success: true,
        content: response.content,
        usage: response.usage,
        provider: provider.name,
        model: modelToUse,
        responseTime
      };

    } catch (error) {
      console.error('Erro ao enviar prompt para LLM:', error);

      // Tenta fallback se o erro for do provedor
      if (error.message.includes('provedor') || error.response) {
        try {
          return await this.handleFallback(options, error);
        } catch (fallbackError) {
          throw fallbackError;
        }
      }

      throw error;
    }
  }

  // Método para lidar com fallback para outro provedor
  async handleFallback(options, originalError) {
    const { organizationId, providerId } = options;

    // Busca o provedor original
    const originalProvider = await LLMProvider.findById(providerId);
    
    if (!originalProvider || !originalProvider.fallbackProvider) {
      throw new Error(`Falha na requisição LLM e nenhum fallback configurado: ${originalError.message}`);
    }

    // Busca o provedor de fallback
    const fallbackProvider = await LLMProvider.findById(originalProvider.fallbackProvider);
    
    if (!fallbackProvider || !fallbackProvider.isActive) {
      throw new Error(`Provedor de fallback não encontrado ou inativo: ${originalError.message}`);
    }

    // Registra o fallback
    const usageSettings = await LLMUsage.findOne({ organizationId });
    if (usageSettings) {
      await usageSettings.recordFallback(
        originalProvider._id,
        fallbackProvider._id,
        originalError.message
      );
    }

    // Tenta novamente com o provedor de fallback
    const fallbackOptions = {
      ...options,
      providerId: fallbackProvider._id,
      modelId: null // Usa o modelo padrão do provedor de fallback
    };

    console.log(`Realizando fallback de ${originalProvider.name} para ${fallbackProvider.name}`);
    
    return this.sendPrompt(fallbackOptions);
  }

  // Processa template de prompt substituindo variáveis
  processPromptTemplate(template, inputs) {
    let processedPrompt = template;
    
    // Substitui variáveis no formato {{variableName}}
    for (const [key, value] of Object.entries(inputs)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processedPrompt = processedPrompt.replace(regex, value);
    }
    
    return processedPrompt;
  }

  // Adaptadores para diferentes provedores de LLM
  
  // Adaptador para OpenAI
  async openaiAdapter({ provider, modelId, prompt, systemMessage, temperature, maxTokens }) {
    const messages = [];
    
    if (systemMessage) {
      messages.push({ role: 'system', content: systemMessage });
    }
    
    messages.push({ role: 'user', content: prompt });
    
    const response = await axios.post(
      provider.endpoint,
      {
        model: modelId,
        messages,
        temperature,
        max_tokens: maxTokens
      },
      {
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return {
      content: response.data.choices[0].message.content,
      usage: {
        promptTokens: response.data.usage.prompt_tokens,
        completionTokens: response.data.usage.completion_tokens,
        totalTokens: response.data.usage.total_tokens
      }
    };
  }
  
  // Adaptador para DeepInfra
  async deepinfraAdapter({ provider, modelId, prompt, systemMessage, temperature, maxTokens }) {
    const messages = [];
    
    if (systemMessage) {
      messages.push({ role: 'system', content: systemMessage });
    }
    
    messages.push({ role: 'user', content: prompt });
    
    const response = await axios.post(
      provider.endpoint,
      {
        model: modelId,
        messages,
        temperature,
        max_tokens: maxTokens
      },
      {
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return {
      content: response.data.choices[0].message.content,
      usage: {
        promptTokens: response.data.usage.prompt_tokens,
        completionTokens: response.data.usage.completion_tokens,
        totalTokens: response.data.usage.total_tokens
      }
    };
  }
  
  // Adaptador para Hugging Face
  async huggingfaceAdapter({ provider, modelId, prompt, systemMessage, temperature, maxTokens }) {
    let fullPrompt = prompt;
    
    if (systemMessage) {
      fullPrompt = `${systemMessage}\n\n${prompt}`;
    }
    
    const response = await axios.post(
      provider.endpoint,
      {
        inputs: fullPrompt,
        parameters: {
          temperature,
          max_new_tokens: maxTokens,
          return_full_text: false
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Estima o uso de tokens (Hugging Face não retorna contagem de tokens)
    const promptTokens = Math.ceil(fullPrompt.length / 4);
    const completionTokens = Math.ceil(response.data[0].generated_text.length / 4);
    
    return {
      content: response.data[0].generated_text,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens
      }
    };
  }
  
  // Adaptador para Grok
  async grokAdapter({ provider, modelId, prompt, systemMessage, temperature, maxTokens }) {
    // Implementação similar ao OpenAI, ajustada para a API do Grok
    const messages = [];
    
    if (systemMessage) {
      messages.push({ role: 'system', content: systemMessage });
    }
    
    messages.push({ role: 'user', content: prompt });
    
    const response = await axios.post(
      provider.endpoint,
      {
        model: modelId,
        messages,
        temperature,
        max_tokens: maxTokens
      },
      {
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return {
      content: response.data.choices[0].message.content,
      usage: {
        promptTokens: response.data.usage.prompt_tokens,
        completionTokens: response.data.usage.completion_tokens,
        totalTokens: response.data.usage.total_tokens
      }
    };
  }
  
  // Adaptador para Anthropic
  async anthropicAdapter({ provider, modelId, prompt, systemMessage, temperature, maxTokens }) {
    const messages = [];
    
    if (systemMessage) {
      messages.push({ role: 'system', content: systemMessage });
    }
    
    messages.push({ role: 'user', content: prompt });
    
    const response = await axios.post(
      provider.endpoint,
      {
        model: modelId,
        messages,
        temperature,
        max_tokens: maxTokens
      },
      {
        headers: {
          'x-api-key': provider.apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return {
      content: response.data.content[0].text,
      usage: {
        promptTokens: response.data.usage.input_tokens,
        completionTokens: response.data.usage.output_tokens,
        totalTokens: response.data.usage.input_tokens + response.data.usage.output_tokens
      }
    };
  }
  
  // Adaptador para provedores personalizados
  async customAdapter({ provider, modelId, prompt, systemMessage, temperature, maxTokens }) {
    // Implementação genérica que tenta se adaptar ao formato do provedor
    let payload = {
      model: modelId,
      temperature,
      max_tokens: maxTokens
    };
    
    // Tenta diferentes formatos de mensagem
    if (systemMessage) {
      // Formato de chat
      payload.messages = [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt }
      ];
    } else {
      // Tenta tanto o formato de chat quanto o formato de texto simples
      payload.messages = [{ role: 'user', content: prompt }];
      payload.prompt = prompt;
    }
    
    const response = await axios.post(
      provider.endpoint,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Tenta extrair o conteúdo da resposta em diferentes formatos
    let content = '';
    if (response.data.choices && response.data.choices[0]) {
      if (response.data.choices[0].message) {
        content = response.data.choices[0].message.content;
      } else if (response.data.choices[0].text) {
        content = response.data.choices[0].text;
      }
    } else if (response.data.content) {
      content = response.data.content;
    } else if (response.data.generated_text) {
      content = response.data.generated_text;
    } else if (typeof response.data === 'string') {
      content = response.data;
    }
    
    // Tenta extrair informações de uso de tokens
    let usage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0
    };
    
    if (response.data.usage) {
      usage.promptTokens = response.data.usage.prompt_tokens || response.data.usage.input_tokens || 0;
      usage.completionTokens = response.data.usage.completion_tokens || response.data.usage.output_tokens || 0;
      usage.totalTokens = response.data.usage.total_tokens || (usage.promptTokens + usage.completionTokens);
    } else {
      // Estima o uso de tokens
      usage.promptTokens = Math.ceil(prompt.length / 4);
      usage.completionTokens = Math.ceil(content.length / 4);
      usage.totalTokens = usage.promptTokens + usage.completionTokens;
    }
    
    return { content, usage };
  }
}

module.exports = new LLMService();
