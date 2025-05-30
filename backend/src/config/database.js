// Configuração do banco de dados
const mongoose = require('mongoose');
const { Sequelize } = require('sequelize');
const redis = require('redis');
require('dotenv').config();

// Configuração do MongoDB
const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/terry', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Conexão com MongoDB estabelecida com sucesso');
  } catch (error) {
    console.error('Erro ao conectar ao MongoDB:', error);
    process.exit(1);
  }
};

// Configuração do PostgreSQL
const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'terry',
  process.env.POSTGRES_USER || 'postgres',
  process.env.POSTGRES_PASSWORD || 'postgres',
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

const connectPostgreSQL = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexão com PostgreSQL estabelecida com sucesso');
  } catch (error) {
    console.error('Erro ao conectar ao PostgreSQL:', error);
    process.exit(1);
  }
};

// Configuração do Redis
const redisClient = redis.createClient({
  url: process.env.REDIS_URI || 'redis://localhost:6379',
});

const connectRedis = async () => {
  try {
    await redisClient.connect();
    console.log('Conexão com Redis estabelecida com sucesso');
  } catch (error) {
    console.error('Erro ao conectar ao Redis:', error);
    // Não encerra o processo, pois o Redis pode ser opcional
  }
};

// Inicialização das conexões
const initializeDatabase = async () => {
  await connectMongoDB();
  await connectPostgreSQL();
  await connectRedis();
};

module.exports = {
  mongoose,
  sequelize,
  redisClient,
  initializeDatabase,
};
