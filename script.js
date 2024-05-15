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
