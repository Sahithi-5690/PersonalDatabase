// src/components/SignIn.jsx
import React, { useState } from 'react';
import { auth } from '../firebaseauth'; // Correct import path for auth
import { signInWithEmailAndPassword } from 'firebase/auth';
import '../../styles/styles2.css'; // Import your CSS file

const SignIn = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setMessage('Signed in successfully');
    } catch (error) {
      setMessage('Error signing in: ' + error.message);
    }
  };

  return (
    <div className="container" id="signIn">
      <h1 className="form-title">Personal Database</h1>
      <form onSubmit={handleSubmit}>
        <div className="messageDiv" style={{ display: message ? 'block' : 'none' }}>
          {message}
        </div>
        <div className="input-group">
          <i className="fas fa-envelope"></i>
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
          <i className="fas fa-lock"></i>
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
        <button type="submit" className="btn">Login</button>
        <div className="links" style={{ display: 'none' }}>
          <button id="signUpButton">Sign Up</button>
        </div>
      </form>
    </div>
  );
};

export default SignIn;
