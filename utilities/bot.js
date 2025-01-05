const path = require('path');
const dotenv = require('dotenv');
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });
const { onlyAdmin } = require('./onlyAdmin.js')
const { Bot, InlineKeyboard, GrammyError, session } = require('grammy');
const { autoRetry } = require('@grammyjs/auto-retry');
const { hydrate } = require('@grammyjs/hydrate');

const bot = new Bot(process.env.BOT_API_KEY); 

bot.api.config.use(autoRetry()); // обход ошибок во время бродкастов изза слишком большого количества сообщений в секунду

bot.use(hydrate()); // редактирование сообщений 

bot.use(
 onlyAdmin(), // в групповых чатах дает применят команды только админам
 // чуть чуть подпиленное решение от https://github.com/backmeupplz/grammy-middlewares
);



bot.use(session({
    initial: () => ({}), // сессия для запроса времени
  }));

// логи ошибок
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  if (err instanceof GrammyError) {
    console.error('Error in request:', err.description);
  } else {
    console.error(err);
  }
});

module.exports = { bot, InlineKeyboard };
