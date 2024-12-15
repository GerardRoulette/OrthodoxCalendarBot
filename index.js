require('dotenv').config();
const { Bot, session, GrammyError, HttpError, Keyboard, InlineKeyboard } = require('grammy');
const { conversations, createConversation } = require('@grammyjs/conversations');
const schedule = require("node-schedule");
const fs = require('fs');
const path = require('path');
const sanitizeHtml = require('sanitize-html')
const { autoRetry } = require("@grammyjs/auto-retry");
const { hydrate } = require("@grammyjs/hydrate");
const obtainData = require('./obtainData.js');
const { sendInfoNow, sendInfoToUser } = require('./sendInfoNow.js')

const { addUser } = require('./db');

const { timeZoneKeyboardOne, timeZoneKeyboardTwo, timeZoneKeyboardThree } = require('./keyboards.js')

const bot = new Bot(process.env.BOT_API_KEY); // инициализация бота
const chatsList = path.join(__dirname, 'chats.json'); // файл с контактами
const saintsOfToday = path.join(__dirname, 'saintsOfToday.json'); // API/DAY запрос, святые и праздники дня
const textsOfToday = path.join(__dirname, 'textsOfToday.json');

bot.use(hydrate());
/* 
ЗАПРОС ДАННЫХ С АЗБУКИ
*/

// СКАЧИВАЕМ ДАННЫЕ в 0-02 ("2 0 * * *"), запись в файл 
schedule.scheduleJob("2 0 * * *", () => {
    obtainData();
});


/* 
РАБОТА С ЧАТАМИ 
*/

function importChats() { // ДОСТАЕМ СПИСОК КОНТАКТОВ ИЗ ФАЙЛА
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
    const userInfo = {
    first_name: ctx.from.first_name,
    last_name: ctx.from.last_name,
    username: ctx.from.username,
    language_code: ctx.from.language_code
  };

  addUser(ctx.chat.id, userInfo);
    
    await ctx.reply( // приветственное сообщение
        `Мир Вам!
Этот бот ежедневно будет отправлять Вам информацию о сегодняшнем дне в календаре Русской Православной Церкви.

В настоящее время бот отправляет календарную информацию в 8-30 утра по московскому времени.
В дальнейшем будут добавлены:
- возможность установить свой часовой пояс
- возможность установить свое желаемое время для получения календаря
- возможность использования в групповых чатах

<b>ПРОШУ ИМЕТЬ ВВИДУ СЛЕДУЮЩЕЕ
В НАСТОЯЩЕЕ ВРЕМЯ БОТ НАХОДИТСЯ В РАЗРАБОТКЕ. ВОЗМОЖНЫ ОШИБКИ И СБОИ.
БОТ ЕЩЕ НЕ АДАПТИРОВАН К БОЛЬШИМ НАГРУЗКАМ, ПРОСЬБА НЕ РАСПРОСТРАНЯТЬ
</b>
(я скажу когда будет можно)

По всем вопросам и предложениям просьба связываться с @kvasov1`, {
        parse_mode: "HTML",
        disable_web_page_preview: true
    }
    );
    await ctx.reply( // приветственное сообщение
        sendInfoToUser(), {
        parse_mode: "HTML",
        disable_web_page_preview: true
    }
    );
});

schedule.scheduleJob("2 * * * *", () => {
    sendInfoNow();
});


/* 
--- МЕНЮ ---
*/

// Главное меню
bot.command('setup', async (ctx) => {
    await ctx.reply('Выберите пункт меню', {
        reply_markup: menuKeyboard,
    });
});

const menuKeyboard = new InlineKeyboard()
    .text('Установить часовой пояс', 'choose-timezone')
    .row()
    .text('Установить желаемое время', 'support')
    .row()
    .text('Как использовать бот в групповом чате?', 'groupchat')
    .row()
    .text('Информация о разработчике');



/* ЧАСОВЫЕ ПОЯСА */
bot.callbackQuery('choose-timezone', async (ctx) => {
    await ctx.callbackQuery.message.editText('По умолчанию у всех пользователей часовой пояс Москвы (UTC+3). Если вы хотите установить другой часовой пояс, выберите его из списка:', {
        reply_markup: timeZoneKeyboardOne,
    });
    await ctx.api.editMessageText;
    await ctx.answerCallbackQuery();
});
bot.callbackQuery('pageone', async (ctx) => {
    await ctx.callbackQuery.message.editText('По умолчанию у всех пользователей часовой пояс Москвы (UTC+3). Если вы хотите установить другой часовой пояс, выберите его из списка:', {
        reply_markup: timeZoneKeyboardOne,
    });
    await ctx.api.editMessageText;
    await ctx.answerCallbackQuery();
});

bot.callbackQuery('pagetwo', async (ctx) => {
    await ctx.callbackQuery.message.editText('По умолчанию у всех пользователей часовой пояс Москвы (UTC+3). Если вы хотите установить другой часовой пояс, выберите его из списка:', {
        reply_markup: timeZoneKeyboardTwo,
    });
    await ctx.api.editMessageText;
    await ctx.answerCallbackQuery();
});

bot.callbackQuery('pagethree', async (ctx) => {
    await ctx.callbackQuery.message.editText('По умолчанию у всех пользователей часовой пояс Москвы (UTC+3). Если вы хотите установить другой часовой пояс, выберите его из списка:', {
        reply_markup: timeZoneKeyboardThree,
    });
    await ctx.api.editMessageText;
    await ctx.answerCallbackQuery();
});



bot.callbackQuery('support', async (ctx) => {
    await ctx.callbackQuery.message.editText('Напишите Ваш вопрос', {
        reply_markup: backKeyboard,
    });
    await ctx.answerCallbackQuery();
});

bot.callbackQuery('mainmenu', async (ctx) => {
    await ctx.callbackQuery.message.editText('Выберите пункт меню', {
        reply_markup: menuKeyboard,
    });
    await ctx.answerCallbackQuery();
});



bot.api.setMyCommands([
    { command: 'start', description: 'Запуск бота' },
    { command: 'setup', description: 'Настройки' },
]);

bot.api.config.use(autoRetry());
bot.start();
