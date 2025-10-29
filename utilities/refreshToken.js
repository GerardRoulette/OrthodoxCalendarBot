const fs = require('fs');
const path = require('path');

// Your email and password
const email = process.env.AZBYKA_EMAIL; // Add this to your .env
const password = process.env.AZBYKA_PASSWORD; // Add this to your .env

const envFilePath = path.resolve(__dirname, '../.env'); // Adjust path if needed

async function refreshAzbykaToken() {
    try {
        // Send POST request to obtain new token
        const response = await fetch('https://azbyka.ru/days/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            throw new Error(`Failed to refresh token: ${response.status} - ${await response.text()}`);
        }

        const data = await response.json();
        const newToken = data.token;

        console.log('New token received:', newToken);

        // Update .env file
        let envContents = fs.readFileSync(envFilePath, 'utf8');
        envContents = envContents.replace(
            /AZBYKA_API_KEY=.*/,
            `AZBYKA_API_KEY=${newToken}`
        );

        fs.writeFileSync(envFilePath, envContents, 'utf8');
        console.log('Updated AZBYKA_API_KEY in .env');
    } catch (error) {
        console.error('Error refreshing Azbyka token:', error.message);
        throw error;
    }
}

refreshAzbykaToken();

module.exports = refreshAzbykaToken;

