const fs = require('fs');
const path = require('path');
require('dotenv').config();


function obtainData () {
    try {
        let today = new Date();
        let year = today.getFullYear();
        let month = (today.getMonth() + 1).toString().padStart(2, '0');
        let day = today.getDate().toString().padStart(2, '0');
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
                console.error(error.message);
                setTimeout(getTodayBibleReading, 300000)
            }
        }
        getTodayBibleReading() // здесь извлекли ссылки на Библию и сохранили их в texts, страхуемся от спама запросами

    } catch (error) {
        console.error(error.message);
    }
};


exports.obtainData = obtainData;
