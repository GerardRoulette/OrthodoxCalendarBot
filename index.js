require('dotenv').config();
const { bot, InlineKeyboard } = require('./utilities/bot.js')
const schedule = require("node-schedule");
const fs = require('fs');
const path = require('path');
const { getNewDate } = require('./functions/obtainData.js');
const { cancelSchedule,
  restoreSchedules,
  scheduleMessage,
  saveSchedules } = require('./functions/sendMessage.js')

const { addUser,
  removeUser,
  updateTimezone,
  updatePreferredTime,
  getMessageByDate,
  getUserSettings } = require('./db/db.js');

const { menuKeyboard, backKeyboard, timeZoneKeyboardOne, timeZoneKeyboardTwo, timeZoneKeyboardThree, timeZoneMap } = require('./utilities/keyboards.js') // DOUBLE CHECK

const chatsList = path.join(__dirname, 'chats.json'); // файл с контактами
const saintsOfToday = path.join(__dirname, 'saintsOfToday.json'); // API/DAY запрос, святые и праздники дня
const textsOfToday = path.join(__dirname, 'textsOfToday.json');

/* 
ЗАПРОС ДАННЫХ С АЗБУКИ
*/


// СКАЧИВАЕМ ДАННЫЕ в 0-01-01 ("1 0 0 * * *"), запись в файл 
schedule.scheduleJob("1 0 0 * * *", () => {
  getNewDate();
});


/* 
РАБОТА С ЧАТАМИ 
*/


bot.command('start', async (ctx) => {
  // запись в БД
  let userInfo;
  let chatType;
  const date = new Date();
  if (ctx.chat.type === 'private') {
    userInfo = `Name: ${ctx.from.first_name || ''} ${ctx.from.last_name || ''} // Username: @${ctx.from.username || 'N/A'} // Lang: ${ctx.from.language_code || 'N/A'}`;
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
    await getMessageByDate(date.toISOString().split('T')[0]), {
    parse_mode: "HTML",
    disable_web_page_preview: true
  }
  );
  scheduleMessage(ctx.chat.id, '3', '8:30');
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
    await updateTimezone(ctx.chat.id, data);
    await ctx.callbackQuery.message.editText(`Ваш новый часовой пояс - ${buttonText}`);
    const settings = await getUserSettings(ctx.message.chat.id);
    await scheduleMessage(ctx.message.chat.id, settings.timezone, settings.preferredTime);
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

  } else if (data === 'choose-preferred-time') {
    // Выбор времени
    await ctx.callbackQuery.message.editText('Введите предпочитаемое время в 24-часовом формате ЧЧ:ММ (например, 23:14, 8:12, 19:59)', {
      reply_markup: backKeyboard,
    })
    ctx.session.awaitingPreferredTime = false;

    await ctx.api.editMessageText;
    await ctx.answerCallbackQuery();
    ctx.session.awaitingPreferredTime = true;

  } else {
    // на всякий случай
    await ctx.callbackQuery.message.editText('ОШИБКА');
  }

  await ctx.answerCallbackQuery();
});

// листенер назначения предпочитаемого времени (пункт меня запускает флаг true, если он true то вперед)
bot.on('message', async (ctx) => {
  if (ctx.session.awaitingPreferredTime) {
    const preferredTime = ctx.message.text;
    const timeRegex = /^(0?[0-9]|1\d|2[0-3]):([0-5]\d)$/;

    if (timeRegex.test(preferredTime)) {
      try {
        await updatePreferredTime(ctx.message.chat.id, preferredTime);
        await ctx.reply(`Ваши сообщения будут приходить в ${preferredTime} по часовому поясу, который вы установили (по умолчанию это московское время).`);
        // сбросили флаг
        ctx.session.awaitingPreferredTime = false;
        const settings = await getUserSettings(ctx.message.chat.id);
        await scheduleMessage(ctx.message.chat.id, settings.timezone, settings.preferredTime);
      } catch (error) {
        console.error('Error updating preferred time:', error);
        await ctx.reply('Произошла ошибка при обновлении времени. Попробуйте еще раз.');
      }
    } else {
      // Invalid time format response
      await ctx.reply('НЕПРАВИЛЬНЫЙ ФОРМАТ ВРЕМЕНИ. Напоминаю, введите предпочитаемое время в 24-часовом формате ЧЧ:ММ (например, 23:14, 08:12, 19:59)', {
        reply_markup: backKeyboard,
      });
    }
  }
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

schedule.scheduleJob("1 0 * * * *", () => {
  getNewDate();
});

// УДАЛЕНИЕ ЮЗЕРА ЕСЛИ ЗАБЛОКИРОВАЛ БОТА
bot.on('my_chat_member', async (ctx) => {
  const newChatMember = ctx.update.my_chat_member.new_chat_member;
  const chatId = ctx.update.my_chat_member.chat.id;

  if (newChatMember.status === 'kicked') {
    // если юзер заблокировал бота
    removeUser(chatId, (err) => {
      if (err) {
        console.error('Error deleting user from database:', err);
      }
    });
    cancelSchedule(chatId);
  }
});

bot.start();
