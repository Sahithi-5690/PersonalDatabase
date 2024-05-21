function saveprofile() {
    // Gather user input values
    var firstName = document.querySelector('input[name="firstName"]').value;
    var surname = document.querySelector('input[name="surname"]').value;
    var phoneNumber = document.querySelector('input[name="phoneNumber"]').value;
    var addressLine1 = document.querySelector('input[name="addressLine1"]').value;
    var addressLine2 = document.querySelector('input[name="addressLine2"]').value;
    var postcode = document.querySelector('input[name="postcode"]').value;
    var state = document.querySelector('input[name="state"]').value;
    var area = document.querySelector('input[name="area"]').value;
    var email = document.querySelector('input[name="email"]').value;
    var education = document.querySelector('input[name="education"]').value;
    var country = document.querySelector('input[name="country"]').value;
    var region = document.querySelector('input[name="region"]').value;

    // Store user input values in session storage
    sessionStorage.setItem('firstName', firstName);
    sessionStorage.setItem('surname', surname);
    sessionStorage.setItem('phoneNumber', phoneNumber);
    sessionStorage.setItem('addressLine1', addressLine1);
    sessionStorage.setItem('addressLine2', addressLine2);
    sessionStorage.setItem('postcode', postcode);
    sessionStorage.setItem('state', state);
    sessionStorage.setItem('area', area);
    sessionStorage.setItem('email', email);
    sessionStorage.setItem('education', education);
    sessionStorage.setItem('country', country);
    sessionStorage.setItem('region', region);

    // Navigate to the update_screen page
    window.location.href = "update_screen.html";
}
// script.js

// Function to handle logout
function logout() {
    // Perform logout process (e.g., sign out from Firebase, clear session storage, etc.)
    // For demonstration purposes, let's clear session storage
    sessionStorage.clear();
    // Redirect to the index page
    window.location.href = "index.html";
}

// Add an event listener to the logout button
document.getElementById('logout').addEventListener('click', logout);

// function openjob(evt, job) {
//     var i, tabcontent, tablinks;
//     tabcontent = document.getElementsByClassName("tabcontent");
//     for (i = 0; i < tabcontent.length; i++) {
//       tabcontent[i].style.display = "none";
//     }
//     tablinks = document.getElementsByClassName("tablinks");
//     for (i = 0; i < tablinks.length; i++) {
//       tablinks[i].className = tablinks[i].className.replace(" active", "");
//     }
//     document.getElementById(job).style.display = "block";
//     evt.currentTarget.className += " active";
//   }
import { useHistory } from 'react-router-dom';

const EditApplicationForm = ({ applicationId }) => {
    const history = useHistory();

    const handleSaveChanges = async () => {
        try {
            // Make PUT request to update job application
            const response = await fetch(`http://localhost:8081/jobapplication/${applicationId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(applicationData) // Your application data object
            });

            if (response.ok) {
                // If successful, redirect to view_applications.html
                window.location.href = 'http://127.0.0.1:5501/PersonalDB/view_applications.html';
            } else {
                // Handle other response statuses/errors
            }
        } catch (error) {
            // Handle error
        }
    };

    return (
        <div>
            {/* Edit application form */}
            <button onClick={handleSaveChanges}>Save Changes</button>
        </div>
    );
};

