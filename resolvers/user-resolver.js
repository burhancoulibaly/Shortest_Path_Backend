const { createAccessToken, createRefreshToken } = require('../auth'),
      db = require('../db');
//graphql schema
//Query schema
//Mutation Schema
const typeDefs = `
    extend type Query {
        login(username: String!, password: String!): LoginResponse!
    }

    extend type Mutation {
        register(username: String!, email: String!, password: String!): LoginResponse!
        guest(username: String!): LoginResponse!
    }

    type LoginResponse {
        response_type: String!
        response: String!
        username: String!
        role: String!
        accessToken: String!
    }
`;

//An object that contains mapping to get data that schema needs
const resolvers = {
    //Returns data from queries
    Query: {
        login: async(_, { username, password }, {res, req}) => {
            try {
                let response = await db.login(username, password);

                if(response[0]){
                    res.cookie('jid', createRefreshToken(username, response[1], "authenticated"), {
                        maxAge: 7 * 24 * 60 * 60 * 1000, // 7days 24hours 60minutes 60secs 1000ms
                        httpOnly: true,
                        sameSite: 'none',
                        secure: true
                    });

                    return {
                        response_type: `Success`,
                        response: `Login Successful`,
                        username: `${username}`,
                        role: `authenticated`,
                        accessToken: `${createAccessToken(username, response[1], "authenticated")}`
                    }
                };
            } catch (error) {
                return {
                    response_type: error.toString().split(":")[0].replace(" ",""),
                    response: error.toString().split(":")[1].replace(" ",""),
                    username: ``,
                    role: ``,
                    accessToken: ``
                }
            }
        }
    },
    //Mutations make changes to the database
    Mutation: {
        register: async(_, { username, email, password }, {res}) => {
            try {
                let response = await db.register(username, email, password);

                res.cookie('jid', createRefreshToken(username, response[1], "authenticated"), {
                    maxAge: 7 * 24 * 60 * 60 * 1000, // 7days 24hours 60minutes 60secs 1000ms
                    httpOnly: true,
                    sameSite: 'none',
                    secure: true
                });

                if(response[0]){
                    return {
                        response_type: `Success`,
                        response: `Registration Successful`,
                        username: `${username}`,
                        role: `authenticated`,
                        accessToken: `${createAccessToken(username, response[1], "authenticated")}`
                    }
                };
            } catch (error) {
                return {
                    response_type: error.toString().split(":")[0].replace(" ",""),
                    response: error.toString().split(":")[1].replace(" ",""),
                    username: ``,
                    role: ``,
                    accessToken: ``
                }
            }
        },
        guest: async(_, { username }, { res }) => {
            try {
                let response = await db.guest(username);

                res.cookie('jid', createRefreshToken(username, response[1], "guest"), {
                    maxAge: 7 * 24 * 60 * 60 * 1000, // 7days 24hours 60minutes 60secs 1000ms
                    httpOnly: true,
                    sameSite: 'none',
                    secure: true
                });
                
                if(response[0]){
                    return {
                        response_type: `Success`,
                        response: `Guest Login Successful`,
                        username: `${username}`,
                        role: `guest`,
                        accessToken: `${createAccessToken(username, response[1], "guest")}`
                    }
                }
            } catch (error) {
                return {
                    response_type: error.toString().split(":")[0].replace(" ",""),
                    response: error.toString().split(":")[1].replace(" ",""),
                    username: ``,
                    role: ``,
                    accessToken: ``
                }
            }
        }
    }
}

module.exports = {
    typeDefs,
    resolvers
}