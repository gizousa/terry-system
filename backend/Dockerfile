# Dockerfile para o backend do sistema Terry
FROM node:20-alpine

# Diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm install --omit=dev

# Copiar o código-fonte
COPY . .

# Expor a porta
EXPOSE 3000

# Comando para iniciar o servidor
CMD ["node", "src/backend/index.js"]
