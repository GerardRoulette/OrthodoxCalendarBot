require('dotenv').config();
const { bot } = require('./utilities/bot.js')
const schedule = require("node-schedule");
const { getNewDate } = require('./functions/obtainData.js');
const { cancelSchedule,
  scheduleMessage,
  saveSchedules,
  restoreSchedules } = require('./functions/sendMessage.js');

const refreshAzbykaToken = require('./utilities/refreshToken');

const { addUser,
  removeUser,
  updateTimezone,
  updatePreferredTime,
  getMessageByDate,
  getUserSettings } = require('./db/db.js');

const { menuKeyboard, backKeyboard, timeZoneKeyboardOne, timeZoneKeyboardTwo, timeZoneKeyboardThree, timeZoneMap, menuKeyboardGroup } = require('./utilities/keyboards.js') // DOUBLE CHECK

/* 
ЗАПРОС ДАННЫХ С АЗБУКИ
*/

// ОБНОВЛЕНИЕ ТОКЕНА КАЖДЫЕ 29 ДНЕЙ
// УБРАТЬ КОММЕНТ ПЕРЕД РЕЛИЗОМ
//schedule.scheduleJob('0 0 0 */29 * *', async () => {
//    try {
//       await refreshAzbykaToken();
//       console.log('API токен обновлен');
//   } catch (error) {
//       console.error('ОШИБКА ПРИ ОБНОВЛЕНИИ API ТОКЕНА: ', error.message);
//   }
//});

restoreSchedules();

// СКАЧИВАЕМ ДАННЫЕ в 0-00-01 ("1 0 0 * * *"), запись в файл 
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
  let greeting;
  const date = new Date();
  if (ctx.chat.type === 'private') {
    userInfo = `Name: ${ctx.from.first_name || ''} ${ctx.from.last_name || ''} // Username: @${ctx.from.username || 'N/A'} // Lang: ${ctx.from.language_code || 'N/A'}`;
    chatType = 'PRIVATE';
    greeting = `Мир Вам!
Этот бот ежедневно будет отправлять Вам информацию о сегодняшнем дне в календаре Русской Православной Церкви.
    
<b><u>Теперь этот бот будет отправлять вам календарную информацию в 8-30 утра по московскому времени.</u></b>
Если вы хотите изменить время или часовой пояс - отправьте в чат команду /setup и следуйте инструкциям.
Если вы хотите получить календарную информацию прямо сейчас - отправьте в чат команду /sendnow
    
Бота можно использовать в групповых чатах. Инструкции можно посмотреть в меню по команде /setup
    
<b>ПРОШУ ИМЕТЬ ВВИДУ СЛЕДУЮЩЕЕ
В НАСТОЯЩЕЕ ВРЕМЯ БОТ НАХОДИТСЯ В РАЗРАБОТКЕ. ВОЗМОЖНЫ ОШИБКИ И СБОИ.
БОТ ЕЩЕ НЕ АДАПТИРОВАН К БОЛЬШИМ НАГРУЗКАМ, ПРОСЬБА НЕ РАСПРОСТРАНЯТЬ
</b>
(я скажу когда будет можно)
    
По всем вопросам и предложениям просьба связываться с @kvasov1`
  } else {
    userInfo = `Group Name: ${ctx.chat.title} // Admin @${ctx.from.username} // Group ID: ${ctx.chat.id}`;
    chatType = 'GROUP';
    greeting = `Мир Вам!
Этот бот ежедневно будет отправлять Вам информацию о сегодняшнем дне в календаре Русской Православной Церкви.
    
<b><u>Теперь этот бот будет отпраавлять вам календарную информацию в 8-30 утра по московскому времени.</u></b>
Если вы хотите изменить время или часовой пояс - отправьте в чат команду /setup@OrthodoxCalendar_Bot и следуйте инструкциям (настройки доступны только администраторам)
Если вы хотите получить календарную информацию прямо сейчас - отправьте в чат команду /sendnow@OrthodoxCalendar_Bot (только администраторы)
    
<b>ПРОШУ ИМЕТЬ ВВИДУ СЛЕДУЮЩЕЕ
В НАСТОЯЩЕЕ ВРЕМЯ БОТ НАХОДИТСЯ В РАЗРАБОТКЕ. ВОЗМОЖНЫ ОШИБКИ И СБОИ.
БОТ ЕЩЕ НЕ АДАПТИРОВАН К БОЛЬШИМ НАГРУЗКАМ, ПРОСЬБА НЕ РАСПРОСТРАНЯТЬ
</b>
(я скажу когда будет можно)
    
По всем вопросам и предложениям просьба связываться с @kvasov1`
  }

  addUser(ctx.chat.id, userInfo, chatType);
  await ctx.reply( // приветственное сообщение
    greeting, {
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
  scheduleMessage(ctx.chat.id, '3', '8:30')
  saveSchedules();
});

