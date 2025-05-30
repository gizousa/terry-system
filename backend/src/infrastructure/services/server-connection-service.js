// Serviço para conexão e interação com servidores remotos
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const ServerCredential = require('../models/server-credential');

class ServerConnectionService {
  constructor() {
    this.activeConnections = new Map();
    this.KEYS_DIR = path.join(__dirname, '..', '..', '..', 'data', 'keys');
  }

  // Estabelece conexão com um servidor usando credenciais armazenadas
  async connect(credentialId) {
    try {
      // Verifica se já existe uma conexão ativa
      if (this.activeConnections.has(credentialId)) {
        return { success: true, message: 'Conexão já estabelecida', connectionId: credentialId };
      }

      // Busca as credenciais no banco de dados
      const credential = await ServerCredential.findById(credentialId);
      if (!credential) {
        throw new Error('Credencial não encontrada');
      }

      // Cria um novo cliente SSH
      const conn = new Client();

      // Prepara as opções de conexão
      const connectionOptions = {
        host: credential.connectionDetails.hostname,
        port: credential.connectionDetails.port || 22,
        username: credential.connectionDetails.username,
      };

      // Adiciona autenticação por chave privada ou senha
      if (credential.connectionDetails.usePrivateKey) {
        if (!credential.connectionDetails.privateKeyName) {
          throw new Error('Nome da chave privada não especificado');
        }

        const keyPath = path.join(this.KEYS_DIR, credential.connectionDetails.privateKeyName);
        if (!fs.existsSync(keyPath)) {
          throw new Error('Arquivo de chave privada não encontrado');
        }

        connectionOptions.privateKey = fs.readFileSync(keyPath);
        
        if (credential.connectionDetails.privateKeyPassphrase) {
          // Descriptografa a passphrase (implementação simplificada)
          const passphrase = credential.connectionDetails.privateKeyPassphrase.replace('encrypted:', '');
          connectionOptions.passphrase = passphrase;
        }
      } else {
        if (!credential.connectionDetails.password) {
          throw new Error('Senha não especificada');
        }

        // Descriptografa a senha (implementação simplificada)
        const password = credential.connectionDetails.password.replace('encrypted:', '');
        connectionOptions.password = password;
      }

      // Cria uma Promise para aguardar a conexão
      return new Promise((resolve, reject) => {
        // Configura handlers de eventos
        conn.on('ready', () => {
          // Armazena a conexão ativa
          this.activeConnections.set(credentialId, {
            client: conn,
            credential,
            lastActivity: Date.now()
          });

          // Atualiza o status da última conexão
          credential.lastConnection = {
            timestamp: new Date(),
            status: 'success',
            message: 'Conexão estabelecida com sucesso'
          };
          credential.save();

          resolve({ success: true, message: 'Conexão estabelecida com sucesso', connectionId: credentialId });
        });

        conn.on('error', (err) => {
          // Atualiza o status da última conexão
          credential.lastConnection = {
            timestamp: new Date(),
            status: 'failed',
            message: err.message
          };
          credential.save();

          reject(new Error(`Erro ao conectar: ${err.message}`));
        });

        // Inicia a conexão
        conn.connect(connectionOptions);
      });
    } catch (error) {
      console.error('Erro ao estabelecer conexão:', error);
      throw error;
    }
  }

  // Executa um comando no servidor
  async executeCommand(connectionId, command) {
    try {
      const connection = this.activeConnections.get(connectionId);
      if (!connection) {
        throw new Error('Conexão não encontrada ou expirada');
      }

      // Atualiza o timestamp de última atividade
      connection.lastActivity = Date.now();

      // Cria uma Promise para aguardar a execução do comando
      return new Promise((resolve, reject) => {
        connection.client.exec(command, (err, stream) => {
          if (err) {
            return reject(new Error(`Erro ao executar comando: ${err.message}`));
          }

          let stdout = '';
          let stderr = '';

          stream.on('close', (code) => {
            resolve({
              success: code === 0,
              exitCode: code,
              stdout,
              stderr
            });
          });

          stream.on('data', (data) => {
            stdout += data.toString();
          });

          stream.stderr.on('data', (data) => {
            stderr += data.toString();
          });
        });
      });
    } catch (error) {
      console.error('Erro ao executar comando:', error);
      throw error;
    }
  }

