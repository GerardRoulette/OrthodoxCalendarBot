require('dotenv').config();
const { obtainData } = require('../../functions/obtainData.js')
const { updateData, deleteOutdatedData } = require('../../db/db.js')

async function fetchAllData() {
    // DEBUG
    const apiKey = process.env.AZBYKA_API_KEY;
  console.log('API Key in fetchAllData:', apiKey);
  // DEBUG OVER
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
        const message = await obtainData(year, month, day, apiKey);
        return { date: date.toISOString().split('T')[0], message }; // isostring -  2024-12-17T19:10:26.699Z
    });

    // получили все сообщения
    const dataArray = await Promise.all(dataPromises);

    // записали в БД
    for (const { date, message } of dataArray) {
        updateData(date, message);
    }

    //удаляем устаревшее если есть
    const twoDaysAgo = new Date(currentDate);
    twoDaysAgo.setDate(currentDate.getDate() - 3);
    deleteOutdatedData(twoDaysAgo.toISOString().split('T')[0]);
}

fetchAllData()