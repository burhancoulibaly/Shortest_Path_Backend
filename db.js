const resolver = require("./resolvers/resolver.js"),
      { sign, verify } = require('jsonwebtoken');

const admin = require("firebase-admin"),
      { hash, genSalt, compareSync } = require('bcrypt'),
      { config } = require('./config/config.js'),
      serviceAccount = config;

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

function login(username, password){
    return new Promise(async (resolve, reject) => {
        try {
            let snapshot = await db.collection('login').doc(username).get();
            let response = snapshot.data();

            if(!response){
                throw new Error("Invalid login");
            }
    
            if (compareSync(password, response.password)){
                return resolve([true, response.token_version]);
            }else{
                throw new Error("Invalid Login");
            }
        } catch (error) {
            return reject(error);
        }
    });
}

function guest(username){
    return new Promise(async (resolve, reject) => {
        try {
            const tokenVersion = 0;

            let userRef = db.collection('user').doc(username);
            let response = (await userRef.get()).data();

            if(response){
                throw new Error("Account already exist");
            }  

            await userRef.set({
                username: `${username}`,
                role: "guest"
            })

            return resolve([true, tokenVersion]);
        } catch (error) {
            // console.log(error);
            return reject(error);
        }
    })
}

function register(username, email, password){
    return new Promise(async (resolve, reject) => {
        try {
            const saltRounds = 12;
            const salt = await genSalt(saltRounds);
            const hashedPassword = await hash(password,salt);
            const tokenVersion = 0;

            let userRef = db.collection('user').doc(username);
            let loginRef = db.collection('login').doc(username);

            let response = (await userRef.get()).data();
            
            if(response){
                throw new Error("Account already exist");
            }

            //add way for checking if email exist in db as well.

            await userRef.set({
                email: `${email}`,
                username: `${username}`,
                role: "authenticated"
            })

            await loginRef.set({
                password: `${hashedPassword}`,
                token_version: `${tokenVersion}`
            })

            return resolve([true, tokenVersion]);
        } catch (error) {
            return reject(error);
        }
    });
}

async function refreshToken(refreshToken){
    return new Promise(async(resolve, reject) => {
        try{
            payload = verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

            if(payload.role == "guest"){
                let userSnapshot = await db.collection('user').doc(payload.username).get();
                let userResponse = userSnapshot.data();

                if(!userResponse){
                    throw new Error("Invalid user");
                }

                return resolve([{ 
                    response_type: `Success`,
                    response: `Token refresh`,  
                    username: `${payload.username}`, 
                    role: `${payload.role}`,
                    accessToken: ``
                }, payload.username, 0, payload.role]);//guest users dont have a tokenVersion saved,
            }

            //Since token is valid a new accessToken is returned;
            let loginSnapshot = await db.collection('login').doc(payload.username).get();
            let loginResponse = loginSnapshot.data();

            if(!loginResponse){
                throw new Error("Invalid user");
            }

            if(payload.tokenVersion != loginResponse.token_version){
                throw new Error("Invalid token");
            }
            
            return resolve([{ 
                response_type: `Success`,
                response: `Token refresh`, 
                username: `${payload.username}`, 
                role: `${payload.role}`,
                accessToken: ``
            }, payload.username, loginResponse.token_version, payload.role]);
        }catch(error){
            return reject({ 
                response_type: error.toString().split(":")[0].replace(" ",""),
                response: error.toString().split(":")[1].replace(" ",""),
                accessToken: ``
            });
        }
    })
}

function revokeTokens(email){
    return new Promise(async(resolve, reject) => {
        //revoke token logic here
        try {
            let username;

            let userSnapshot = await db.collection('user').get();

            for(let i = 0; userSnapshot.docs.length; i++){
                if(userSnapshot.docs[i].data().email == email){
                    username = userSnapshot.docs[i].data().username;
                    break;
                }
            }

            let loginSnapshot = await db.collection('login').doc(username).get();
            let loginResponse = loginSnapshot.data();

            let loginRef = await db.collection('login').doc(username);

            await loginRef.update({
                token_version: ++loginResponse.token_version
            })

            return resolve({
                response_type: "Success",
                response: "User tokens Revoked"
            });
        } catch (error) {
            return reject({
                response_type: error.toString().split(":")[0].replace(" ",""),
                response: error.toString().split(":")[1].replace(" ","")
            });
        }
    })
}

