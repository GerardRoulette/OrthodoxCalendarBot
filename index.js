require('dotenv').config();
const { Bot } = require('grammy');
const schedule = require("node-schedule");
const fs = require('fs');
const path = require('path');
const sanitizeHtml = require('sanitize-html')
const { autoRetry } = require("@grammyjs/auto-retry");


const bot = new Bot(process.env.BOT_API_KEY); // инициализация бота
const chatsList = path.join(__dirname, 'chats.json'); // файл с контактами
const saintsOfToday = path.join(__dirname, 'saintsOfToday.json'); // API/DAY запрос, святые и праздники дня
const textsOfToday = path.join(__dirname, 'textsOfToday.json');
/* 
ЗАПРОС ДАННЫХ С АЗБУКИ
*/

// СКАЧИВАЕМ ДАННЫЕ в 0-02 ("2 0 * * *"), запись в файл 
schedule.scheduleJob("2 0 * * *", () => {
    try {
        let today = new Date();
        let year = today.getUTCFullYear();
        let month = (today.getUTCMonth() + 1).toString().padStart(2, '0');
        let day = today.getUTCDate().toString().padStart(2, '0');
        async function getSaintsFromAzbyka() {
            const url = `https://azbyka.ru/days/api/day?date%5Bexact%5D=${year}-${month}-${day}`;
            try {
                const response = await fetch(url, {
                    headers: {
                        'authorization': `Bearer ${process.env.AZBYKA_API_KEY}`
                    }
                });
                if (!response.ok) {
                    throw new Error(`API DAY - Response status: ${response.status} --- ${response.text}`);
                }

                const json = await response.json();
                fs.writeFileSync('saintsOfToday.json', JSON.stringify(json, null, 2), 'utf8');
                console.log('Data written to saintsOfToday.json');
            } catch (error) {
                bot.api.sendMessage(96498103, "Не удалось скачать данные с Азбуки - святые"); // мой чат айди
                console.error('Error:', error.message);
                setTimeout(getSaintsFromAzbyka, 300000)
            }
        }

        getSaintsFromAzbyka(); // НА ВСЯКИЙ, ВДРУГ СПАМ ФИЛЬТР

        async function getTextsFromAzbyka() { // CКАЧИВАЕМ ПО СТАРОМУ АПИ РАДИ ССЫЛОК НА БИБЛИЮ
            const url = `https://azbyka.ru/days/api/cache_dates?date%5Bexact%5D=${year}-${month}-${day}`;
            try {
                const response = await fetch(url, {
                    headers: {
                        'authorization': `Bearer ${process.env.AZBYKA_API_KEY}`
                    }
                });
                if (!response.ok) {
                    throw new Error(`CACHE DATE - Response status: ${response.status} --- ${response.text}`);
                }

                const json = await response.json();
                return await json; // просто возвращаем json, чтобы его распилить и достать текст с id 1
            } catch (error) {
                bot.api.sendMessage(96498103, "Не удалось скачать данные с Азбуки - тексты"); // мой чат айди
                console.error(error.message);
                setTimeout(getTextsFromAzbyka, 300000)
            }
        }
        function getTextIdsWithType1(data) { // фильтруем большой json и достаем текст с id 1
            return data.flatMap(item =>
                item.abstractDate.texts.filter(text => text.type === 1).map(text => text.id)
            );
        }

        async function getTodayBibleReading() { // сама цепочка извлечения ссылок на Библию
            let jsonWithTextIds = await getTextsFromAzbyka();
            let todayBibleId = getTextIdsWithType1(jsonWithTextIds);
            const url = `https://azbyka.ru/days/api/texts/${todayBibleId.join()}`;
            try {
                const response = await fetch(url, {
                    headers: {
                        'authorization': `Bearer ${process.env.AZBYKA_API_KEY}`
                    }
                });
                if (!response.ok) {
                    throw new Error(`TEXTS - Response status: ${response.status} --- ${response.text}`);
                }

                const json = await response.json();
                fs.writeFileSync('textsOfToday.json', JSON.stringify(json, null, 2), 'utf8');
            } catch (error) {
                bot.api.sendMessage(96498103, "Не удалось скачать данные с Азбуки - тексты"); // мой чат айди
                console.error(error.message);
                setTimeout(getTodayBibleReading, 300000)
            }
        }
        getTodayBibleReading() // здесь извлекли ссылки на Библию и сохранили их в texts, страхуемся от спама запросами

    } catch (error) {
        console.error(error.message);
    }
});

function sendInfoToUser() {
    let today = new Date();
    let year = today.getUTCFullYear();
    let month = (today.getUTCMonth() + 1).toString().padStart(2, '0');
    let day = today.getUTCDate().toString().padStart(2, '0');
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

schedule.scheduleJob("30 8 * * *", () => {
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
bot.api.config.use(autoRetry());
bot.start();
