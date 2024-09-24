// src/Auth/SignIn.jsx
import React, { useState } from 'react';
import api from '../services/api'; // Import the Axios instance
import '../../styles/App.css';

const SignIn = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); // To handle errors

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/auth/login', {
        email,
        password
      });
      // Handle successful login (e.g., redirect to dashboard)
      console.log('Login successful:', response.data);
      // You can also use React Router to navigate to another page
    } catch (error) {
      console.error('Login failed:', error.response ? error.response.data : error.message);
      setError('Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="form-container">
      <h2 className="form-title">Sign In</h2>
      {error && <p className="error-message">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
          />
          <label htmlFor="email">Email</label>
        </div>
        <div className="input-group">
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
          />
          <label htmlFor="password">Password</label>
        </div>
        <button type="submit" className="button">Login</button>
      </form>
    </div>
  );
};

export default SignIn;