function cleanUserDB(refreshToken){
    return new Promise(async(resolve, reject) => {
        try{
            payload = verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    
            if(!payload){
                throw new Error("Empty refresh token");
            }
    
            if(payload.role == "guest"){
                loginRef = await db.collection('login').doc(payload.username);
                userRef = await db.collection('user').doc(payload.username);
    
                loginRef.delete();
                userRef.delete();

                return resolve({
                    response_type: "Success",
                    response: "Guest user removed from db"
                });
            }

            return resolve({
                response_type: "Success",
                response: "User is not a guest user"
            });
    
        }catch(error){
            return reject(error);
        }
    });
}

function saveMap(username, mapName, map){
    return new Promise(async(resolve, reject) => {
        const userRef = db.collection('user').doc(username).collection("maps").doc(mapName);
        const userMapsRef = db.collection('user_maps').doc(mapName);

        try { 
            if((await db.collection('user').doc(username).collection("maps").doc(mapName).get()).data()){
                console.log((await db.collection('user').doc(username).collection("maps").doc(mapName).get()).data())
                throw new Error("A map with this name already exist");
            }

            await userMapsRef.set({
                name: mapName,
                map: map,
                owner: username,
                highest_score: null,
                second_highest_score: null,
                third_highest_score: null,
            }); 

            await userRef.set({
                map: userMapsRef
            })

            resolve("User map saved");
        } catch (error) {
            reject(error);
        }
    });
}

function editMap(username, mapNameOrig, mapNameEdit, map){
    return new Promise(async(resolve, reject) => {
        const origUserRef = db.collection('user').doc(username).collection("maps").doc(mapNameOrig);
        const origUserMapsRef = db.collection('user_maps').doc(mapNameOrig);

        let origUserMapsRefData;

        try {
            origUserMapsRefData = await origUserMapsRef.get();

            await origUserRef.delete();
            await origUserMapsRef.delete();
        }catch (error) {
            reject(error);
        }

        const editUserRef = db.collection('user').doc(username).collection("maps").doc(mapNameEdit);
        const editUserMapsRef = db.collection('user_maps').doc(mapNameEdit);
        
        try {
            await editUserMapsRef.set({
                name: mapNameEdit,
                map: map,
                owner: username,
                highest_score: origUserMapsRefData.data().highest_score,
                second_highest_score: origUserMapsRefData.data().second_highest_score,
                third_highest_score: origUserMapsRefData.data().third_highest_score,
            }); 

            await editUserRef.set({
                map: editUserMapsRef
            })

            resolve("User map edited");
        } catch (error) {
            reject(error);
        }
    });
}

function deleteMap(username, mapName){
    return new Promise(async(resolve, reject) => {
        const userRef = db.collection('user').doc(username).collection("maps").doc(mapName);
        const userMapsRef = db.collection('user_maps').doc(mapName);

        try {
            await userRef.delete();
            await userMapsRef.delete();

            resolve("Map successfully deleted");
        }catch (error) {
            reject(error);
        }
    });
}

function getUserMap(mapName){
    return new Promise(async(resolve, reject) => {
        try {
            const response = await db.collection('user_maps').doc(mapName).get();

            if(response){
                resolve(response.data());
            }
        } catch (error) {
            console.log(error);
            reject(error);
        }
    });
}

function getUsersMaps(username){
    return new Promise(async(resolve, reject) => {
        try {
            const response = await db.collection('user').doc(username).collection("maps").get();

            const maps = await Promise.all(await response.docs.map(async(doc) => {
                const data = doc.data();
                const map = (await data.map.get()).data();

                return map;
            }));

            resolve(maps);
        } catch (error) {
            console.log(error);
            reject(error);
        }
    });
}

module.exports = {
    login,
    register,
    revokeTokens,
    refreshToken,
    cleanUserDB,
    guest,
    saveMap,
    editMap,
    deleteMap,
    getUserMap,
    getUsersMaps
}