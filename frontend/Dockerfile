# Dockerfile para o frontend do sistema Terry
FROM node:20-alpine as build

# Diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar o código-fonte
COPY . .

# Construir o aplicativo
RUN npm run build

# Estágio de produção
FROM nginx:alpine

# Copiar os arquivos de build para o diretório do nginx
COPY --from=build /app/build /usr/share/nginx/html

# Copiar a configuração do nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expor a porta
EXPOSE 80

# Comando para iniciar o nginx
CMD ["nginx", "-g", "daemon off;"]
