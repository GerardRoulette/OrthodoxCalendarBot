const fs = require('fs');
const path = require('path');
const { bot } = require('./bot.js');

// учётные данные для получения токена (задать в .env)
const email = process.env.AZBYKA_EMAIL;
const password = process.env.AZBYKA_PASSWORD;

const envFilePath = path.resolve(__dirname, '../.env'); // путь до .env
const errorTrackerChat = process.env.ERROR_TRACKER;

async function refreshAzbykaToken() {
    try {
        // отправляем POST-запрос для получения нового токена
        const response = await fetch('https://azbyka.ru/days/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            throw new Error(`Не удалось обновить токен: ${response.status} - ${await response.text()}`);
        }

        const data = await response.json();
        const newToken = data.token;

        console.log('Получен новый токен:', newToken);

        // обновляем .env
        let envContents = fs.readFileSync(envFilePath, 'utf8');
        envContents = envContents.replace(
            /AZBYKA_API_KEY=.*/,
            `AZBYKA_API_KEY=${newToken}`
        );

        fs.writeFileSync(envFilePath, envContents, 'utf8');
        console.log('AZBYKA_API_KEY обновлён в .env');

        // обновляем переменную окружения в памяти текущего процесса
        process.env.AZBYKA_API_KEY = newToken;
    } catch (error) {
        console.error('Ошибка при обновлении токена Азбуки:', error.message);
        if (errorTrackerChat) {
            try {
                const maxLength = 4000;
                const errorMessage = error.message.length > maxLength
                    ? error.message.substring(0, maxLength) + '... (truncated)'
                    : error.message;
                await bot.api.sendMessage(errorTrackerChat, `refreshAzbykaToken() - ОШИБКА: ${errorMessage}`);
            } catch (sendError) {
                console.error('Не удалось отправить уведомление об ошибке:', sendError.message);
            }
        }
        throw error;
    }
}

module.exports = refreshAzbykaToken;

