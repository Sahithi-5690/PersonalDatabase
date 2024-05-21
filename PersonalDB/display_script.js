document.addEventListener('DOMContentLoaded', function() {
    var profileData = {
        firstName: sessionStorage.getItem('firstName'),
        surname: sessionStorage.getItem('surname'),
        phoneNumber: sessionStorage.getItem('phoneNumber'),
        addressLine1: sessionStorage.getItem('addressLine1'),
        addressLine2: sessionStorage.getItem('addressLine2'),
        postcode: sessionStorage.getItem('postcode'),
        state: sessionStorage.getItem('state'),
        area: sessionStorage.getItem('area'),
        email: sessionStorage.getItem('email'),
        education: sessionStorage.getItem('education'),
        country: sessionStorage.getItem('country'),
        region: sessionStorage.getItem('region')
    };

    for (let key in profileData) {
        if (profileData[key]) {
            document.getElementById(key).textContent = profileData[key];
        }
    }
});

// Handle logout
function logout() {
    // Your existing logout function code here...
}

document.getElementById('logout').addEventListener('click', logout);
function navigateToProfile() {
    window.location.href = "Profile.html";
}

// Adding an event listener to the button with id "editProfileBtn"
document.getElementById("editProfileBtn").addEventListener("click", function() {
    navigateToProfile(); // Call the navigateToProfile function when the button is clicked
});