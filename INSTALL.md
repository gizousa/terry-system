# Guia de Instalação do Sistema Terry no EasyPanel

Este guia fornece instruções detalhadas para instalar o sistema Terry no EasyPanel usando o padrão de buildpack.

## Pré-requisitos

- EasyPanel instalado e configurado
- Acesso à internet para download de imagens Docker
- Domínio configurado (opcional, mas recomendado para produção)

## Instalação Passo a Passo

### 1. Criar um Novo Projeto no EasyPanel

1. Faça login no painel administrativo do EasyPanel
2. Clique em "Projetos" no menu lateral
3. Clique no botão "Novo Projeto"
4. Digite "terry" como nome do projeto
5. Clique em "Criar"

### 2. Adicionar um Novo Serviço Compose

1. Dentro do projeto "terry", clique em "Novo Serviço"
2. Selecione "Compose Service"
3. Digite "terry-system" como nome do serviço

### 3. Configurar o Serviço Compose

1. Na seção "Docker Compose", você tem duas opções:
   - **Opção A**: Fazer upload do arquivo `docker-compose.yaml` deste repositório
   - **Opção B**: Colar o conteúdo do arquivo `docker-compose.yaml` no editor

2. Na seção "Environment Variables", adicione as variáveis de ambiente necessárias:
   - `MONGO_ROOT_USER`: admin (ou seu usuário preferido)
   - `MONGO_ROOT_PASSWORD`: uma senha segura
   - `MONGO_DATABASE`: terry
   - `MONGO_USER`: terry_user
   - `MONGO_PASSWORD`: uma senha segura
   - `JWT_SECRET`: uma string aleatória e segura
   - `OPENAI_API_KEY`: sua chave da API OpenAI (opcional)
   - `DEEPINFRA_API_KEY`: sua chave da API DeepInfra (opcional)
   - Adicione outras variáveis conforme necessário (veja `.env.example`)

3. Clique em "Criar" para iniciar o serviço

### 4. Configurar Domínio (Opcional)

1. Após a criação do serviço, clique no serviço "terry-system"
2. Vá para a aba "Domains"
3. Adicione seu domínio (ex: terry.seudominio.com)
4. Configure o SSL conforme necessário

## Verificação da Instalação

1. Acesse o domínio configurado (ou o IP com a porta mapeada)
2. Você deverá ver a tela de login do sistema Terry
3. Faça login com as credenciais padrão:
   - Usuário: `admin@terry.com`
   - Senha: `admin123`
4. Após o login, você será solicitado a alterar a senha padrão

## Solução de Problemas

### Problema: Serviço não inicia
- Verifique os logs do serviço no EasyPanel
- Certifique-se de que todas as variáveis de ambiente obrigatórias estão configuradas
- Verifique se o EasyPanel tem acesso à internet para baixar as imagens

### Problema: Não é possível acessar a interface web
- Verifique se o serviço nginx está em execução
- Verifique se o domínio está configurado corretamente
- Verifique se as portas estão mapeadas corretamente

### Problema: Erro de autenticação no MongoDB
- Verifique se as credenciais do MongoDB estão configuradas corretamente
- Verifique se o serviço MongoDB está em execução

## Suporte

Para suporte adicional, entre em contato com a equipe de desenvolvimento.
