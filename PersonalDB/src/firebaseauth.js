// src/firebaseauth.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBPE6TbZykGf7Kui6fsR6-3W9w6uuzg0ms",
  authDomain: "login-12d02.firebaseapp.com",
  projectId: "login-12d02",
  storageBucket: "login-12d02.appspot.com",
  messagingSenderId: "894912184495",
  appId: "1:894912184495:web:2a6fadb14356c49b24545a",
  measurementId: "G-G9XVZSVL5Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
