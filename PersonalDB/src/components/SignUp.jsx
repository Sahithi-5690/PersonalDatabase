// src/components/SignUp.jsx
import React, { useState } from 'react';
import { auth, db } from '../firebaseauth'; // Import named exports
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import '../../styles/styles2.css'; // Import your CSS file

const SignUp = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        name: name,
      });

      setMessage('User created and data stored successfully');
    } catch (error) {
      setMessage('Error creating user: ' + error.message);
    }
  };

  return (
    <div className="container" id="signup">
      <h1 className="form-title">Register</h1>
      <form onSubmit={handleSubmit}>
        <div className="messageDiv" style={{ display: message ? 'block' : 'none' }}>
          {message}
        </div>
        <div className="input-group">
          <i className="fas fa-user"></i>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            required
          />
          <label htmlFor="name">Name</label>
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
        <button type="submit" className="btn">Sign Up</button>
        <div className="icons">
          <i className="fab fa-google"></i>
          <i className="fab fa-facebook"></i>
        </div>
        <div className="links">
          <p>Already Have Account?</p>
          <button id="signInButton">Login In</button>
        </div>
      </form>
    </div>
  );
};

export default SignUp;
