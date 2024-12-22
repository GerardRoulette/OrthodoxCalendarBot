require('dotenv').config();
const { Bot } = require('grammy');
const fs = require('fs');
const path = require('path');
const sanitizeHtml = require('sanitize-html')
const { autoRetry } = require("@grammyjs/auto-retry");

const bot = new Bot(process.env.BOT_API_KEY); // инициализация бота
 const chatsList = path.join(__dirname, 'chats.json'); // файл с контактами
 const saintsOfToday = path.join(__dirname, 'saintsOfToday.json'); // API/DAY запрос, святые и праздники дня
const textsOfToday = path.join(__dirname, 'textsOfToday.json');

/* function sendInfoToUser() {
    let today = new Date();
    let year = today.getFullYear();
    let month = (today.getMonth() + 1).toString().padStart(2, '0');
    let day = today.getDate().toString().padStart(2, '0');
    const arrayOfSaints = [];
    let data = JSON.parse(fs.readFileSync(saintsOfToday, 'utf8'))
    let textsPreFormat = JSON.parse(fs.readFileSync(textsOfToday, 'utf8'));
    let texts = sanitizeHtml(textsPreFormat.text, {
        allowedTags: ['b', 'i', 'em', 'strong', 'a', 'code', 'pre'],
        allowedAttributes: {
            'a': ['href']
        },
        allowedSchemes: ['http', 'https']
    });
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
    let message = `Доброе утро!

Сегодня Русская Православная Церковь празднует:

${arrayOfSaints.join('\n')}

На богослужениях в храме будут читаться:
${texts}

Все тексты в одном месте можно прочесть <a href="https://azbyka.ru/biblia/days/${year}-${month}-${day}">по этой ссылке.</a>
      `
return message;
   
} */



 function importChats() { // ДОСТАЕМ СПИСОК КОНТАКТОВ ИЗ ФАЙЛА
    if (fs.existsSync(chatsList)) {
        return JSON.parse(fs.readFileSync(chatsList, 'utf8'));
    }
    return [];
}

let chats = importChats(); 

function sendInfoNow() {
    try {
        chats.forEach((userId) => {
            bot.api.sendMessage(userId, sendInfoToUser(), {
                parse_mode: "HTML",
                disable_web_page_preview: true
            });
        });
    } catch (error) {
        if (error instanceof GrammyError && error.error_code === 403) { // даблчек надо ли
            console.log(`User ${userId} has blocked the bot. Skipping...`); 
          } else {
            console.error(`Failed to send message to user ${userId}:`, error);
          }
    }
};
bot.api.config.use(autoRetry());

// sendInfoNow();
// bot.start();

    module.exports = { sendInfoNow, 
            sendInfoToUser }