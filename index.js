require('dotenv').config();
const { Bot } = require('grammy');
const schedule = require("node-schedule");
const fs = require('fs');
const path = require('path');

const bot = new Bot(process.env.BOT_API_KEY);
const chatsList = path.join(__dirname, 'chats.json'); // файл с контактами
const date = path.join(__dirname, 'date.json'); // API/DAY запрос, святые дня

// ДОСТАЕМ СПИСОК КОНТАКТОВ ИЗ ФАЙЛА
function importChats () {
    if (fs.existsSync(chatsList)) {
        return JSON.parse(fs.readFileSync(chatsList, 'utf8'));
    }
    return [];
}

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