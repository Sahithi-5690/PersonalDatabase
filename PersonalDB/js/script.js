import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAhoXxNgJiYW-RN3u325Z7jBoG3OpjqtGk",
  authDomain: "personal-database-cbce7.firebaseapp.com",
  projectId: "personal-database-cbce7",
  storageBucket: "personal-database-cbce7.appspot.com",
  messagingSenderId: "487895690522",
  appId: "1:487895690522:web:525ecbd0cd76bee995d0a3",
  measurementId: "G-8P2SPPTHQZ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };
