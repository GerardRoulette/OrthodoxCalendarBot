require('dotenv').config({ path: '../.env' });
const sanitizeHtml = require('sanitize-html')
const { updateData, deleteOutdatedData, getLatestDate } = require('../db/db.js');
const { bot } = require('../utilities/bot.js')

const errorTrackerChat = process.env.ERROR_TRACKER
/* 
    -------
    ФУНКЦИИ ДЛЯ РАБОТЫ С API АЗБУКИ 
    ФОРМИРОВАНИЕ ИЗ ДАННЫХ СООБЩЕНИЯ, КОТОРОЕ ПОЛУЧИТ ЮЗЕР
    -------
*/

async function obtainData(year, month, day, apiKey) {
    //добавляем нули для корректного запроса 
    month = month.toString().padStart(2, '0');
    day = day.toString().padStart(2, '0');

    try {
        // CКАЧИВАЕМ ПО НОВОМУ АПИ СВЯТЫХ И ИКОНЫ ДНЯ
        async function getSaintsFromAzbyka() {
            const url = `https://azbyka.ru/days/api/day?date%5Bexact%5D=${year}-${month}-${day}`;
            try {
                const response = await fetch(url, {
                    headers: {
                        'authorization': `Bearer ${apiKey}`
                    }
                });
                if (!response.ok) {
                    const responseText = await response.text();
                    const maxLength = 4000;
                    const truncatedResponse = responseText.length > maxLength
                        ? responseText.substring(0, maxLength) + '... (truncated)'
                        : responseText;
                    await bot.api.sendMessage(errorTrackerChat, `getSaintsFromAzbyka() - Response status ${year}-${month}-${day}: ${response.status} --- ${truncatedResponse}`);
                    throw new Error(`API DAY - Response status: ${response.status} --- ${responseText}`);

                }
                const json = await response.json();
                return JSON.stringify(json, null, 2);
            } catch (error) {
                console.error('Error:', error.message);
                const maxLength = 4000; // Leave some buffer
                const errorMessage = error.message.length > maxLength
                    ? error.message.substring(0, maxLength) + '... (truncated)'
                    : error.message;
                await bot.api.sendMessage(errorTrackerChat, `getSaintsFromAzbyka() - ОШИБКА: ${errorMessage}`);
                throw error; // Re-throw to be handled by parent
            }
        }

        // CКАЧИВАЕМ ПО СТАРОМУ АПИ РАДИ ССЫЛОК НА БИБЛИЮ
        async function getTextsFromAzbyka() {
            const url = `https://azbyka.ru/days/api/cache_dates?date%5Bexact%5D=${year}-${month}-${day}`;
            try {
                const response = await fetch(url, {
                    headers: {
                        'authorization': `Bearer ${apiKey}`
                    }
                });
                if (!response.ok) {
                    const responseText = await response.text();
                    const maxLength = 4000;
                    const truncatedResponse = responseText.length > maxLength
                        ? responseText.substring(0, maxLength) + '... (truncated)'
                        : responseText;
                    await bot.api.sendMessage(errorTrackerChat, `getTextsFromAzbyka() - Response status ${year}-${month}-${day}: ${response.status} --- ${truncatedResponse}`);
                    throw new Error(`CACHE DATE - Response status: ${response.status} --- ${responseText}`);
                }

                const json = await response.json();
                return await json; // просто возвращаем json, чтобы его распилить и достать текст с id 1
            } catch (error) {
                const maxLength = 4000; // Leave some buffer
                const errorMessage = error.message.length > maxLength
                    ? error.message.substring(0, maxLength) + '... (truncated)'
                    : error.message;
                await bot.api.sendMessage(errorTrackerChat, `getTextsFromAzbyka() - ОШИБКА: ${errorMessage}`);
                console.error(error.message);
                throw error; // Re-throw to be handled by parent
            }
        }
        // фильтруем большой json и достаем id текста с id 1 (где содержатся сегодняшние чтения)
        // Азбука тут не дает сам текст, а дает цифру 123123, мы дальше делаем запрос по этой цифре и получаем сам текст
        function getTextIdsWithType1(data) {
            return data.flatMap(item =>
                item.abstractDate.texts.filter(text => text.type === 1).map(text => text.id)
            );
        }
        // сама цепочка извлечения текста по запросу по айди
        async function getTodayBibleReading() {
            let jsonWithTextIds = await getTextsFromAzbyka(); // вытащили большой JSON со всеми айди сегодняшними
            let todayBibleId = getTextIdsWithType1(jsonWithTextIds); // вытащили сам айди текста нужного
            const url = `https://azbyka.ru/days/api/texts/${todayBibleId.join()}`; // array превратили в string
            try {
                const response = await fetch(url, {
                    headers: {
                        'authorization': `Bearer ${apiKey}`
                    }
                });
                if (!response.ok) {
                    const responseText = await response.text();
                    const maxLength = 4000;
                    const truncatedResponse = responseText.length > maxLength
                        ? responseText.substring(0, maxLength) + '... (truncated)'
                        : responseText;
                    await bot.api.sendMessage(errorTrackerChat, `getTodayBibleReading() - Response status bible Id --- ${todayBibleId.join()} --- : ${response.status} --- ${truncatedResponse}`);
                    throw new Error(`TEXTS - Response status: ${response.status} --- ${responseText}`);
                }

                const json = await response.json();
                return JSON.stringify(json, null, 2)

            } catch (error) {
                const maxLength = 4000; // Leave some buffer
                const errorMessage = error.message.length > maxLength
                    ? error.message.substring(0, maxLength) + '... (truncated)'
                    : error.message;

                await bot.api.sendMessage(errorTrackerChat, `getTodayBibleReading() - ОШИБКА: ${errorMessage}`);
                console.error(error.message);
                throw error; // Re-throw to be handled by parent
            }
        }
        // cобственно экшен, собираем данные предыдущими функциями, делаем из них непосредственно сообщение
        // sanitizeHtml убирает теги которые запрещает Телеграм
        try {
            const [saintsData, bibleReading] = await Promise.all([
                getSaintsFromAzbyka(),
                getTodayBibleReading()
            ]);


            const arrayOfSaints = [];
            let data = JSON.parse(saintsData)
            let textsPreFormat = JSON.parse(bibleReading);
            let texts = sanitizeHtml(textsPreFormat.text, {
                allowedTags: ['b', 'i', 'em', 'strong', 'a', 'code', 'pre'],
                allowedAttributes: {
                    'a': ['href']
                },
                allowedSchemes: ['http', 'https']
            });
            // сортируем, убираем пустые пункты из json, чистим HTML, закидываем все сегодняшние праздники в arrayOfSaints
            // чтобы потом сделать join через перенос строки и получился список
            // иконы БМ добавляются с дополнительной подписью для ясности
            data.forEach(item => {
                if (item.abstractDate && item.abstractDate.priorities) {
                    item.abstractDate.priorities.forEach(priority => {
                        if (priority.memorialDay && priority.memorialDay.cacheTitle) {
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
                        }
                    });
                }
            });

            const message = `Мир вам!

Сегодня Русская Православная Церковь празднует:
                
${arrayOfSaints.join('\n')}
                
На богослужениях в храме будут читаться:
<i>${texts}</i>
                
Все тексты в одном месте можно прочесть <b><u><a href="https://azbyka.ru/biblia/days/${year}-${month}-${day}">по этой ссылке.</a></u></b>`

            return message;
        } catch (error) {
            console.error('Error obtaining data:', error.message);
            throw error;
        }

    } catch (error) {
        console.error(error.message);
        const maxLength = 4000; // Leave some buffer
        const errorMessage = error.message.length > maxLength
            ? error.message.substring(0, maxLength) + '... (truncated)'
            : error.message;

        await bot.api.sendMessage(errorTrackerChat, `obtainData() - ОШИБКА: ${errorMessage}`);
    }
};
/* На богослужениях в храме будут читаться:
<i>{$texts}</i>
                
Все тексты в одном месте можно прочесть <b><u><a href="https://azbyka.ru/biblia/days/${year}-${month}-${day}">по этой ссылке.</a></u></b>` */


/* 
    -------
    СКАЧИВАНИЕ И ОБНОВЛЕНИЕ ДАННЫХ В ТЕЧЕНИЕ ВРЕМЕНИ
    -------
*/


async function getNewDate(apiKey) {
    const currentDate = new Date();

    try {
        const latestDate = await getLatestDate();
        // вычисляем новую дату
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + 7);
        const year = newDate.getFullYear();
        const month = newDate.getMonth() + 1;
        const day = newDate.getDate();
        const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // вычисляем устаревшую дату
        const outdated = new Date(currentDate);
        outdated.setDate(currentDate.getDate() - 2);
        const outdatedYear = outdated.getFullYear();
        const outdatedMonth = outdated.getMonth() + 1;
        const outdatedDay = outdated.getDate();
        const formattedOutdated = `${outdatedYear}-${String(outdatedMonth).padStart(2, '0')}-${String(outdatedDay).padStart(2, '0')}`;

        // если новой даты нет в базе, то скачаем
        if (!latestDate || formattedDate > latestDate) {

            const message = await obtainData(year, month, day, apiKey);
            await updateData(formattedDate, message);

            // удаляем устаревшую дату
            await deleteOutdatedData(formattedOutdated);

            console.log(`Новая дата ${formattedDate} скачана, старая дата ${formattedOutdated} удалена`);
        }
    } catch (error) {
        console.error('Error:', error);
        const maxLength = 4000; // Leave some buffer
        const errorMessage = error.message.length > maxLength
            ? error.message.substring(0, maxLength) + '... (truncated)'
            : error.message;
        await bot.api.sendMessage(errorTrackerChat, `getNewDate() - ОШИБКА: ${errorMessage}`);
    }
}


module.exports = {
    obtainData,
    getNewDate
}
