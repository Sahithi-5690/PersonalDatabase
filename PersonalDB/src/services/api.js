// src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8081', // Base URL of your backend server
  timeout: 10000, // Optional: timeout in milliseconds
});

export default api;
