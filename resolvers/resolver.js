//graphql schema
//Query schema
//Mutation Schema
const typeDefs = `
    type Query {
        _empty: String!
    }

    type Mutation {
        _empty: String!
    }

    type Response {
        response_type: String!
        response: String!
    }
`;

const resolvers = {}

module.exports = {
    typeDefs,
    resolvers
}