require('dotenv').config({ path: '../.env' });
const sanitizeHtml = require('sanitize-html')
const { db, updateData, deleteOutdatedData, getLatestDate } = require('../db/db.js');



/* let today = new Date();
let year = today.getFullYear();
let month = (today.getMonth() + 1).toString().padStart(2, '0');
let day = today.getDate().toString().padStart(2, '0'); */



/* 
    -------
    ФУНКЦИИ ДЛЯ РАБОТЫ С API АЗЬУКИ 
    ФОРМИРОВАНИЕ ИЗ ДАННЫХ СООБЩЕНИЯ, КОТОРОЕ ПОЛУЧИТ ЮЗЕР
    -------
*/

async function obtainData(year, month, day, apiKey) {

    //добавляем нули для корректного запроса по апи
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
                    throw new Error(`API DAY - Response status: ${response.status} --- ${response.text}`);
                }
                const json = await response.json();
                return JSON.stringify(json, null, 2);
            } catch (error) {
                console.error('Error:', error.message);
                setTimeout(getSaintsFromAzbyka, 300000)
            }
        }

        // CКАЧИВАЕМ ПО СТАРОМУ АПИ РАДИ ССЫЛОК НА БИБЛИЮ
        async function getTextsFromAzbyka() {
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
                console.error(error.message);
                setTimeout(getTextsFromAzbyka, 300000)
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
                        'authorization': `Bearer ${process.env.AZBYKA_API_KEY}`
                    }
                });
                if (!response.ok) {
                    throw new Error(`TEXTS - Response status: ${response.status} --- ${response.text}`);
                }

                const json = await response.json();
                return JSON.stringify(json, null, 2)
            } catch (error) {
                console.error(error.message);
                setTimeout(getTodayBibleReading, 300000)
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

            const message = `Доброе утро!

Сегодня Русская Православная Церковь празднует:
                
${arrayOfSaints.join('\n')}
                
На богослужениях в храме будут читаться:
${texts}
                
Все тексты в одном месте можно прочесть <a href="https://azbyka.ru/biblia/days/${year}-${month}-${day}">по этой ссылке.</a>`

            return message;
        } catch (error) {
            console.error('Error obtaining data:', error.message);
            throw error;
        }

    } catch (error) {
        console.error(error.message);
    }
};

/* 
    -------
    СКАЧИВАНИЕ И ЗАПИСЬ В БАЗУ ДАННЫХ
    -------
*/

// СКАЧАТЬ НОВУЮ ДАТУ 
async function getNewDate() {
    const currentDate = new Date();
    // 
    getLatestDate((err, latestDate) => {
        if (err) {
            console.error('Error fetching latest date:', err);
            return;
        }

        // вычисляем новую дату
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + 7);
        const newDateString = newDate.toISOString().split('T')[0];
        // если ее нет в базе, то скачаем
        if (!latestDate || newDateString > latestDate) {
            // качаем новую дату
            const year = newDate.getFullYear();
            const month = newDate.getMonth() + 1;
            const day = newDate.getDate();
            obtainData(year, month, day).then(message => {
                updateData(newDateString, message);
                // удаляем устаревшую дату
                const twoDaysAgo = new Date(currentDate);
                twoDaysAgo.setDate(currentDate.getDate() - 2);
                deleteOutdatedData(twoDaysAgo.toISOString().split('T')[0]);
            }).catch(err => {
                console.error('Error obtaining data:', err);
            });
        }
    });
}


module.exports = {
    obtainData,
    getNewDate,
    fetchAllData
}
