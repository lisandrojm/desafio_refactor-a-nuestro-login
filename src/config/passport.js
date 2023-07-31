/* ************************************************************************** */
/* /src/config/passport.js - . */
/* ************************************************************************** */
const passport = require('passport');
const local = require('passport-local');
const { User } = require('../models/users');
const { Cart } = require('../models/carts');
const { createHash, isValidPassword } = require('../utils/bcrypt/bcrypt');
const GitHubStrategy = require('passport-github2');
const { config } = require('../config');

const LocalStrategy = local.Strategy;
const initializePassport = () => {
  console.log('Passport running');
  /*Passport Register */
  passport.use(
    'register',
    new LocalStrategy(
      {
        passReqToCallback: true,
        usernameField: 'email',
      },
      async (req, username, password, done) => {
        const { first_name, last_name, email, age } = req.body;
        try {
          let user = await User.findOne({ email: username });
          if (user) {
            console.log('Passport Register alert. El usuario ya existe');
            return done(null, { userExists: true });
          }
          const newUser = new User({
            first_name,
            last_name,
            email,
            age,
            /* Implementación de creación de hash del password del algoritmo de hashing de cotraseñas bcrypt */
            password: createHash(password),
          });

          await newUser.save();

          /* Crear un carrito vinculado al ID del usuario */
          const userCart = new Cart({
            user: newUser._id,
            products: [],
          });
          await userCart.save();

          /* Asignar el ID del carrito recién creado al usuario */
          newUser.cart = userCart._id;
          await newUser.save();

          const data = newUser;
          console.log('Passport Register success. Usuario registrado.', data);
          return done(null, data);
        } catch (error) {
          return done('Passport Register error. Error al obtener el usuario:' + error);
        }
      }
    )
  );
  /*Passport Login */
  passport.use(
    'login',
    new LocalStrategy(
      {
        passReqToCallback: true,
        usernameField: 'email',
      },
      async (req, username, password, done) => {
        try {
          if (username === 'adminCoder@coder.com' && password === 'adminCod3r123') {
            /* Admin login */
            const adminUser = {
              email: 'adminCoder@coder.com',
              admin: true,
              role: 'admin',
            };
            delete adminUser.password;
            console.log('Passport Admin Login success', adminUser);
            return done(null, adminUser);
          } else {
            /* User login */
            const user = await User.findOne({ email: username });
            if (!user || !isValidPassword(password, user)) {
              console.log('Passport Login alert. Invalid credentials');
              return done(null, false);
            }
            delete user.password;
            const data = user;
            console.log('Passport User Login success', data);
            return done(null, data);
          }
        } catch (error) {
          return done('Passport Login error: ' + error);
        }
      }
    )
  );
  passport.use(
    'github',
    new GitHubStrategy(
      {
        clientID: `${config.github_client_id}`,
        clientSecret: `${config.github_secret_key}`,
        callbackURL: `${config.github_callback_url}`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          console.log(profile);
          let user = await User.findOne({ email: profile._json.email });
          if (!user) {
            let newUser = {
              first_name: profile._json.name,
              last_name: 'GitHub user',
              email: profile._json.email,
              password: '[]',
            };
            let result = await User.create(newUser);

            const userCart = new Cart({
              user: result._id,
              products: [],
            });
            await userCart.save();

            result.cart = userCart._id;
            await result.save();

            done(null, result);
          } else {
            done(null, user);
          }
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user._id);
  });
  passport.deserializeUser(async (id, done) => {
    let user = await User.findById(id);
    done(null, user);
  });
};
module.exports = initializePassport;
