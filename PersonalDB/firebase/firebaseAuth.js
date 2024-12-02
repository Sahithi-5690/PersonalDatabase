// Import Firebase Authentication module and configuration
import { auth } from './firebaseConfig.js'; // Ensure the path is correct for your project
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js';
import { API_URL } from './config.js'; // Import dynamic API URL

// Event listener for sign-up form submission
document.getElementById('signUpForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('rEmail').value.trim();
    const firstName = document.getElementById('fName').value.trim();
    const lastName = document.getElementById('lName').value.trim();
    const password = document.getElementById('rPassword').value;

    console.log('Sign-Up Form Data:', { email, firstName, lastName, password });

    // Validate input fields
    if (!email || !firstName || !lastName || !password) {
        showMessage('Please fill out all fields.', 'signUpMessage');
        return;
    }

    try {
        // Sign up user with Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        console.log('User Credential:', userCredential);
        console.log('User ID:', user.uid);

        // Save user ID to local storage
        localStorage.setItem('userId', user.uid);
        console.log('User ID stored in localStorage:', localStorage.getItem('userId'));

        // Send user info to backend to store in MySQL database
        const response = await fetch(`${API_URL}/add-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: user.uid,
                email: email,
                firstName: firstName,
                lastName: lastName,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Server Response:', data);

        // Show success message
        showMessage('User created successfully', 'signUpMessage');
        alert('User created successfully');

        // Redirect to dashboard
        window.location.href = 'dashboard.html';
    } catch (error) {
        console.error('Sign Up Error:', error);
        showMessage('Unable to sign up: ' + error.message, 'signUpMessage');
        alert('Sign-Up Error: ' + error.message);
    }
});

// Event listener for sign-in form submission
document.getElementById('signInForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    console.log('Sign-In Form Data:', { email, password });

    // Validate input fields
    if (!email || !password) {
        showMessage('Please fill out all fields.', 'signInMessage');
        return;
    }

    try {
        // Sign in user with Firebase Authentication
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        console.log('User Credential:', userCredential);
        console.log('User ID:', user.uid);

        // Save user ID to local storage
        localStorage.setItem('userId', user.uid);
        console.log('User ID stored in localStorage:', localStorage.getItem('userId'));

        // Redirect to dashboard
        window.location.href = 'dashboard.html';
    } catch (error) {
        console.error('Sign In Error:', error);
        showMessage('Invalid credentials, please use valid credentials.', 'signInMessage');
        alert('Invalid credentials, please use valid credentials.');
    }
});

// Function to display messages
function showMessage(message, elementId) {
    const messageElement = document.getElementById(elementId);
    if (messageElement) {
        messageElement.style.display = 'block';
        messageElement.textContent = message;
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, 5000); // Auto-hide the message after 5 seconds
    }
}
