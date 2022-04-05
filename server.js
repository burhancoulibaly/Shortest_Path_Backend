const express = require('express'),
      app = express(),
      cors = require('cors'),
      server = require('http').createServer(app),
      { merge } = require('lodash'),
      { ApolloServer } = require('apollo-server-express'),
      { resolvers, typeDefs } = require('./resolvers/resolver'),
      { resolvers: userResolver, typeDefs: userTypeDefs } = require('./resolvers/user-resolver'),
      { resolvers: mapResolver, typeDefs: mapTypeDefs } = require('./resolvers/map-resolver'),
      { authenticateUser, revokeTokens, refreshToken, deleteToken } = require('./auth'),
      bodyParser = require('body-parser'),
      cookieParser = require("cookie-parser");

let whitelist = ['https://shortestpathapp.herokuapp.com'];

let corsOptions = {
    origin: function (origin, callback) {
        if (whitelist.indexOf(origin) !== -1) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    },
    credentials: true
}

//integrating graphql settings
const apolloServer = new ApolloServer({
    typeDefs: [typeDefs, userTypeDefs, mapTypeDefs], 
    resolvers: merge(resolvers, userResolver, mapResolver),
    context: ({ req, res }) => ({ req, res })
});

app.set('trust proxy', 1);
app.use(cookieParser(corsOptions));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(authenticateUser);
app.use(cors(corsOptions));

(async () => {
    await apolloServer.start();
  
    apolloServer.applyMiddleware({ 
      app,
      cors: corsOptions
    });
  })();

server.listen(process.env.PORT || 3000);
console.log(`Server listening on port: ${process.env.PORT || 3000}`);

app.get('/', async(req,res) => {
    console.log("Welcome to shortest paths");
});

app.post('/revokeTokens', async(req, res) => {
    try {
        let response = await revokeTokens(req.body.email);

        res.status(200).send(response);
        return;
    } catch (error) {
        res.status(400).send(error);
        return;
    }
})

app.get('/refreshToken', async(req, res) => {
    try {
        let response = await refreshToken(req.cookies.jid, res);

        res.status(200).send(response);
        return;

    } catch (error) {
        res.status(400).send(error);
        return;
    }
})

app.get('/deleteRefreshToken', async(req, res) => {
    try {
        console.log(req.cookies.jid)
        let response = await deleteToken(req.cookies.jid, res);

        res.status(200).send(response);
        return;
    } catch (error) {
        res.status(400).send(error);
        return;
    }
})