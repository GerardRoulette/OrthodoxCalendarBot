require('dotenv').config();
const { Bot, GrammyError, HttpError, Keyboard, InlineKeyboard } = require('grammy');
const schedule = require("node-schedule");
const fs = require('fs');
const path = require('path');
const sanitizeHtml = require('sanitize-html')
const { autoRetry } = require("@grammyjs/auto-retry");
const { hydrate } = require("@grammyjs/hydrate");
const obtainData = require ('./obtainData.js');

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

const backKeyboard = new InlineKeyboard().text('< Назад в меню', 'back');

const timeZoneKeyboard = new InlineKeyboard()
.text('UTC +0 (Британия, Западная Африка)', 'order-status')
.row()
.text('UTC +1 (Европа, Центральная Африка)', 'support')
.row()
.text('UTC +2 (Калининград, Восточная Европа)', 'groupchat')
.row()
.text('UTC +3 (Москва, Санкт-Петербург)')
.row()
.text('UTC +3:30 (Иран)')
.row()
.text('UTC +4 (Самара, Саратов, Ижевск, Грузия, ОАЭ)')
.row()
.text('UTC +4:30 (Афганистан)')
.row()
.text('UTC +5 (Башкирия, Челябинск, Пермь, Оренбург)')
.row()
.text('UTC +5:30 (Индия, Шри-Ланка)');

bot.command('setup', async (ctx) => {
    await ctx.reply('Выберите пункт меню', {
   reply_markup: menuKeyboard,
   });
   });
    
    
   bot.callbackQuery('choose-timezone', async (ctx) => {
   await ctx.callbackQuery.message.editText('Статус заказа: В пути', {
   reply_markup: timeZoneKeyboard,
   });
   await ctx.answerCallbackQuery();
   });
   
   bot.callbackQuery('support', async (ctx) => {
   await ctx.callbackQuery.message.editText('Напишите Ваш вопрос', { reply_markup: backKeyboard,
   });
   await ctx.answerCallbackQuery();
   });
   
   bot.callbackQuery('back', async (ctx) => {
   await ctx.callbackQuery.message.editText('Выберите пункт меню', { reply_markup: menuKeyboard,
   });
   await ctx.answerCallbackQuery();
   });

   bot.api.setMyCommands([
    { command: 'start', description: 'Запуск бота' },
    { command: 'setup', description: 'Настройки' },
    ]);

bot.api.config.use(autoRetry());
bot.start();