bot.command('sendnow', async (ctx) => {
  try {
    const chatId = ctx.chat.id;
    // берем таймзону из БД
    const userSettings = await getUserSettings(chatId, ['timezone']);
    if (!userSettings) {
      return ctx.reply("ОШИБКА");
    }

    const timezone = userSettings.timezone || 3; // если по какой то причине нет таймзоны то Москва

    const userDate = new Date(new Date().getTime() + timezone * 60 * 60 * 1000);
    const formattedDate = userDate.toISOString().split('T')[0]; // текущая дата в таймзоне юзера

    // забираем нужное сообщение из БД
    const message = await getMessageByDate(formattedDate);
    if (!message) {
      return ctx.reply("ОШИБКА");
    }
    await ctx.reply(message, {
      parse_mode: "HTML",
      disable_web_page_preview: true
    });
  } catch (error) {
    console.error('Error in /sendnow command:', error);
    ctx.reply('ОШИБКА');
  }
});


/* 
--- МЕНЮ ---
*/

// ГЛАВНОЕ МЕНЮ 
bot.command('setup', async (ctx) => {
  if (ctx.chat.type === 'private') {
    await ctx.reply('Выберите пункт меню', {
      parse_mode: "HTML",
      reply_markup: menuKeyboard,
    });
  } else {
    await ctx.reply('Выберите пункт меню. <b>Имейте ввиду, что только администраторы группы могут менять настройки бота</b>', {
      parse_mode: "HTML",
      reply_markup: menuKeyboardGroup,
    });
  }
});


