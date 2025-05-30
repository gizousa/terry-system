// Configuração do servidor Express
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const passport = require('passport');
require('dotenv').config();

// Importação de rotas
const authRoutes = require('./routes/auth');
const organizationRoutes = require('./routes/organization');
const infrastructureRoutes = require('./routes/infrastructure');
const developmentRoutes = require('./routes/development');
const supportRoutes = require('./routes/support');
const automationRoutes = require('./routes/automation');
const communicationRoutes = require('./routes/communication');
const reportingRoutes = require('./routes/reporting');

// Configuração do app
const app = express();

// Middlewares de segurança
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Limitador de taxa para prevenir ataques de força bruta
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite de 100 requisições por IP
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Configuração do Passport
app.use(passport.initialize());
require('./config/passport')(passport);

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/infrastructure', infrastructureRoutes);
app.use('/api/development', developmentRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/communication', communicationRoutes);
app.use('/api/reporting', reportingRoutes);

// Rota para verificação de saúde
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Middleware para tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado'
  });
});

// Middleware para rotas não encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Inicialização do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor Terry rodando na porta ${PORT}`);
});

module.exports = app;
