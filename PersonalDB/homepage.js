document.addEventListener('DOMContentLoaded', () => {
    // Check if userId is available in local storage
    const userId = localStorage.getItem('userId');
    if (!userId) {
        console.error('User Id not Found in Local storage');
        // Redirect to login page
        window.location.href = 'index.html';
        return;
    }

    // Load table names into the dropdown menu
    fetch('http://127.0.0.1:8081/tables')
        .then(response => response.json())
        .then(tables => {
            if (Array.isArray(tables)) {
                const dropdownMenu = document.getElementById('dropdown-menu');
                tables.forEach(table => {
                    if (table !== 'job_application') {
                        const li = document.createElement('li');
                        li.innerHTML = `<a class="dropdown-item" href="view_table.html?table=${table}">${table}</a>`;
                        dropdownMenu.appendChild(li);
                    }
                });
            } else {
                console.error('Expected an array of tables, but received:', tables);
            }
        })
        .catch(error => {
            console.error('Error fetching tables:', error);
        });

    // Show modal to add new table
    document.getElementById('add-table-btn').addEventListener('click', () => {
        const myModal = new bootstrap.Modal(document.getElementById('createTableModal'));
        myModal.show();
    });

    // Add new attribute input fields
    document.getElementById('add-attribute').addEventListener('click', () => {
        const container = document.getElementById('attributes-container');
        const count = container.getElementsByClassName('attribute').length + 1;

        const newAttribute = document.createElement('div');
        newAttribute.classList.add('mb-3', 'attribute');
        newAttribute.innerHTML = `
            <label for="attribute-name-${count}" class="form-label">Attribute Name:</label>
            <input type="text" class="form-control" name="attribute-name-${count}" required>
            <label for="attribute-type-${count}" class="form-label">Attribute Type:</label>
            <select class="form-select" name="attribute-type-${count}" required>
                <option value="">Select Data Type</option>
                <option value="INT">INT</option>
                <option value="VARCHAR(255)">VARCHAR(255)</option>
                <option value="TEXT">TEXT</option>
                <option value="DATE">DATE</option>
                <option value="FLOAT">FLOAT</option>
                <option value="DOUBLE">DOUBLE</option>
                <option value="BOOLEAN">BOOLEAN</option>
                <option value="DATETIME">DATETIME</option>
            </select>
        `;
        container.appendChild(newAttribute);
    });

    // Handle form submission to create a new table
    document.getElementById('create-table-form').addEventListener('submit', event => {
        event.preventDefault();

        const form = event.target;
        const tableName = form['table-name'].value;
        const attributes = [];

        for (let i = 1; i <= form.querySelectorAll('.attribute').length; i++) {
            const name = form[`attribute-name-${i}`].value;
            const type = form[`attribute-type-${i}`].value;
            attributes.push({ name, type });
        }

        // Use fetch to send data to the server
        fetch('http://127.0.0.1:8081/create-table', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tableName,
                attributes
            })
        })
        .then(response => response.text())
        .then(data => {
            alert(data);
            window.location.reload(); // Reload the page to update the dropdown
        })
        .catch(error => {
            console.error('Error:', error);
            showMessage('Error creating table: ' + error.message, 'createTableMessage');
        });
    });

    // Handle logout
    document.getElementById('logout').addEventListener('click', () => {
        fetch('http://127.0.0.1:8081/logout', {
            method: 'POST'
        })
        .then(() => {
            localStorage.removeItem('userId');
            window.location.href = 'index.html'; // Redirect to login page
        })
        .catch(error => {
            console.error('Logout Error:', error);
        });
    });
});

// Function to display messages
function showMessage(message, elementId) {
    const messageElement = document.getElementById(elementId);
    if (messageElement) {
        messageElement.style.display = 'block';
        messageElement.textContent = message;
    }
}
