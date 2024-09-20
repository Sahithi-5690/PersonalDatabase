// Backend/firebaseAdmin.js
const admin = require('firebase-admin');
const serviceAccount = require('./personal-db-fe58c-firebase-adminsdk-xl82n-37ea39918e.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();
const firestore = admin.firestore();

module.exports = { auth, firestore };