// ОБРАБОТКА ИНЛАЙН КЛАВИАТУР
bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;
  // в случае если групповой чат а не личка, добавляем сообщение к интерфейсу.
  const isGroupChat = ctx.chat.type === 'group' || ctx.chat.type === 'supergroup';
  const adminMessage = isGroupChat ? ' <b>Имейте ввиду, что только администраторы группы могут менять настройки бота</b>' : '';

  if (timeZoneMap[data]) {
    // выбор таймзоны (если есть в мапе)
    const buttonText = timeZoneMap[data];
    await updateTimezone(ctx.chat.id, data);
    await ctx.callbackQuery.message.editText(`Ваш новый часовой пояс - ${buttonText}`);
    const settings = await getUserSettings(ctx.chat.id);
    await scheduleMessage(ctx.chat.id, settings.timezone, settings.preferredTime);
  } else if (data === 'mainmenu') {
    // обратно в главное меню
    await ctx.callbackQuery.message.editText(`Выберите пункт меню.${adminMessage}`, {
      parse_mode: "HTML",
      reply_markup: menuKeyboard,
    });
    await ctx.answerCallbackQuery();
  } else if (data === 'choose-timezone' || data === 'pageone') {
    // Выбор часового пояса - первая страница
    await ctx.callbackQuery.message.editText(`По умолчанию у всех пользователей часовой пояс Москвы (UTC+3). Если вы хотите установить другой часовой пояс, выберите его из списка.${adminMessage}`, {
      parse_mode: "HTML",
      reply_markup: timeZoneKeyboardOne,
    });
    await ctx.api.editMessageText;
    await ctx.answerCallbackQuery();
  } else if (data === 'pagetwo') {
    // Выбор часового пояса - вторая страница
    await ctx.callbackQuery.message.editText(`По умолчанию у всех пользователей часовой пояс Москвы (UTC+3). Если вы хотите установить другой часовой пояс, выберите его из списка.${adminMessage}`, {
      parse_mode: "HTML",
      reply_markup: timeZoneKeyboardTwo,
    });
    await ctx.api.editMessageText;
    await ctx.answerCallbackQuery();
  } else if (data === 'pagethree') {
    // Выбор часового пояса - третья страница
    await ctx.callbackQuery.message.editText(`По умолчанию у всех пользователей часовой пояс Москвы (UTC+3). Если вы хотите установить другой часовой пояс, выберите его из списка.${adminMessage}`, {
      parse_mode: "HTML",
      reply_markup: timeZoneKeyboardThree,
    });
    await ctx.api.editMessageText;
    await ctx.answerCallbackQuery();

  } else if (data === 'choose-preferred-time') {
    // Выбор времени
    await ctx.callbackQuery.message.editText(`${isGroupChat ? '<b><u>Вы должны ОТВЕТИТЬ на это сообщение, чтобы бот его "услышал".</u></b>' : ''}
Введите предпочитаемое время в 24-часовом формате ЧЧ:ММ (например, 23:14, 8:12, 19:59).${adminMessage} 
`, {
      parse_mode: "HTML",
      reply_markup: backKeyboard,
    })
    ctx.session.awaitingPreferredTime = false;

    await ctx.api.editMessageText;
    await ctx.answerCallbackQuery();
    ctx.session.awaitingPreferredTime = true;
  }
  else if (data === 'groupchat') {
    // групповой чат инфо
    await ctx.callbackQuery.message.editText(process.env.GROUP_CHAT, {
      parse_mode: "HTML",
      reply_markup: backKeyboard,
    });
    await ctx.answerCallbackQuery();
  }
  else if (data === 'developer') {
    // о разработчике
    await ctx.callbackQuery.message.editText(process.env.DEVELOPER, {
      parse_mode: "HTML",
      reply_markup: backKeyboard,
      disable_web_page_preview: true
    });
    await ctx.answerCallbackQuery();
  }
  else {
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
        const [, hours, minutes] = preferredTime.match(timeRegex);
        // Убираем нолик из начала часа в случае если 08
        const formattedHours = parseInt(hours, 10);
        const formattedTime = `${formattedHours}:${minutes}`;
        const timeZone = await getUserSettings(ctx.chat.id, ['timezone']);
        await updatePreferredTime(ctx.chat.id, formattedTime);
        await ctx.reply(`Ваши сообщения будут приходить в ${preferredTime} по часовому поясу ${timeZoneMap[timeZone.timezone]}`, {
          parse_mode: "HTML",
        });
        // сбросили флаг
        ctx.session.awaitingPreferredTime = false;
        const settings = await getUserSettings(ctx.chat.id);
        await scheduleMessage(ctx.chat.id, settings.timezone, settings.preferredTime);
        await saveSchedules();
      } catch (error) {
        console.error('Error updating preferred time:', error);
        await ctx.reply('Произошла ошибка при обновлении времени. Попробуйте еще раз.');
      }
    } else {
      // если ответ не ЧЧ:ММ
      await ctx.reply('НЕПРАВИЛЬНЫЙ ФОРМАТ ВРЕМЕНИ. Напоминаю, введите предпочитаемое время в 24-часовом формате ЧЧ:ММ (например, 23:14, 08:12, 19:59)', {
        parse_mode: "HTML",
        reply_markup: backKeyboard
      });
    }
  }
});


bot.callbackQuery('mainmenu', async (ctx) => {
  await ctx.callbackQuery.message.editText('Выберите пункт меню', {
    parse_mode: "HTML",
    reply_markup: menuKeyboard,
  });
  await ctx.answerCallbackQuery();
});



bot.api.setMyCommands([
  { command: 'setup', description: 'Настройки бота' },
  { command: 'sendnow', description: 'Отправить информацию сейчас' },
]);


schedule.scheduleJob("1 0 * * * *", () => {
  getNewDate();
});

// УДАЛЕНИЕ ЮЗЕРА ЕСЛИ ЗАБЛОКИРОВАЛ БОТА

bot.on('my_chat_member', async (ctx) => {
  const newChatMember = ctx.update.my_chat_member.new_chat_member;
  const chatId = ctx.update.my_chat_member.chat.id;

  if (newChatMember.status === 'kicked' || newChatMember.status === 'left') {
    console.log(`Bot was removed from group ${chatId}`);

    try {
      // Ensure cleanup operations are properly awaited
      await removeUser(chatId);
      cancelSchedule(chatId); // Assuming cancelSchedule does not return a promise
    } catch (err) {
      console.error('Error during cleanup:', err);
    }
  }
});


bot.start();
