require('dotenv').config();
const { Bot, InlineKeyboard } = require('grammy');
const schedule = require("node-schedule");
const fs = require('fs');
const path = require('path');
const { autoRetry } = require("@grammyjs/auto-retry");
const { hydrate } = require("@grammyjs/hydrate");
const { getNewDate } = require('./obtainData.js');
const { sendInfoNow, sendInfoToUser } = require('./sendMessage.js')

const { addUser,
    removeUser,
    updateTimezone,
    updatePreferredTime,
    countUsers } = require('./db.js');

const { menuKeyboard, timeZoneKeyboardOne, timeZoneKeyboardTwo, timeZoneKeyboardThree, timeZoneMap } = require('./keyboards.js')

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
    // запись в БД
    let userInfo;
    let chatType;
    if (ctx.chat.type === 'private') {
        userInfo = `Name: ${ctx.from.first_name} ${ctx.from.last_name} // Username: @${ctx.from.username} // Lang: ${ctx.from.language_code}`;
        chatType = 'PRIVATE'
    } else {
        userInfo = `Group Name: ${ctx.chat.title} // Admin @${ctx.from.username} // Group ID: ${ctx.chat.id}`;
        chatType = 'GROUP'
    }
    addUser(ctx.chat.id, userInfo, chatType);
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

schedule.scheduleJob("*/1 * * * *", () => {
    sendInfoNow();
});


/* 
--- МЕНЮ ---
*/

// ГЛАВНОЕ МЕНЮ 
bot.command('setup', async (ctx) => {
    await ctx.reply('Выберите пункт меню', {
        reply_markup: menuKeyboard,
    });
});

// ОБРАБОТКА ИНЛАЙН КЛАВИАТУР
bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;
  if (timeZoneMap[data]) {
    // выбор таймзоны (если есть в мапе)
    const buttonText = timeZoneMap[data];
    updateTimezone(ctx.chat.id, data);
    await ctx.callbackQuery.message.editText(`Ваш новый часовой пояс - ${buttonText}`);
  } else if (data === 'mainmenu') {
    // обратно в главное меню
   await ctx.callbackQuery.message.editText('Выберите пункт меню', {
        reply_markup: menuKeyboard,
    });
    await ctx.answerCallbackQuery();
  } else if (data === 'choose-timezone' || data === 'pageone') {
    // Выбор часового пояса - первая страница
     await ctx.callbackQuery.message.editText('По умолчанию у всех пользователей часовой пояс Москвы (UTC+3). Если вы хотите установить другой часовой пояс, выберите его из списка:', {
        reply_markup: timeZoneKeyboardOne,
    });
    await ctx.api.editMessageText;
    await ctx.answerCallbackQuery();
  } else if (data === 'pagetwo') {
    // Выбор часового пояса - вторая страница
     await ctx.callbackQuery.message.editText('По умолчанию у всех пользователей часовой пояс Москвы (UTC+3). Если вы хотите установить другой часовой пояс, выберите его из списка:', {
        reply_markup: timeZoneKeyboardTwo,
    });
    await ctx.api.editMessageText;
    await ctx.answerCallbackQuery();
  } else if (data === 'pagethree') {
    // Выбор часового пояса - третья страница
     await ctx.callbackQuery.message.editText('По умолчанию у всех пользователей часовой пояс Москвы (UTC+3). Если вы хотите установить другой часовой пояс, выберите его из списка:', {
        reply_markup: timeZoneKeyboardThree,
    });
    await ctx.api.editMessageText;
    await ctx.answerCallbackQuery();
  } else {
    // на всякий случай
    await ctx.callbackQuery.message.editText('ОШИБКА');
  }

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

schedule.scheduleJob("5 * * * *", () => {
    getNewDate();
});

// УДАЛЕНИЕ ЮЗЕРА ЕСЛИ ЗАБЛОКИРОВАЛ БОТА
bot.on('my_chat_member', async (ctx) => {
    const newChatMember = ctx.update.my_chat_member.new_chat_member;
    const chatId = ctx.update.my_chat_member.chat.id;
  
    if (newChatMember.status === 'kicked') {
      // User has blocked the bot
      removeUser(chatId, (err) => {
        if (err) {
          console.error('Error deleting user from database:', err);
        }
      });
    }
  });

bot.api.config.use(autoRetry());
bot.start();
