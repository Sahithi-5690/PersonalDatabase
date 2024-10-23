// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js';

// Firebase configuration object
const firebaseConfig = {
    apiKey: "AIzaSyDkY3oHdyst8xR9T5rAdXnCdbcblgUHqE0",
    authDomain: "personaldatabase-775bd.firebaseapp.com",
    projectId: "personaldatabase-775bd",
    storageBucket: "personaldatabase-775bd.appspot.com",
    messagingSenderId: "197842286845",
    appId: "1:197842286845:web:1fea614bc3b6fb30dae694"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app); // Get the authentication instance

export { auth }; // Export the authentication instance
