// Save profile data to sessionStorage and navigate to the profile display page
function saveProfile() {
    var profileData = {
        firstName: document.querySelector('input[name="firstName"]').value,
        surname: document.querySelector('input[name="surname"]').value,
        phoneNumber: document.querySelector('input[name="phoneNumber"]').value,
        addressLine1: document.querySelector('input[name="addressLine1"]').value,
        addressLine2: document.querySelector('input[name="addressLine2"]').value,
        postcode: document.querySelector('input[name="postcode"]').value,
        state: document.querySelector('input[name="state"]').value,
        area: document.querySelector('input[name="area"]').value,
        email: document.querySelector('input[name="email"]').value,
        education: document.querySelector('input[name="education"]').value,
        country: document.querySelector('input[name="country"]').value,
        region: document.querySelector('input[name="region"]').value,
    };

    for (let key in profileData) {
        sessionStorage.setItem(key, profileData[key]);
    }

    window.location.href = 'profile_display.html';
}

// Handle logout
function logout() {
    // Your existing logout function code here...
}

document.getElementById('logout').addEventListener('click', logout);
