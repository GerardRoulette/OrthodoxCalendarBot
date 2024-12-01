require('dotenv').config();
const { Bot } = require('grammy');
const schedule = require("node-schedule");
const fs = require('fs');
const path = require('path');
const sanitizeHtml = require('sanitize-html')

const bot = new Bot(process.env.BOT_API_KEY); // инициализация бота
const chatsList = path.join(__dirname, 'chats.json'); // файл с контактами
const saintsOfToday = path.join(__dirname, 'saintsOfToday.json'); // API/DAY запрос, святые и праздники дня
let texts = '-'; // тут лежит чтение Евангелий и Апостола, ссылки на Библию

/* 
ЗАПРОС ДАННЫХ С АЗБУКИ
*/

// СКАЧИВАЕМ ДАННЫЕ в 3-05 ("5 3 * * *"), запись в файл 
schedule.scheduleJob("5 3 * * *", () => {
    try {
        let today = new Date();
        let year = today.getUTCFullYear();
        let month = (today.getUTCMonth() + 1).toString().padStart(2, '0');
        let day = today.getUTCDate().toString().padStart(2, '0');
        console.log(`${year} ${month} ${day}`)
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
                texts = json.text // просто закидываем стринг в переменную, тут большие манипуляции не нужны
            } catch (error) {
                bot.api.sendMessage(96498103, "Не удалось скачать данные с Азбуки - тексты"); // мой чат айди
                console.error(error.message);
                setTimeout(getTodayBibleReading, 300000)
            }
        }
        getTodayBibleReading() // здесь извлекли ссылки на Библию и сохранили их в texts, страхуемся от спама запросами
        console.log(texts)

    } catch (error) {
        console.error(error.message);
    }
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
    if (!chats.some(chat => chat === ctx.chat.id)) {
        chats.push(ctx.chat.id);
        exportChats(chats)
    }
    await ctx.reply( // приветственное сообщение
        'Мир Вам! Этот бот ежедневно будет отправлять Вам информацию о сегодняшнем дне в календаре Русской Православной Церкви. В НАСТОЯЩЕЕ ВРЕМЯ БОТ НАХОДИТСЯ В РАЗРАБОТКЕ.',
    );
});

schedule.scheduleJob("*/1 * * * *", () => {
    const arrayOfSaints = [];
    let data = JSON.parse(fs.readFileSync(saintsOfToday, 'utf8'))[0]
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
      `
    try {
        chats.forEach((userId) => {
            bot.api.sendMessage(userId, message, { parse_mode: "HTML" });
        });
    } catch (error) {
        console.error("Error occurred while sending hourly update:", error);
    }
});

bot.start();