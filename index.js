require('dotenv').config();
const { bot } = require('./utilities/bot.js')
const schedule = require("node-schedule");
const { getNewDate } = require('./functions/obtainData.js');
const { cancelSchedule,
  scheduleMessage,
  saveSchedules, 
  restoreSchedules} = require('./functions/sendMessage.js');

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
  scheduleMessage(ctx.chat.id, '3', '8:30')
  saveSchedules();
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
    await ctx.callbackQuery.message.editText(`Введите предпочитаемое время в 24-часовом формате ЧЧ:ММ (например, 23:14, 8:12, 19:59).${adminMessage} 
${isGroupChat ? '<b><u>Вы должны ОТВЕТИТЬ на это сообщение, чтобы бот его "услышал".</u></b>' : ''}`, {
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
    await ctx.callbackQuery.message.editText(`Чтобы использовать бот-календарь в групповом чате, просто добавьте его (<code>@OrthodoxCalendar_Bot</code>) в свою группу.
После этого отправьте в чат группы команду <code>/start@OrthodoxCalendar_Bot</code> и бот начнет отправлять туда информацию раз в сутки - по умолчанию в 8:30 утра по московскому времени.
Чтобы изменить предпочитаемый час`, {
      parse_mode: "HTML",
      reply_markup: backKeyboard,
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
