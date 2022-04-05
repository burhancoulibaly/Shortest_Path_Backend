const { createAccessToken, createRefreshToken } = require('../auth'),
      db = require('../db');
      
const typeDefs = `
    extend type Query {
        getUserMap(mapName: String!): Map!
        getUsersMaps(username: String!): [Map!]
        getAllUserMaps: [Map!]
        get10PathsMaps: [Map!]
    }

    extend type Mutation {
        saveMap(username: String!, mapName: String!, map: [SquareObject!]): Response!
        editMap(username: String!, mapNameOrig: String!, mapNameEdit: String!, map: [SquareObject!]): Response!
        deleteMap(username: String!, mapName: String!): Response!
    }

    input SquareObject {
        val: Boolean!
        type: String
        x: Int!
        y: Int!
    }
    
    type Square {
        val: Boolean!
        type: String
        x: Int!
        y: Int!
    } 
    
    type Map {
        owner: String!
        name: String!
        map: [Square]!
        highest_score: String,
        second_highest_score: String,
        third_highest_score: String,
    }
`;

const resolvers = {
    Query: {
        getUserMap: async(_, { mapName }, { req }) => {
            if(req.payload.response_type !== "authenticated"){
                throw new Error("User not authenticated");
            }

            try {
                const map = await db.getUserMap(mapName);
                
                return map;
            } catch (error) {
                console.log(error);

                throw error;
            }
        },
        getUsersMaps: async(_, { username }, { req }) => {
            if(req.payload.response_type !== "authenticated"){
                throw new Error("User not authenticated");
            }

            try {
                const maps = await db.getUsersMaps(username);
                
                return maps;
            } catch (error) {
                console.log(error);

                throw error;
            }
        },
        getAllUserMaps: async(_, data, { req }) => {
            if(req.payload.response_type !== "authenticated"){
                throw new Error("User not authenticated");
            }

            return {
                owner: "",
                name: "",
                map: [],
                highscore_one: ``,
                highscore_two: ``,
                highscore_three: ``
            }
        },
        get10PathsMaps: async(_, data, { req }) => {
            if(req.payload.response_type !== "authenticated"){
                throw new Error("User not authenticated");
            }

            return {
                owner: "",
                name: "",
                map: [],
                highscore_one: ``,
                highscore_two: ``,
                highscore_three: ``
            }
        },
    },
    Mutation: {
        saveMap: async(_, { username, mapName, map }, {req}) => {
            if(req.payload.response_type !== "authenticated" || req.payload.response.username !== username){
                throw new Error("User not authenticated");
            }

            try { 
                response = await db.saveMap(username, mapName, map); 

                return {
                    response_type: `Success`,
                    response: `${response}`,
                }
            } catch (error) {
                return {
                    response_type: error.toString().split(":")[0].replace(" ",""),
                    response: error.toString().split(":")[1].replace(" ",""),
                }
            }      
        },
        editMap: async(_, { username, mapNameOrig, mapNameEdit, map }, {req}) => {
            if(req.payload.response_type !== "authenticated" || req.payload.response.username !== username){
                throw new Error("User not authenticated");
            }

            try { 
                response = await db.editMap(username, mapNameOrig, mapNameEdit, map); 

                return {
                    response_type: `Success`,
                    response: `${response}`,
                }
            } catch (error) {
                return {
                    response_type: error.toString().split(":")[0].replace(" ",""),
                    response: error.toString().split(":")[1].replace(" ",""),
                }
            }      
        },
        deleteMap: async(_, { username, mapName }, {req}) => {
            if(req.payload.response_type !== "authenticated" || req.payload.response.username !== username){
                throw new Error("User not authenticated");
            }

            try { 
                response = await db.deleteMap(username, mapName); 

                return {
                    response_type: `Success`,
                    response: `${response}`,
                }
            } catch (error) {
                return {
                    response_type: error.toString().split(":")[0].replace(" ",""),
                    response: error.toString().split(":")[1].replace(" ",""),
                }
            } 
        }
    }
};

module.exports = {
    typeDefs,
    resolvers
}