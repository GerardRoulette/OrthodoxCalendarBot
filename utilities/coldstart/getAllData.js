const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { obtainData } = require('../../functions/obtainData.js')
const { updateData, deleteOutdatedData } = require('../../db/db.js')

let apiKey = process.env.AZBYKA_API_KEY;
apiKey = apiKey.trim();

// Helper function to delay execution
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to retry with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            const is504 = error.message && error.message.includes('504');
            const isTimeout = error.message && (error.message.includes('timeout') || error.message.includes('504'));
            
            if ((is504 || isTimeout) && attempt < maxRetries - 1) {
                const delayMs = initialDelay * Math.pow(2, attempt);
                console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms for error: ${error.message.substring(0, 100)}`);
                await delay(delayMs);
                continue;
            }
            throw error;
        }
    }
}

async function getAllData() {
    const currentDate = new Date();
    const dates = [];

    // убеждаемся что все даты закрыты. 7 дней в будущее на случай падений API
    for (let i = -2; i <= 7; i++) {
        const date = new Date(currentDate);
        date.setDate(currentDate.getDate() + i);
        dates.push(date);
    }

    // обрабатываем даты последовательно с задержкой между запросами
    const dataArray = [];
    for (let i = 0; i < dates.length; i++) {
        const date = dates[i];
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        try {
            console.log(`Processing date ${i + 1}/${dates.length}: ${formattedDate}`);
            
            // Retry with backoff for 504 errors
            const message = await retryWithBackoff(async () => {
                return await obtainData(year, month, day, apiKey);
            }, 3, 2000); // 3 retries, starting with 2 second delay
            
            dataArray.push({ date: formattedDate, message });
            
            // Задержка между датами, чтобы не перегружать API
            if (i < dates.length - 1) {
                await delay(1000); // 1 секунда между датами
            }
        } catch (error) {
            console.error(`Failed to process date ${formattedDate}:`, error.message);
            // Continue with next date instead of failing completely
        }
    }

    // записали в БД
    for (const { date, message } of dataArray) {
        try {
            await updateData(date, message);
            console.log(`Saved data for ${date}`);
        } catch (error) {
            console.error(`Failed to save data for ${date}:`, error.message);
        }
    }

    //удаляем устаревшее если есть
    const outdated = new Date(currentDate);
    outdated.setDate(currentDate.getDate() - 2);
    const outdatedYear = outdated.getFullYear();
    const outdatedMonth = outdated.getMonth() + 1;
    const outdatedDay = outdated.getDate();
    const formattedOutdated = `${outdatedYear}-${String(outdatedMonth).padStart(2, '0')}-${String(outdatedDay).padStart(2, '0')}`;
    await deleteOutdatedData(formattedOutdated);
    console.log('All data processed successfully');
}

getAllData()
