# Sistema Terry - Guia de Instalação no EasyPanel

Este repositório contém o sistema Terry, uma solução completa para desenvolvimento e suporte técnico assistido por IA, otimizado para instalação no EasyPanel.

## Visão Geral

O sistema Terry é uma plataforma SaaS multi-tenant que oferece:

- Integração com múltiplos provedores de LLM (OpenAI, DeepInfra, Grok, Hugging Face, etc.)
- Módulos de desenvolvimento e suporte técnico
- Automação de interfaces web
- Monitoramento em tempo real
- Integração com WhatsApp (EvolutionAPI e API Oficial)
- Sistema de comunicação via email

## Requisitos

- EasyPanel instalado e configurado
- Acesso à internet para download de imagens Docker
- Domínio configurado (opcional, mas recomendado para produção)

## Instalação no EasyPanel

1. No EasyPanel, crie um novo projeto chamado "terry"
2. Dentro do projeto, clique em "Novo Serviço"
3. Selecione "Compose Service"
4. Faça upload do arquivo `docker-compose.yaml` deste repositório
5. Configure as variáveis de ambiente necessárias (veja `.env.example`)
6. Inicie o serviço

## Configuração

Todas as configurações são gerenciadas através de variáveis de ambiente. Copie o arquivo `.env.example` para `.env` e ajuste conforme necessário:

- Credenciais do MongoDB
- Chaves de API para provedores de LLM
- Configurações de email (SMTP)
- Configurações de WhatsApp (EvolutionAPI e API Oficial)

## Estrutura do Projeto

- `docker-compose.yaml`: Configuração principal dos serviços
- `nginx/`: Configurações do servidor web
- `.env.example`: Exemplo de variáveis de ambiente

## Suporte

Para suporte ou dúvidas, entre em contato com a equipe de desenvolvimento.
