const fs = require('fs');
const path = require('path');
const { bot } = require('./bot.js');

// Your email and password
const email = process.env.AZBYKA_EMAIL; // Add this to your .env
const password = process.env.AZBYKA_PASSWORD; // Add this to your .env

const envFilePath = path.resolve(__dirname, '../.env'); // Adjust path if needed
const errorTrackerChat = process.env.ERROR_TRACKER;

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
        if (errorTrackerChat) {
            try {
                const maxLength = 4000;
                const errorMessage = error.message.length > maxLength
                    ? error.message.substring(0, maxLength) + '... (truncated)'
                    : error.message;
                await bot.api.sendMessage(errorTrackerChat, `refreshAzbykaToken() - ОШИБКА: ${errorMessage}`);
            } catch (sendError) {
                console.error('Failed to send error notification:', sendError.message);
            }
        }
        throw error;
    }
}

refreshAzbykaToken();

module.exports = refreshAzbykaToken;

