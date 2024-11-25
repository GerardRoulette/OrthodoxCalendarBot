require('dotenv').config();
const { Bot } = require('grammy');
const schedule = require("node-schedule");
const fs = require('fs');
const path = require('path');

const bot = new Bot(process.env.BOT_API_KEY);
const chatsList = path.join(__dirname, 'chats.json'); // файл с контактами

// ДОСТАЕМ СПИСОК КОНТАКТОВ ИЗ ФАЙЛА
function ImportChats () {
    if (fs.existsSync(chats)) {
        return JSON.parse(fs.readFileSync(chats, 'utf8'));
    }
    return [];
}

bot.command('start', async (ctx) => {

    // если нет чата в списке контактов, добавляем
    if (!chats.some(chat => chat === ctx.chat.id)) {
        chats.push(ctx.chat.id);
    }

    // приветственное сообщение
    await ctx.reply(
        'Мир Вам! Этот бот ежедневно будет отправлять Вам информацию о сегодняшнем дне в календаре Русской Православной Церкви. В НАСТОЯЩЕЕ ВРЕМЯ БОТ НАХОДИТСЯ В РАЗРАБОТКЕ.',
    );
});

schedule.scheduleJob("*/1 * * * *", () => {
    try {
        chats.forEach((userId) => {
            bot.api.sendMessage(userId, "Тестирование по времени");
        });
    } catch (error) {
        console.error("Error occurred while sending hourly update:", error);
    }
});

bot.start();