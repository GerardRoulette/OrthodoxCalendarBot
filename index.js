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

function sendInfoToUser() {
    let today = new Date();
    let year = today.getFullYear();
    let month = (today.getMonth() + 1).toString().padStart(2, '0');
    let day = today.getDate().toString().padStart(2, '0');
    const arrayOfSaints = [];
    let data = JSON.parse(fs.readFileSync(saintsOfToday, 'utf8'))[0]
    let textsPreFormat = JSON.parse(fs.readFileSync(textsOfToday, 'utf8'));
    let texts = sanitizeHtml(textsPreFormat.text, {
        allowedTags: ['b', 'i', 'em', 'strong', 'a', 'code', 'pre'],
        allowedAttributes: {
            'a': ['href']
        },
        allowedSchemes: ['http', 'https']
    });
    data.abstractDate.priorities.forEach(priority => {
        const cacheTitle = sanitizeHtml(priority.memorialDay.cacheTitle, {
            allowedTags: ['b', 'i', 'em', 'strong', 'a', 'code', 'pre'],
            allowedAttributes: {
                'a': ['href']
            },
            allowedSchemes: ['http', 'https']
        });
        if (priority.memorialDay.iconOfOurLady) {
            arrayOfSaints.push(`• Икону Божией Матери "${cacheTitle}"`);
        } else {
            arrayOfSaints.push(`• ${cacheTitle}`);
        }
    });

    let message = `Доброе утро!

Сегодня Русская Православная Церковь празднует:

${arrayOfSaints.join('\n')}

На богослужениях в храме будут читаться:

${texts}

Все тексты в одном месте можно прочесть <a href="https://azbyka.ru/biblia/days/${year}-${month}-${day}">по этой ссылке.</a>
      `
    return message;
}

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
    if (!chats.some(chat => chat === ctx.chat.id)) {
        chats.push(ctx.chat.id);
        exportChats(chats)
    }
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

schedule.scheduleJob("54 * * * *", () => {
    try {
        chats.forEach((userId) => {
            bot.api.sendMessage(userId, sendInfoToUser(), {
                parse_mode: "HTML",
                disable_web_page_preview: true
            });
        });
    } catch (error) {
        console.error("Error occurred while sending hourly update:", error);
    }
});

/* 
--- МЕНЮ ---
*/

const menuKeyboard = new InlineKeyboard()
    .text('Установить часовой пояс', 'choose-timezone')
    .row()
    .text('Установить желаемое время', 'support')
    .row()
    .text('Как использовать бот в групповом чате?', 'groupchat')
    .row()
    .text('Информация о разработчике');


    const timezones = [
        ['UTC +0 (Британия, Западная Африка)', 0],
        ['UTC +1 (Европа, Центральная Африка)', 1],
        ['UTC +2 (Калининград, Восточная Европа)', 2],
        ['UTC +3 (Москва, Санкт-Петербург)', 3],
        ['UTC +3:30 (Иран)', 3.5],
        ['UTC +4 (Самара, Саратов, Ижевск, Грузия, ОАЭ)', 4],
        ['UTC +4:30 (Афганистан)', 4.5],
        ['UTC +5 (Башкирия, Челябинск, Пермь, Оренбург)', 5],
        ['UTC +5:30 (Индия, Шри-Ланка)', 5.5],
        ['UTC +5:45 (Непал)', 5.75],
        ['UTC +6 (Омск, Кыргызстан)', 6],
        ['UTC +6:30 (Мьянма)', 6.5],
        ['UTC +7 (Красноярск, Кемерово, Томск, Алтай)', 7],
        ['UTC +8 (Бурятия, Иркутск, Китай)', 8],
        ['UTC +9 (Якутск, Благовещенск, Япония, Корея)', 9],
        ['UTC +10 (Хабаровск, Владивосток, Папуа)', 10],
        ['UTC +11 (Магадан, Сахалин)', 11],
        ['UTC +12 (Чукотка, Камчатка, Новая Зеландия)', 12],
        ['UTC +13 (Самоа, Тонга, Токелау)', 13],
        ['UTC -11 (Американское Самоа, Мидуэй)', -11],
        ['UTC -10 (Гавайи)', -10],
        ['UTC -9 (Аляска)', -9],
        ['UTC -8 (Калифорния, Невада, Орегон)', -8],
        ['UTC -7 (Аризона, Колорадо, Юта)', -7],
        ['UTC -6 (Калифорния, Невада, Орегон)', -6],
        ['UTC -5 (Нью-Йорк, Куба, Панама, Перу)', -5],
        ['UTC -4 (Венесуэла, Карибские острова)', -4],
        ['UTC -3 (Аргентина, Бразилия, Уругвай)', -3],
        ['UTC -2 (Гренландия)', -2],
        ['UTC -1 (Кабо-Верде, Азорские острова)', -1],
    ];
    const itemsPerPage = 10;

    function createTimezoneKeyboard(page) {
        const keyboard = new InlineKeyboard();
        const startIdx = page * itemsPerPage;
        const endIdx = Math.min(startIdx + itemsPerPage, timezones.length);
    
        for (let i = startIdx; i < endIdx; i++) {
            keyboard.text(timezones[i][0], `timezone-${i}`).row();
        }
    
        if (page > 0) {
            keyboard.text('⬅️ Back', `page-${page - 1}`);
        }
        if (endIdx < timezones.length) {
            keyboard.text('Forward ➡️', `page-${page + 1}`);
        }
    
        return keyboard;
    }
    
    async function sendTimezonePage(ctx, page) {
        const keyboard = createTimezoneKeyboard(page);
        await ctx.reply('Select your time zone:', {
            reply_markup: keyboard,
        });
    }
    
    bot.command('selecttimezone', (ctx) => {
        sendTimezonePage(ctx, 0);
    });
    
    bot.on('callback_query:data', async (ctx) => {
        const data = ctx.callbackQuery.data;
        if (data.startsWith('page-')) {
            const page = parseInt(data.split('-')[1], 10);
            const keyboard = createTimezoneKeyboard(page);
            await ctx.editMessageReplyMarkup(keyboard);
        } else if (data.startsWith('timezone-')) {
            const index = parseInt(data.split('-')[1], 10);
            const selectedTimezone = timezones[index][0];
            await ctx.reply(`You selected: ${selectedTimezone}`);
        }
        await ctx.answerCallbackQuery();
    });
    


bot.command('setup', async (ctx) => {
    await ctx.reply('Выберите пункт меню', {
        reply_markup: menuKeyboard,
    });
});


/*bot.callbackQuery('choose-timezone', async (ctx) => {
    await ctx.callbackQuery.message.editText('Статус заказа: В пути', {
        reply_markup: timeZoneKeyboard,
    });
    await ctx.answerCallbackQuery();
}); */

bot.callbackQuery('support', async (ctx) => {
    await ctx.callbackQuery.message.editText('Напишите Ваш вопрос', {
        reply_markup: backKeyboard,
    });
    await ctx.answerCallbackQuery();
});

bot.callbackQuery('back', async (ctx) => {
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
