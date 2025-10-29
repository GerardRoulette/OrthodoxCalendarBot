const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { obtainData } = require('../../functions/obtainData.js')
const { updateData, deleteOutdatedData } = require('../../db/db.js')

let apiKey = process.env.AZBYKA_API_KEY;
apiKey = apiKey.trim();

async function getAllData() {
    const currentDate = new Date();
    const dates = [];

    // убеждаемся что все даты закрыты. 7 дней в будущее на случай падений API
    for (let i = -2; i <= 7; i++) {
        const date = new Date(currentDate);
        date.setDate(currentDate.getDate() + i);
        dates.push(date);
    }

    // array промисов, скачиваем данные на каждую дату
    const dataPromises = dates.map(async (date) => {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const message = await obtainData(year, month, day, apiKey);
        return { date: formattedDate, message }; 
    });

    // получили все сообщения
    const dataArray = await Promise.all(dataPromises);

    // записали в БД
    for (const { date, message } of dataArray) {
        await updateData(date, message);
    }

    //удаляем устаревшее если есть
    const outdated = new Date(currentDate);
    outdated.setDate(currentDate.getDate() - 2);
    const outdatedYear = outdated.getFullYear();
    const outdatedMonth = outdated.getMonth() + 1;
    const outdatedDay = outdated.getDate();
    const formattedOutdated = `${outdatedYear}-${String(outdatedMonth).padStart(2, '0')}-${String(outdatedDay).padStart(2, '0')}`;
    await deleteOutdatedData(formattedOutdated);
}

getAllData()
