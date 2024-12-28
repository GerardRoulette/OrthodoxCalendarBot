const path = require('path');
const dotenv = require('dotenv');
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });
const { onlyAdmin } = require('grammy-middlewares')
const { Bot, InlineKeyboard, GrammyError, session } = require('grammy');
const { autoRetry } = require('@grammyjs/auto-retry');
const { hydrate } = require('@grammyjs/hydrate');

const botApi = process.env.BOT_API_KEY
const bot = new Bot(botApi); 

bot.api.config.use(autoRetry());

bot.use(hydrate());

bot.use(
  onlyAdmin((ctx) => ctx.reply("ТОЛЬКО АДМИНЫ МОГУТ ЭТО ДЕЛАТЬ")),
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