  // Transfere um arquivo para o servidor
  async uploadFile(connectionId, localPath, remotePath) {
    try {
      const connection = this.activeConnections.get(connectionId);
      if (!connection) {
        throw new Error('Conexão não encontrada ou expirada');
      }

      // Atualiza o timestamp de última atividade
      connection.lastActivity = Date.now();

      // Verifica se o arquivo local existe
      if (!fs.existsSync(localPath)) {
        throw new Error('Arquivo local não encontrado');
      }

      // Cria uma Promise para aguardar a transferência
      return new Promise((resolve, reject) => {
        connection.client.sftp((err, sftp) => {
          if (err) {
            return reject(new Error(`Erro ao iniciar SFTP: ${err.message}`));
          }

          const readStream = fs.createReadStream(localPath);
          const writeStream = sftp.createWriteStream(remotePath);

          writeStream.on('close', () => {
            resolve({ success: true, message: 'Arquivo transferido com sucesso' });
          });

          writeStream.on('error', (err) => {
            reject(new Error(`Erro ao transferir arquivo: ${err.message}`));
          });

          readStream.pipe(writeStream);
        });
      });
    } catch (error) {
      console.error('Erro ao transferir arquivo:', error);
      throw error;
    }
  }

  // Transfere um arquivo do servidor
  async downloadFile(connectionId, remotePath, localPath) {
    try {
      const connection = this.activeConnections.get(connectionId);
      if (!connection) {
        throw new Error('Conexão não encontrada ou expirada');
      }

      // Atualiza o timestamp de última atividade
      connection.lastActivity = Date.now();

      // Cria uma Promise para aguardar a transferência
      return new Promise((resolve, reject) => {
        connection.client.sftp((err, sftp) => {
          if (err) {
            return reject(new Error(`Erro ao iniciar SFTP: ${err.message}`));
          }

          const readStream = sftp.createReadStream(remotePath);
          const writeStream = fs.createWriteStream(localPath);

          writeStream.on('close', () => {
            resolve({ success: true, message: 'Arquivo baixado com sucesso' });
          });

          writeStream.on('error', (err) => {
            reject(new Error(`Erro ao baixar arquivo: ${err.message}`));
          });

          readStream.on('error', (err) => {
            reject(new Error(`Erro ao ler arquivo remoto: ${err.message}`));
          });

          readStream.pipe(writeStream);
        });
      });
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      throw error;
    }
  }

  // Fecha uma conexão específica
  async disconnect(connectionId) {
    try {
      const connection = this.activeConnections.get(connectionId);
      if (!connection) {
        return { success: true, message: 'Conexão já encerrada ou não existente' };
      }

      connection.client.end();
      this.activeConnections.delete(connectionId);

      return { success: true, message: 'Conexão encerrada com sucesso' };
    } catch (error) {
      console.error('Erro ao encerrar conexão:', error);
      throw error;
    }
  }

  // Fecha todas as conexões inativas
  async cleanupInactiveConnections(maxIdleTime = 30 * 60 * 1000) { // 30 minutos por padrão
    try {
      const now = Date.now();
      let closedCount = 0;

      for (const [connectionId, connection] of this.activeConnections.entries()) {
        if (now - connection.lastActivity > maxIdleTime) {
          connection.client.end();
          this.activeConnections.delete(connectionId);
          closedCount++;
        }
      }

      return { success: true, message: `${closedCount} conexões inativas encerradas` };
    } catch (error) {
      console.error('Erro ao limpar conexões inativas:', error);
      throw error;
    }
  }
}

module.exports = new ServerConnectionService();
