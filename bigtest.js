require('dotenv').config();
const { Bot } = require('grammy');
const schedule = require("node-schedule");
const fs = require('fs');
const path = require('path');

const bot = new Bot(process.env.BOT_API_KEY);
const chatsList = path.join(__dirname, 'chats.json'); // файл с контактами
const saintsOfToday = path.join(__dirname, 'saintsOfToday.json'); // API/DAY запрос, святые дня
const textsOfToday = path.join(__dirname, 'textsOfToday.json') // API


// ДОСТАЕМ СПИСОК КОНТАКТОВ ИЗ ФАЙЛА
function importChats() {
    if (fs.existsSync(chatsList)) {
        return JSON.parse(fs.readFileSync(chatsList, 'utf8'));
    }
    return [];
}

// СКАЧИВАЕМ ДАННЫЕ в 0-05 ("5 0 * * *"), запись в файл 
schedule.scheduleJob("5 0 * * *", () => {
    try {
        let today = new Date();
        let year = today.getUTCFullYear();
        let month = today.getUTCMonth() + 1;
        let day = today.getUTCDate();
        async function getSaintsFromAzbyka() {
            const url = `https://azbyka.ru/days/api/day?date%5Bexact%5D=${year}-${month}-${day}`;
            try {
                const response = await fetch(url, {
                    headers: {
                        'authorization': `Bearer ${process.env.AZBYKA_API_KEY}`
                    }
                });
                if (!response.ok) {
                    throw new Error(`Response status: ${response.status} --- ${response.text}`);
                }

                const json = await response.json();
                fs.writeFileSync(saintsOfToday, JSON.stringify(json, null, 2), 'utf8');
            } catch (error) {
                console.error(error.message);
            }
        }
        setTimeout(getSaintsFromAzbyka, 1000); // НА ВСЯКИЙ, ВДРУГ СПАМ ФИЛЬТР

        

    } catch (error) {
        console.error(error.message);
    }
});

// ЗАПИСЫВАЕМ КОНТАКТЫ В ФАЙЛ
function exportChats(chats) {
    fs.writeFileSync(chatsList, JSON.stringify(chats, null, 2), 'utf8');
}

let chats = importChats();





bot.command('start', async (ctx) => {

    // если нет чата в списке контактов, добавляем
    if (!chats.some(chat => chat === ctx.chat.id)) {
        chats.push(ctx.chat.id);
        exportChats(chats)
    }

    // приветственное сообщение
    await ctx.reply(
        'Мир Вам! Этот бот ежедневно будет отправлять Вам информацию о сегодняшнем дне в календаре Русской Православной Церкви. В НАСТОЯЩЕЕ ВРЕМЯ БОТ НАХОДИТСЯ В РАЗРАБОТКЕ.',
    );
});

schedule.scheduleJob("15 * * * *", () => {
    try {
        chats.forEach((userId) => {
            bot.api.sendMessage(userId, "Стахий черт");
        });
    } catch (error) {
        console.error("Error occurred while sending hourly update:", error);
    }
});

bot.start();