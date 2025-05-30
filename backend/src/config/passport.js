// Configuração do Passport para autenticação
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
require('dotenv').config();

// Importação dos modelos
const User = require('../auth/models/user');

module.exports = (passport) => {
  // Estratégia JWT para autenticação via token
  const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET || 'terry-secret-key',
  };

  passport.use(
    new JwtStrategy(opts, async (jwt_payload, done) => {
      try {
        const user = await User.findById(jwt_payload.id);
        if (user) {
          return done(null, user);
        }
        return done(null, false);
      } catch (error) {
        return done(error, false);
      }
    })
  );

  // Estratégia Local para autenticação via username/password
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
      },
      async (email, password, done) => {
        try {
          // Busca o usuário pelo email
          const user = await User.findOne({ email });
          
          // Verifica se o usuário existe
          if (!user) {
            return done(null, false, { message: 'Usuário não encontrado' });
          }

          // Verifica se a senha está correta
          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
            return done(null, false, { message: 'Senha incorreta' });
          }

          // Retorna o usuário se a autenticação for bem-sucedida
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );
};
